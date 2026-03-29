'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrder({
   clientId,
   items,
   paymentMethod,
   isManualLotSelection,
   totalCalc
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
   totalCalc: number
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
            total_calc: totalCalc
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
