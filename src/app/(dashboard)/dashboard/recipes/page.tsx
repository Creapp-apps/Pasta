import { createClient } from '@/utils/supabase/server'
import RecipeBuilderForm from '@/components/recipes/RecipeBuilderForm'
import { BookOpen, ChefHat } from 'lucide-react'

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: uData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
  
  if (!uData?.tenant_id) return <p>Acceso denegado</p>

  // Pedir catálogo de productos completo para segregar
  const { data: allProducts } = await supabase.from('products').select('*').eq('tenant_id', uData.tenant_id).order('name')
  const finishedProducts = allProducts?.filter(p => p.type === 'finished') || []
  const rawMaterials = allProducts?.filter(p => p.type === 'raw_material') || []
  
  // Pedir Recetas Existentes haciendo Inner Join mágico gracias a foreign keys Supabase
  const { data: existingRecipes } = await supabase
     .from('recipes')
     .select(`
       id, base_yield,
       products!recipes_finished_product_id_fkey(name, unit_of_measure),
       recipe_ingredients(
          required_quantity,
          products!recipe_ingredients_raw_material_id_fkey(name, unit_of_measure)
       )
     `)
     .eq('tenant_id', uData.tenant_id)

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Recetario Interno (B.O.M)</h2>
            <p className="text-slate-500 text-sm">Vincular insumos primarios con pastas terminadas para el descuento automático (ERP).</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
         <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Digitalizar Nueva Ficha Técnica</h3>
            
            {finishedProducts.length === 0 || rawMaterials.length === 0 ? (
               <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-medium">
                  Atención: Para crear una receta primero debes cargar un <strong>Producto Terminado</strong> (ej: Fideos) y al menos un <strong>Insumo Bruto</strong> (ej: Harina) desde el menú de "Gestionar Catálogo".
               </div>
            ) : (
               <RecipeBuilderForm finishedProducts={finishedProducts} rawMaterials={rawMaterials} />
            )}
         </div>

         <div className="bg-slate-50 p-8 rounded-3xl shadow-inner border border-slate-200 sticky top-24">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
               <ChefHat size={26} className="text-orange-500" /> Recetas Digitalizadas
            </h3>
            
            {!existingRecipes || existingRecipes.length === 0 ? (
               <div className="text-center py-16 bg-white/50 rounded-2xl border border-slate-200/50 border-dashed">
                  <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">No detectamos ninguna receta en la base de datos.</p>
               </div>
            ) : (
               <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {existingRecipes.map((recipe: any) => (
                     <div key={recipe.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                           <h4 className="font-extrabold text-lg text-slate-800">{recipe.products.name}</h4>
                           <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                              Base: {recipe.base_yield} {recipe.products.unit_of_measure}
                           </span>
                        </div>
                        
                        <div className="space-y-3">
                           <p className="text-xs font-bold text-slate-400">DESGLOSE DE CONSUMO:</p>
                           {recipe.recipe_ingredients.map((ing: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <span className="font-semibold text-slate-700">{ing.products.name}</span>
                                 <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded shadow-sm">
                                    - {ing.required_quantity} {ing.products.unit_of_measure}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  )
}
