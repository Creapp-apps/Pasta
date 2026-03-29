import { createClient } from '@/utils/supabase/server'
import { Plus, Package } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
  
  const { data: products } = await supabase.from('products').select('*').eq('tenant_id', userData?.tenant_id).order('name')

  // Inline Server Action to add product
  async function addProduct(formData: FormData) {
     'use server'
     const supabaseServer = await createClient()
     const { data: { user } } = await supabaseServer.auth.getUser()
     const { data: uData } = await supabaseServer.from('users').select('tenant_id').eq('id', user?.id).single()
     
     if (!uData?.tenant_id) return

     await supabaseServer.from('products').insert({
        tenant_id: uData.tenant_id,
        name: formData.get('name'),
        type: formData.get('type'),
        price: parseFloat(formData.get('price') as string),
        unit_of_measure: formData.get('unit'),
        current_stock: parseFloat(formData.get('stock') as string)
     })
     revalidatePath('/dashboard/products', 'page')
     revalidatePath('/[tenant]', 'page')
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Catálogo y Stock Manual</h2>
            <p className="text-slate-500 text-sm">Gestioná las pastas que ven tus clientes en la tienda oficial y tus insumos base</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Formulario Lateral Lado Izquierdo */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Ingresar Nuevo Ítem</h3>
            <form action={addProduct} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input required name="name" type="text" placeholder="Ej: Ravioles de Verdura" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                     <select name="type" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="finished">Proc. Terminado</option>
                        <option value="raw_material">Insumo Bruto</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                     <select name="unit" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="boxes">Cajas / Planchas</option>
                        <option value="kg">Kilos (kg)</option>
                        <option value="units">Unidades</option>
                     </select>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Precio Final ($)</label>
                     <input name="price" type="number" step="0.01" defaultValue="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label>
                     <input name="stock" type="number" step="0.1" defaultValue="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
               </div>
               <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition cursor-pointer mt-4 shadow-lg shadow-slate-900/10">
                  <Plus size={18} /> Guardar al Catálogo
               </button>
            </form>
         </div>

         {/* Tabla Lado Derecho */}
         <div className="flex-1 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Inventario Existente</h3>
            {(!products || products.length === 0) ? (
               <div className="text-center py-12 flex flex-col items-center">
                  <Package size={54} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-800 font-bold text-xl mb-2">Catálogo Vacío</p>
                  <p className="text-slate-500 text-sm max-w-sm">Todavía no ingresaste productos. Agregá uno usando el formulario de la izquierda.</p>
               </div>
            ) : (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-slate-100 text-sm text-slate-500">
                      <th className="py-3 font-medium px-2">Producto</th>
                      <th className="py-3 font-medium">Categoría</th>
                      <th className="py-3 font-medium">Stock Físico</th>
                      <th className="py-3 font-medium text-right px-2">Precio Público</th>
                   </tr>
                 </thead>
                 <tbody>
                   {products.map(p => (
                     <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                       <td className="py-4 font-semibold text-slate-800 px-2">{p.name}</td>
                       <td className="py-4">
                          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${p.type === 'finished' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.type === 'finished' ? 'Terminado' : 'Insumo'}
                          </span>
                       </td>
                       <td className="py-4 font-mono text-slate-600 font-medium">{p.current_stock} {p.unit_of_measure}</td>
                       <td className="py-4 text-right font-black text-slate-900 text-lg px-2">${p.price}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            )}
         </div>
      </div>
    </div>
  )
}
