'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProductWithVariants(payload: {
   name: string
   category: string
   unit: string
   priceBase: number
   baseIngredients: { rawMaterialId: string; qty: number }[]
   variants: { name: string; price: number; extraIngredients: { rawMaterialId: string; qty: number }[] }[]
}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica")

      const tenantId = userData.tenant_id

      // 1. Crear el Producto Base (sin category para evitar schema cache de Supabase)
      const { data: product, error: productErr } = await supabase.from('products').insert({
         tenant_id: tenantId,
         type: 'finished',
         name: payload.name,
         unit_of_measure: payload.unit,
         price: payload.priceBase,
         current_stock: 0
      }).select().single()

      if (productErr) throw new Error("Error creando producto: " + productErr.message)

      // Category: intentar setear por update separado (workaround PostgREST schema cache)
      try {
         if (payload.category) {
            await supabase.from('products').update({ category: payload.category } as any).eq('id', product.id)
         }
      } catch { /* Cache no refrescado aún, se ignora */ }

      // 2. Crear la Receta Base (ingredientes comunes a todas las variantes)
      if (payload.baseIngredients.length > 0) {
         const { data: recipe, error: recipeErr } = await supabase.from('recipes').insert({
            tenant_id: tenantId,
            finished_product_id: product.id,
            base_yield: 1
         }).select().single()

         if (recipeErr) throw new Error("Error creando receta base: " + recipeErr.message)

         const ingredientInserts = payload.baseIngredients.map(ing => ({
            recipe_id: recipe.id,
            raw_material_id: ing.rawMaterialId,
            required_quantity: ing.qty
         }))

         const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingredientInserts)
         if (ingErr) throw new Error("Error guardando ingredientes de receta: " + ingErr.message)
      }

      // 3. Crear Variantes (cada una con sus insumos extra)
      if (payload.variants.length > 0) {
         for (const variant of payload.variants) {
            const { error: varErr } = await supabase.from('product_variants').insert({
               product_id: product.id,
               tenant_id: tenantId,
               name: variant.name,
               price_override: variant.price > 0 ? variant.price : null,
               extra_ingredients: variant.extraIngredients
            })
            if (varErr) throw new Error(`Error guardando variante '${variant.name}': ` + varErr.message)
         }
      }

      revalidatePath('/dashboard/productos')
      return { success: true, productId: product.id }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function deleteProduct(productId: string) {
   try {
      const supabase = await createClient()
      
      // Borrar variantes primero
      await supabase.from('product_variants').delete().eq('product_id', productId)
      // Borrar receta si existe
      await supabase.from('recipes').delete().eq('finished_product_id', productId)
      // Borrar producto
      await supabase.from('products').delete().eq('id', productId)

      revalidatePath('/dashboard/productos')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}
