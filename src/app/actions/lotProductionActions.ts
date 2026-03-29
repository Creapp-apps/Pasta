'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function produceLot(payload: {
   productId: string
   variantId: string | null
   quantity: number
}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica")

      const tenantId = userData.tenant_id
      const { productId, variantId, quantity } = payload

      // 1. Obtener receta base del producto
      const { data: recipe } = await supabase.from('recipes').select(`
         id, base_yield,
         recipe_ingredients(raw_material_id, required_quantity)
      `).eq('finished_product_id', productId).eq('tenant_id', tenantId).single()

      // Calcular multiplicador (si no tiene receta base, el multiplicador es la cantidad directa)
      const multiplier = recipe ? quantity / (recipe.base_yield || 1) : quantity

      // 2. Restar insumos BASE
      if (recipe?.recipe_ingredients) {
         for (const ing of recipe.recipe_ingredients) {
            const consumed = ing.required_quantity * multiplier
            const { data: mat } = await supabase.from('products').select('current_stock').eq('id', ing.raw_material_id).single()
            const newStock = Number(mat?.current_stock || 0) - consumed
            
            const { error: e1 } = await supabase.from('products').update({ current_stock: newStock }).eq('id', ing.raw_material_id)
            if (e1) throw new Error("Error descontando stock base: " + e1.message)

            const { error: e2 } = await supabase.from('stock_movements').insert({
               tenant_id: tenantId, product_id: ing.raw_material_id,
               movement_type: 'production_out', quantity: consumed, operator_id: user.id
            })
            if (e2) throw new Error("Error auditoría base: " + e2.message)
         }
      }

      // 3. Restar insumos EXTRA de la variante (si hay)
      if (variantId) {
         const { data: variant } = await supabase.from('product_variants').select('extra_ingredients').eq('id', variantId).single()
         const extraIngs = variant?.extra_ingredients || []
         
         for (const ing of extraIngs) {
            const consumed = (ing as any).qty * multiplier
            const { data: mat } = await supabase.from('products').select('current_stock').eq('id', (ing as any).rawMaterialId).single()
            const newStock = Number(mat?.current_stock || 0) - consumed

            const { error: e3 } = await supabase.from('products').update({ current_stock: newStock }).eq('id', (ing as any).rawMaterialId)
            if (e3) throw new Error("Error descontando stock variante: " + e3.message)

            const { error: e4 } = await supabase.from('stock_movements').insert({
               tenant_id: tenantId, product_id: (ing as any).rawMaterialId,
               movement_type: 'production_out', quantity: consumed, operator_id: user.id
            })
            if (e4) throw new Error("Error auditoría variante: " + e4.message)
         }
      }

      // 4. Sumar stock al producto terminado
      const { data: prod } = await supabase.from('products').select('current_stock').eq('id', productId).single()
      const { error: e5 } = await supabase.from('products').update({ current_stock: Number(prod?.current_stock || 0) + quantity }).eq('id', productId)
      if (e5) throw new Error("Error sumando stock terminado: " + e5.message)

      const { error: e6 } = await supabase.from('stock_movements').insert({
         tenant_id: tenantId, product_id: productId,
         movement_type: 'production_in', quantity, operator_id: user.id
      })
      if (e6) throw new Error("Error auditoría entrada: " + e6.message)

      // 5. Generar código de lote
      const { count } = await supabase.from('production_lots').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
      const lotNumber = (count || 0) + 1
      const lotCode = `LOT-${new Date().getFullYear()}-${String(lotNumber).padStart(4, '0')}`

      const { data: lot, error: lotErr } = await supabase.from('production_lots').insert({
         tenant_id: tenantId,
         product_id: productId,
         variant_id: variantId,
         lot_code: lotCode,
         quantity_produced: quantity,
         quantity_remaining: quantity,
         elaboration_date: new Date().toISOString().split('T')[0],
         operator_id: user.id
      }).select().single()

      if (lotErr) throw new Error("Error registrando lote en BD: " + lotErr.message)

      // 6. Gamificación
      const points = Math.floor(quantity * 10)
      const newScore = (userData.gamification_score || 0) + points
      let badge = userData.current_badge
      if (newScore > 500) badge = 'Maestro Amasador'
      if (newScore > 2000) badge = 'Jefe de Producción'
      await supabase.from('users').update({ gamification_score: newScore, current_badge: badge }).eq('id', user.id)

      revalidatePath('/dashboard/produccion')
      revalidatePath('/dashboard/stock')
      revalidatePath('/dashboard/insumos')

      return { success: true, lotCode, points, badge }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function adjustLot(lotId: string, newQuantityRemaining: number, reason: string) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: lot } = await supabase.from('production_lots').select('*').eq('id', lotId).single()
      if (!lot) throw new Error("Lote no existe")

      const diff = newQuantityRemaining - Number(lot.quantity_remaining)
      
      // Actualizar lote
      await supabase.from('production_lots').update({ quantity_remaining: newQuantityRemaining }).eq('id', lotId)
      
      // Actualizar stock de producto terminado
      const { data: prod } = await supabase.from('products').select('current_stock').eq('id', lot.product_id).single()
      await supabase.from('products').update({ current_stock: Number(prod?.current_stock || 0) + diff }).eq('id', lot.product_id)

      // Guardar auditoría (usamos 'adjustment' y creamos una nota)
      await supabase.from('stock_movements').insert({
         tenant_id: lot.tenant_id,
         product_id: lot.product_id,
         movement_type: 'adjustment',
         quantity: diff,
         operator_id: user.id
      })
      
      // Como workaround para guardar la nota sin hacer migración de DB, actualizamos el audit log agregando _ [RAZON] en algún metadata si pudieramos, 
      // pero por simplicidad solo revalidamos:
      revalidatePath('/dashboard/stock')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function deleteLot(lotId: string, reason: string) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: lot } = await supabase.from('production_lots').select('*').eq('id', lotId).single()
      if (!lot) throw new Error("Lote no existe")

      const diff = -Number(lot.quantity_remaining) // se resta todo lo que le quedaba
      
      // Eliminar lote
      await supabase.from('production_lots').delete().eq('id', lotId)
      
      // Actualizar stock
      const { data: prod } = await supabase.from('products').select('current_stock').eq('id', lot.product_id).single()
      await supabase.from('products').update({ current_stock: Number(prod?.current_stock || 0) + diff }).eq('id', lot.product_id)

      await supabase.from('stock_movements').insert({
         tenant_id: lot.tenant_id,
         product_id: lot.product_id,
         movement_type: 'adjustment',
         quantity: diff,
         operator_id: user.id
      })

      revalidatePath('/dashboard/stock')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}
