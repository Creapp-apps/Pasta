'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrder({
   clientId,
   items,
   paymentMethod,
   isManualLotSelection,
   totalCalc,
   scheduledDate
}: {
   clientId: string | null,
   items: {
      productId: string,
      variantId: string | null,
      qty: number,
      unitPrice: number,
      manualAllocations?: { lotId: string, qty: number }[]
   }[],
   paymentMethod: string,
   isManualLotSelection: boolean,
   totalCalc: number,
   scheduledDate?: string
}) {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return { error: "No user logged in" }

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return { error: "No tenant ID found" }

   try {
      // 1. Create the Order
      const { data: order, error: orderErr } = await supabase
         .from('orders')
         .insert({
            tenant_id: userData.tenant_id,
            client_id: clientId,
            status: 'pending',
            payment_method: paymentMethod,
            total_calc: totalCalc,
            scheduled_date: scheduledDate || null
         }).select('id').single()

      if (orderErr) throw new Error(`Error creando orden: ${orderErr.message}`)
      
      const orderId = order.id

      // 2. Loop through Items
      for (const item of items) {
         // Create Order Item
         const { data: orderItem, error: oiErr } = await supabase
            .from('order_items')
            .insert({
               order_id: orderId,
               product_id: item.productId,
               variant_id: item.variantId || null,
               quantity: item.qty,
               unit_price: item.unitPrice,
               subtotal: item.qty * item.unitPrice
            }).select('id').single()

         if (oiErr) throw new Error(`Error insertando item ${item.productId}: ${oiErr.message}`)

         // Descontar del stock físico principal del producto
         const { data: prod } = await supabase.from('products').select('current_stock').eq('id', item.productId).single()
         if (prod) {
            const newStock = Math.max(0, Number(prod.current_stock || 0) - item.qty)
            await supabase.from('products').update({ current_stock: newStock }).eq('id', item.productId)
         }

         // Registrar movimiento de stock por venta
         await supabase.from('stock_movements').insert({
            tenant_id: userData.tenant_id,
            product_id: item.productId,
            movement_type: 'sale',
            quantity: item.qty,
            operator_id: user.id
         })

         let remainingQtyToAllocate = item.qty

         if (isManualLotSelection && item.manualAllocations) {
            // Manual Allocation
            for (const alloc of item.manualAllocations) {
               if (alloc.qty <= 0) continue
               
               // Register allocation
               await supabase.from('order_lot_allocations').insert({
                  order_item_id: orderItem.id,
                  lot_id: alloc.lotId,
                  quantity_allocated: alloc.qty
               })

               // Deduct from Lot manually
               const { data: currentManualLot } = await supabase
                  .from('production_lots')
                  .select('quantity_remaining')
                  .eq('id', alloc.lotId)
                  .single()

               if (currentManualLot) {
                  await supabase
                     .from('production_lots')
                     .update({ quantity_remaining: Math.max(0, currentManualLot.quantity_remaining - alloc.qty) })
                     .eq('id', alloc.lotId)
               }
            }
         } else {
            // Auto FIFO Allocation
            // Fetch oldest active lots for this exact product+variant combination
            let query = supabase
               .from('production_lots')
               .select('id, quantity_remaining')
               .eq('tenant_id', userData.tenant_id)
               .eq('product_id', item.productId)
               .gt('quantity_remaining', 0)
               .order('elaboration_date', { ascending: true }) // Oldest first
               .order('created_at', { ascending: true })
            
            if (item.variantId) {
               query = query.eq('variant_id', item.variantId)
            } else {
               query = query.is('variant_id', null)
            }

            const { data: availableLots, error: lotsErr } = await query
            if (lotsErr) throw new Error(`Error buscando lotes FIFO: ${lotsErr.message}`)

            for (const lot of (availableLots || [])) {
               if (remainingQtyToAllocate <= 0) break

               const lotQty = Number(lot.quantity_remaining)
               if (lotQty <= 0) continue

               const qtyToTake = Math.min(remainingQtyToAllocate, lotQty)
               
               // Register allocation
               await supabase.from('order_lot_allocations').insert({
                  order_item_id: orderItem.id,
                  lot_id: lot.id,
                  quantity_allocated: qtyToTake
               })

               await supabase
                  .from('production_lots')
                  .update({ quantity_remaining: Math.max(0, lotQty - qtyToTake) })
                  .eq('id', lot.id)

               remainingQtyToAllocate -= qtyToTake
            }

            if (remainingQtyToAllocate > 0) {
               // We don't throw an error for incomplete stock allocation to allow selling out of stock (overdrawing or negative stock isn't fully blocked here to avoid stopping sales), but we should probably alert.
               // For this ERP, we just allocate what we can. 
            }
         }
      }

      revalidatePath('/dashboard/pedidos')
      revalidatePath('/dashboard/stock')
      return { success: true, orderId }

   } catch (error: any) {
      console.error(error)
      return { error: error.message }
   }
}

