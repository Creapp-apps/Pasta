'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitProductionAction(recipeId: string, quantityToProduce: number) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Acceso denegado")

      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
      const tenantId = userData.tenant_id

      // Obtener la Receta exacta con sus requerimientos
      const { data: recipe } = await supabase.from('recipes').select(`
         id, finished_product_id, base_yield,
         recipe_ingredients(raw_material_id, required_quantity)
      `).eq('id', recipeId).eq('tenant_id', tenantId).single()

      if (!recipe) throw new Error("Aviso de error: Receta no encontrada")

      // Calcular multiplicador (Ej: Si la receta rinde 2 y cocinó 6, el multiplicador es 3)
      const multiplier = quantityToProduce / recipe.base_yield

      // 1. Sumar Stock Físico a los Productos Terminados
      const { data: finishedProduct } = await supabase.from('products').select('current_stock').eq('id', recipe.finished_product_id).single()
      await supabase.from('products').update({ current_stock: Number(finishedProduct.current_stock) + quantityToProduce }).eq('id', recipe.finished_product_id)

      // 1-A. Guardar evento de auditoría en stock_movements
      await supabase.from('stock_movements').insert({
         tenant_id: tenantId, product_id: recipe.finished_product_id,
         movement_type: 'production_in',
         quantity: quantityToProduce, operator_id: user.id
      })

      // 2. Restar todos los Componentes e Insumos usados (BOM Explosion)
      for (const ingredient of recipe.recipe_ingredients) {
         const consumedQty = ingredient.required_quantity * multiplier
         const { data: rawMat } = await supabase.from('products').select('current_stock').eq('id', ingredient.raw_material_id).single()
         
         await supabase.from('products').update({ current_stock: Number(rawMat.current_stock) - consumedQty }).eq('id', ingredient.raw_material_id)
         
         await supabase.from('stock_movements').insert({
            tenant_id: tenantId, product_id: ingredient.raw_material_id,
            movement_type: 'production_out',
            quantity: consumedQty, operator_id: user.id
         })
      }

      // 3. Sistema de GAMIFICACIÓN: Puntos XP por performance
      const pointsEarned = Math.floor(quantityToProduce * 10) // 10 XP base por unidad de medida
      const newScore = (userData.gamification_score || 0) + pointsEarned
      
      let badge = userData.current_badge
      if (newScore > 500) badge = 'Maestro Amasador'
      if (newScore > 2000) badge = 'Jefe de Producción'

      await supabase.from('users').update({ gamification_score: newScore, current_badge: badge }).eq('id', user.id)

      // Sincronizar UI
      revalidatePath('/dashboard/production', 'page')
      revalidatePath('/dashboard/products', 'page')

      return { success: true, points: pointsEarned, badge }
   } catch (err: any) {
      return { error: err.message }
   }
}
