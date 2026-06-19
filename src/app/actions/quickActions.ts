'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function quickAdjustStockAction(payload: {
   productId: string
   variantId: string | null
   qty: number
   type: 'add' | 'subtract'
   applyRecipe: boolean
   reason?: string
}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica")

      const tenantId = userData.tenant_id
      const { productId, variantId, qty, type, applyRecipe, reason } = payload

      if (qty <= 0) throw new Error("La cantidad debe ser mayor a cero")

      if (type === 'add') {
         // 1. Obtener la receta base del producto (si aplica)
         let recipe = null
         if (applyRecipe) {
            const { data: foundRecipe } = await supabase.from('recipes').select(`
               id, base_yield,
               recipe_ingredients(raw_material_id, required_quantity)
            `).eq('finished_product_id', productId).eq('tenant_id', tenantId).single()
            recipe = foundRecipe
         }

         const multiplier = recipe ? qty / (recipe.base_yield || 1) : qty

         // 2. Descontar ingredientes (BOM Explosion) si corresponde
         if (recipe?.recipe_ingredients) {
            for (const ing of recipe.recipe_ingredients) {
               const consumed = ing.required_quantity * multiplier
               const { data: mat } = await supabase.from('products').select('current_stock').eq('id', ing.raw_material_id).single()
               const newStock = Number(mat?.current_stock || 0) - consumed

               await supabase.from('products').update({ current_stock: newStock }).eq('id', ing.raw_material_id)

               await supabase.from('stock_movements').insert({
                  tenant_id: tenantId,
                  product_id: ing.raw_material_id,
                  movement_type: 'production_out',
                  quantity: consumed,
                  operator_id: user.id
               })
            }
         }

         // Descontar insumos EXTRA de la variante (si aplica)
         if (variantId && applyRecipe) {
            const { data: variant } = await supabase.from('product_variants').select('extra_ingredients').eq('id', variantId).single()
            const extraIngs = variant?.extra_ingredients || []

            for (const ing of extraIngs) {
               const consumed = (ing as any).qty * multiplier
               const { data: mat } = await supabase.from('products').select('current_stock').eq('id', (ing as any).rawMaterialId).single()
               const newStock = Number(mat?.current_stock || 0) - consumed

               await supabase.from('products').update({ current_stock: newStock }).eq('id', (ing as any).rawMaterialId)

               await supabase.from('stock_movements').insert({
                  tenant_id: tenantId,
                  product_id: (ing as any).rawMaterialId,
                  movement_type: 'production_out',
                  quantity: consumed,
                  operator_id: user.id
               })
            }
         }

         // 3. Sumar stock al producto terminado
         const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single()
         const newStock = Number(prod?.current_stock || 0) + qty
         await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)

         // Registrar movimiento de stock
         await supabase.from('stock_movements').insert({
            tenant_id: tenantId,
            product_id: productId,
            movement_type: 'production_in',
            quantity: qty,
            operator_id: user.id
         })

         // 4. Generar código de lote de forma automática y resolver posibles saldos negativos de lotes existentes (deficits)
         const { count } = await supabase.from('production_lots').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
         const lotNumber = (count || 0) + 1
         const lotCode = `LOT-${new Date().getFullYear()}-${String(lotNumber).padStart(4, '0')}`

         let remainingToProduce = qty

         // Buscar lotes del mismo producto/variante con cantidad restante menor a cero
         let negLotsQuery = supabase
            .from('production_lots')
            .select('id, quantity_remaining')
            .eq('tenant_id', tenantId)
            .eq('product_id', productId)
            .lt('quantity_remaining', 0)
            .order('elaboration_date', { ascending: true })
            .order('created_at', { ascending: true })

         if (variantId) {
            negLotsQuery = negLotsQuery.eq('variant_id', variantId)
         } else {
            negLotsQuery = negLotsQuery.is('variant_id', null)
         }

         const { data: negLots } = await negLotsQuery

         for (const negLot of (negLots || [])) {
            if (remainingToProduce <= 0) break
            const deficit = Math.abs(Number(negLot.quantity_remaining))
            const resolved = Math.min(remainingToProduce, deficit)

            await supabase
               .from('production_lots')
               .update({ quantity_remaining: Number(negLot.quantity_remaining) + resolved })
               .eq('id', negLot.id)

            remainingToProduce -= resolved
         }

         const { data: lot, error: lotErr } = await supabase.from('production_lots').insert({
            tenant_id: tenantId,
            product_id: productId,
            variant_id: variantId,
            lot_code: lotCode,
            quantity_produced: qty,
            quantity_remaining: remainingToProduce,
            elaboration_date: new Date().toISOString().split('T')[0],
            operator_id: user.id
         }).select().single()

         if (lotErr) console.error("Error registrando lote:", lotErr.message)

         // Gamificación (XP)
         const points = Math.floor(qty * 10)
         const newScore = (userData.gamification_score || 0) + points
         let badge = userData.current_badge
         if (newScore > 500) badge = 'Maestro Amasador'
         if (newScore > 2000) badge = 'Jefe de Producción'
         await supabase.from('users').update({ gamification_score: newScore, current_badge: badge }).eq('id', user.id)

         revalidatePath('/dashboard')
         revalidatePath('/dashboard/stock')
         revalidatePath('/dashboard/produccion')

         return { success: true, lotCode, points, badge }

      } else {
         // RESTAR STOCK (MERMA O AJUSTE)
         const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single()
         const newStock = Math.max(0, Number(prod?.current_stock || 0) - qty)
         await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)

         // Registrar movimiento
         await supabase.from('stock_movements').insert({
            tenant_id: tenantId,
            product_id: productId,
            movement_type: reason === 'waste' ? 'waste' : 'adjustment',
            quantity: qty,
            operator_id: user.id
         })

         // Descontar en FIFO de los lotes de producción para mantenerlos en sincronía
         let remainingQtyToDeduct = qty
         let query = supabase
            .from('production_lots')
            .select('id, quantity_remaining')
            .eq('product_id', productId)
            .eq('tenant_id', tenantId)
            .gt('quantity_remaining', 0)
            .order('elaboration_date', { ascending: true }) // FIFO: los más viejos primero

         if (variantId) {
            query = query.eq('variant_id', variantId)
         } else {
            query = query.is('variant_id', null)
         }

         const { data: activeLots } = await query

         if (activeLots && activeLots.length > 0) {
            for (const lot of activeLots) {
               if (remainingQtyToDeduct <= 0) break
               const lotQty = Number(lot.quantity_remaining)
               const qtyToTake = Math.min(remainingQtyToDeduct, lotQty)

               await supabase
                  .from('production_lots')
                  .update({ quantity_remaining: Math.max(0, lotQty - qtyToTake) })
                  .eq('id', lot.id)

               remainingQtyToDeduct -= qtyToTake
            }
         }

         revalidatePath('/dashboard')
         revalidatePath('/dashboard/stock')
         revalidatePath('/dashboard/produccion')

         return { success: true }
      }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function quickPurchaseInsumoAction(payload: {
   productId: string
   qty: number
   cost?: number
}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica")

      const tenantId = userData.tenant_id
      const { productId, qty } = payload

      if (qty <= 0) throw new Error("La cantidad debe ser mayor a cero")

      // Sumar al stock del insumo
      const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single()
      const newStock = Number(prod?.current_stock || 0) + qty
      await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)

      // Registrar movimiento de stock
      await supabase.from('stock_movements').insert({
         tenant_id: tenantId,
         product_id: productId,
         movement_type: 'adjustment',
         quantity: qty,
         operator_id: user.id
      })

      revalidatePath('/dashboard')
      revalidatePath('/dashboard/stock')
      revalidatePath('/dashboard/insumos')

      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function quickUpdateTenantLogoAction(payload: {
   name: string
   logoUrl: string
}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica")

      const { error } = await supabase
         .from('tenants')
         .update({
            name: payload.name,
            logo_url: payload.logoUrl
         } as any)
         .eq('id', userData.tenant_id)

      if (error) throw new Error(error.message)

      revalidatePath('/dashboard')
      revalidatePath('/dashboard/configuracion')

      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}