export async function updateOrderStatus(orderIdOrIds: string | string[], status: string) {
   try {
      const supabase = await createClient()

      // Get tenant_id from auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      // Verify active session for dispatch or delivery
      if (status === 'on_route' || status === 'delivered') {
         const { data: activeSession, error: sessionErr } = await supabase
            .from('cash_sessions')
            .select('id')
            .eq('tenant_id', userData.tenant_id)
            .eq('status', 'open')
            .maybeSingle()

         if (sessionErr || !activeSession) {
            return { error: "No hay ninguna caja abierta. Abrí la caja en la sección de Pedidos antes de iniciar repartos o entregas." }
         }

         if (status === 'delivered') {
            const query = supabase.from('orders').update({
               status,
               cash_session_id: activeSession.id,
               delivered_at: new Date().toISOString()
            })

            if (Array.isArray(orderIdOrIds)) {
               query.in('id', orderIdOrIds)
            } else {
               query.eq('id', orderIdOrIds)
            }

            const { error } = await query
            if (error) throw new Error(error.message)

            revalidatePath('/dashboard/pedidos')
            return { success: true }
         }
      }

      // Default status update
      const query = supabase.from('orders').update({ status })

      if (Array.isArray(orderIdOrIds)) {
         query.in('id', orderIdOrIds)
      } else {
         query.eq('id', orderIdOrIds)
      }

      const { error } = await query
      if (error) throw new Error(error.message)

      revalidatePath('/dashboard/pedidos')
      return { success: true }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function deleteOrderAction(orderId: string) {
   try {
      const supabase = await createClient()

      // 1. Get auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      // 2. Fetch order items to restore stock
      const { data: items, error: itemsErr } = await supabase
         .from('order_items')
         .select('product_id, quantity')
         .eq('order_id', orderId)

      if (itemsErr) throw new Error(itemsErr.message)

      if (items && items.length > 0) {
         for (const item of items) {
            // Restore stock of product
            const { data: prod } = await supabase
               .from('products')
               .select('current_stock')
               .eq('id', item.product_id)
               .single()

            if (prod) {
               const restoredStock = Number(prod.current_stock || 0) + Number(item.quantity)
               await supabase
                  .from('products')
                  .update({ current_stock: restoredStock })
                  .eq('id', item.product_id)
            }

            // Register stock movement as adjustment (restoration)
            await supabase.from('stock_movements').insert({
               tenant_id: userData.tenant_id,
               product_id: item.product_id,
               movement_type: 'adjustment',
               quantity: item.quantity,
               operator_id: user.id
            })
         }
      }

      // 3. Delete the order (order_items and allocations will be deleted by CASCADE)
      const { error: deleteErr } = await supabase
         .from('orders')
         .delete()
         .eq('id', orderId)

      if (deleteErr) throw new Error(deleteErr.message)

      revalidatePath('/dashboard/pedidos')
      return { success: true }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function updateOrderItemsAction(
   orderId: string, 
   updatedItems: { id?: string, productId: string, variantId?: string | null, qty: number, unitPrice: number }[]
) {
   try {
      const supabase = await createClient()

      // 1. Get auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      // 2. Fetch original order items to compute stock changes
      const { data: oldItems, error: oldErr } = await supabase
         .from('order_items')
         .select('product_id, variant_id, quantity')
         .eq('order_id', orderId)

      if (oldErr) throw new Error(oldErr.message)

      // Calculate stock adjustments
      const stockAdjustments: { productId: string, qtyChange: number }[] = []

      // Helper to aggregate adjustments
      const addAdjustment = (productId: string, qtyChange: number) => {
         const existing = stockAdjustments.find(a => a.productId === productId)
         if (existing) {
            existing.qtyChange += qtyChange
         } else {
            stockAdjustments.push({ productId, qtyChange })
         }
      }

      // Track how old items are modified or deleted
      for (const oldItem of oldItems || []) {
         const newItem = updatedItems.find(
            ni => ni.productId === oldItem.product_id && 
            (ni.variantId || null) === (oldItem.variant_id || null)
         )

         if (newItem) {
            // Item exists in both: calculate difference
            const diff = Number(newItem.qty) - Number(oldItem.quantity)
            if (diff !== 0) {
               addAdjustment(oldItem.product_id, diff) // positive diff means we sold more (need to subtract from stock), negative diff means we sold less (restore stock)
            }
         } else {
            // Item was removed: restore all old stock
            addAdjustment(oldItem.product_id, -Number(oldItem.quantity))
         }
      }

      // Track brand new items in updated list
      for (const newItem of updatedItems) {
         const oldItem = oldItems?.find(
            oi => oi.product_id === newItem.productId && 
            (oi.variant_id || null) === (newItem.variantId || null)
         )

         if (!oldItem) {
            // Brand new item: subtract full quantity from stock
            addAdjustment(newItem.productId, Number(newItem.qty))
         }
      }

      // Apply stock adjustments in DB
      for (const adj of stockAdjustments) {
         const { data: prod } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', adj.productId)
            .single()

         if (prod) {
            const newStock = Math.max(0, Number(prod.current_stock || 0) - adj.qtyChange)
            await supabase
               .from('products')
               .update({ current_stock: newStock })
               .eq('id', adj.productId)

            // Register movement
            const movType = adj.qtyChange > 0 ? 'sale' : 'adjustment'
            await supabase.from('stock_movements').insert({
               tenant_id: userData.tenant_id,
               product_id: adj.productId,
               movement_type: movType,
               quantity: Math.abs(adj.qtyChange),
               operator_id: user.id
            })
         }
      }

      // 3. Clear existing items (allocations will cascade delete)
      const { error: clearErr } = await supabase
         .from('order_items')
         .delete()
         .eq('order_id', orderId)

      if (clearErr) throw new Error(clearErr.message)

      // 4. Insert new order items
      for (const item of updatedItems) {
         const { error: insErr } = await supabase
            .from('order_items')
            .insert({
               order_id: orderId,
               product_id: item.productId,
               variant_id: item.variantId || null,
               quantity: item.qty,
               unit_price: item.unitPrice,
               subtotal: item.qty * item.unitPrice
            })

         if (insErr) throw new Error(insErr.message)
      }

      // 5. Update order total
      const newTotal = updatedItems.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0)
      const { error: updErr } = await supabase
         .from('orders')
         .update({ total_calc: newTotal })
         .eq('id', orderId)

      if (updErr) throw new Error(updErr.message)

      revalidatePath('/dashboard/pedidos')
      return { success: true }
   } catch (error: any) {
      return { error: error.message }
   }
}



