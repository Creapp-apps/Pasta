import { createClient } from '@/utils/supabase/server'
import { UtensilsCrossed, Trash2 } from 'lucide-react'
import ProductWizard from '@/components/productos/ProductWizard'
import DeleteProductButton from '@/components/productos/DeleteProductButton'

export default async function ProductosPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
   
   if (!userData?.tenant_id) return <p className="p-8">Acceso denegado</p>

   // Insumos para el wizard
   const { data: insumos } = await supabase
      .from('products')
      .select('id, name, unit_of_measure')
      .eq('tenant_id', userData.tenant_id)
      .eq('type', 'raw_material')
      .order('name')

   // Productos existentes con variantes
   const { data: productos } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('type', 'finished')
      .order('name')

   // Variantes de cada producto
   const { data: allVariants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('tenant_id', userData.tenant_id)

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <UtensilsCrossed className="text-orange-500" size={28} /> Productos Terminados
               </h2>
               <p className="text-slate-500 text-sm mt-1">Pastas y derivados que se fabrican y venden. Cada uno tiene su receta y variantes.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Wizard de Alta */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Crear Nuevo Producto</h3>
               {(!insumos || insumos.length === 0) ? (
                  <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-center">
                     <p className="font-bold text-lg mb-2">Primero cargá tus insumos</p>
                     <p className="text-sm">Antes de crear un producto necesitás tener al menos 1 insumo en el depósito (harina, huevos, etc). Andá al módulo <strong>Insumos</strong> del menú lateral.</p>
                  </div>
               ) : (
                  <ProductWizard insumos={insumos} />
               )}
            </div>

            {/* Listado de Productos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Catálogo Registrado</h3>
               {(!productos || productos.length === 0) ? (
                  <div className="text-center py-16">
                     <UtensilsCrossed size={54} className="mx-auto text-slate-200 mb-4" />
                     <p className="text-slate-800 font-bold text-xl mb-2">Sin productos</p>
                     <p className="text-slate-500 text-sm">Creá tu primer producto con el wizard de la izquierda.</p>
                  </div>
               ) : (
                  <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                     {productos.map(prod => {
                        const prodVariants = allVariants?.filter(v => v.product_id === prod.id) || []
                        return (
                           <div key={prod.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:shadow-md transition group">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <h4 className="font-extrabold text-lg text-slate-800">{prod.name}</h4>
                                    <div className="flex gap-2 mt-1.5">
                                       <span className="text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-1 rounded">{prod.category || 'Sin categoría'}</span>
                                       <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">{prod.unit_of_measure}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-4">
                                    <div className="text-right">
                                       <p className="font-black text-2xl text-slate-900">${prod.price}</p>
                                       <p className="text-xs text-slate-400 font-medium">precio base</p>
                                    </div>
                                    <DeleteProductButton productId={prod.id} productName={prod.name} />
                                 </div>
                              </div>
                              
                              {prodVariants.length > 0 && (
                                 <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Variantes:</p>
                                    {prodVariants.map(v => (
                                       <div key={v.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg text-sm border border-slate-100">
                                          <span className="font-semibold text-slate-700">{v.name}</span>
                                          <span className="font-bold text-slate-900">{v.price_override ? `$${v.price_override}` : 'Precio base'}</span>
                                       </div>
                                    ))}
                                 </div>
                              )}

                              {prodVariants.length === 0 && (
                                 <p className="text-xs text-slate-400 italic mt-2">Sin variantes (producto único)</p>
                              )}
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}
