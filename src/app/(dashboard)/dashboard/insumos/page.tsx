import { createClient } from '@/utils/supabase/server'
import { Wheat, Plus, AlertTriangle, Package } from 'lucide-react'
import { addInsumo } from '@/app/actions/insumoActions'
import InsumoTable from '@/components/insumos/InsumoTable'

export default async function InsumosPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
   
   if (!userData?.tenant_id) return <p className="p-8">Acceso denegado</p>

   const { data: insumos } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('type', 'raw_material')
      .order('name')

   const lowStockCount = insumos?.filter(i => Number(i.current_stock) <= Number(i.min_stock_alert) && Number(i.min_stock_alert) > 0).length || 0

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         {/* Header */}
         <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <Wheat className="text-orange-500" size={28} /> Depósito de Insumos
               </h2>
               <p className="text-slate-500 text-sm mt-1">Materias primas que se consumen al producir. No se venden directamente.</p>
            </div>
            {lowStockCount > 0 && (
               <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 font-bold px-4 py-2 rounded-xl text-sm">
                  <AlertTriangle size={18} /> {lowStockCount} insumo{lowStockCount > 1 ? 's' : ''} bajo mínimo
               </div>
            )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Formulario Alta */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Registrar Nuevo Insumo</h3>
               <form action={async (formData: FormData) => {
                  'use server'
                  await addInsumo(formData)
               }} className="space-y-4">
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Insumo</label>
                     <input required name="name" type="text" placeholder="Ej: Harina 000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition" />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                     <select name="unit" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                        <option value="kg">Kilogramos (kg)</option>
                        <option value="litros">Litros (lt)</option>
                        <option value="unidades">Unidades</option>
                        <option value="docenas">Docenas</option>
                        <option value="gramos">Gramos (g)</option>
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Inicial</label>
                        <input name="stock" type="number" step="0.01" defaultValue="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Alerta Mínimo</label>
                        <input name="minStock" type="number" step="0.01" defaultValue="0" placeholder="0 = sin alerta" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
                     </div>
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer shadow-lg shadow-slate-900/10">
                     <Plus size={18} /> Agregar al Depósito
                  </button>
               </form>
            </div>

            {/* Tabla de Insumos */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Inventario de Materias Primas</h3>
               {(!insumos || insumos.length === 0) ? (
                  <div className="text-center py-16 flex flex-col items-center">
                     <Package size={54} className="mx-auto text-slate-200 mb-4" />
                     <p className="text-slate-800 font-bold text-xl mb-2">Depósito Vacío</p>
                     <p className="text-slate-500 text-sm max-w-sm">Cargá tus primeros insumos (harina, huevos, queso, etc.) usando el formulario de la izquierda.</p>
                  </div>
               ) : (
                  <InsumoTable insumos={insumos} />
               )}
            </div>
         </div>
      </div>
   )
}
