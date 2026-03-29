'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRecipeAction(formData: FormData) {
  try {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) throw new Error("No autenticado")

     const { data: uData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
     if (!uData?.tenant_id) throw new Error("Entorno SaaS no localizado.")

     const tenantId = uData.tenant_id
     const finishedProductId = formData.get('finishedProductId') as string
     const baseYield = parseFloat(formData.get('baseYield') as string) || 1
     const ingredients = JSON.parse(formData.get('ingredients') as string) // [{ rawMaterialId, qty }]

     // 1. Inserción de la cabecera Receta
     const { data: recipe, error: recipeErr } = await supabase
       .from('recipes')
       .insert({ tenant_id: tenantId, finished_product_id: finishedProductId, base_yield: baseYield })
       .select()
       .single()

     if (recipeErr) {
        if (recipeErr.code === '23505') throw new Error("Este producto ya tiene una receta de ensamblaje vinculada.")
        throw new Error(recipeErr.message)
     }

     // 2. Inserción del desglose de Materiales (BOM)
     const inserts = ingredients.map((ing: any) => ({
        recipe_id: recipe.id,
        raw_material_id: ing.rawMaterialId,
        required_quantity: parseFloat(ing.qty)
     }))

     const { error: ingErr } = await supabase.from('recipe_ingredients').insert(inserts)
     
     if (ingErr) {
        // En caso de fallo en transaccion de FK, rolleo la receta principal para que no quede vacía
        await supabase.from('recipes').delete().eq('id', recipe.id)
        throw new Error("Error ensamblando los insumos: " + ingErr.message)
     }

     // Actualizo UI Server Side
     revalidatePath('/dashboard/recipes', 'page')

     return { success: true }

  } catch (err: any) {
     return { error: err.message }
  }
}
