import { createClient } from '@/utils/supabase/server'
import { BarChart3, AlertTriangle, Package, Wheat } from 'lucide-react'
import FinishedProductsList from '@/components/stock/FinishedProductsList'

export default async function StockCentralPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
   
   if (!userData?.tenant_id) return <p className="p-8">Acceso denegado</p>

   // Todos los productos (insumos + terminados)
   const { data: allProducts } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('type', { ascending: false })
      .order('name')

   // Lotes activos
   const { data: activeLots } = await supabase
      .from('production_lots')
      .select('*, products(name), product_variants(name)')
      .eq('tenant_id', userData.tenant_id)
      .gt('quantity_remaining', 0)
      .order('elaboration_date', { ascending: false })

   const insumos = allProducts?.filter(p => p.type === 'raw_material') || []
   const terminados = allProducts?.filter(p => p.type === 'finished') || []
   const lowStockInsumos = insumos.filter(i => Number(i.min_stock_alert) > 0 && Number(i.current_stock) <= Number(i.min_stock_alert))

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
               <BarChart3 className="text-orange-500" size={28} /> Stock Central
            </h2>
            <p className="text-slate-500 text-sm mt-1">Vista unificada de todo el inventario: insumos, productos terminados y lotes activos.</p>
         </div>

         {/* Alertas */}
         {lowStockInsumos.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4">
               <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
               <div>
                  <h4 className="font-bold text-red-800 text-lg">Alerta de Stock Bajo</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                     {lowStockInsumos.map(i => (
                        <span key={i.id} className="bg-red-100 text-red-700 font-bold text-sm px-3 py-1 rounded-lg">
                           {i.name}: {i.current_stock} {i.unit_of_measure}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* Resumen */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
               <div className="p-3 bg-amber-50 rounded-xl"><Wheat className="text-amber-600" size={24}/></div>
               <div>
                  <p className="text-sm text-slate-500 font-medium">Insumos Cargados</p>
                  <p className="text-2xl font-black text-slate-900">{insumos.length}</p>
               </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
               <div className="p-3 bg-orange-50 rounded-xl"><Package className="text-orange-600" size={24}/></div>
               <div>
                  <p className="text-sm text-slate-500 font-medium">Productos Terminados</p>
                  <p className="text-2xl font-black text-slate-900">{terminados.length}</p>
               </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
               <div className="p-3 bg-emerald-50 rounded-xl"><BarChart3 className="text-emerald-600" size={24}/></div>
               <div>
                  <p className="text-sm text-slate-500 font-medium">Lotes Activos</p>
                  <p className="text-2xl font-black text-slate-900">{activeLots?.length || 0}</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6">
            {/* Insumos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4 flex items-center gap-2">
                  <Wheat size={20} className="text-amber-500"/> Materias Primas
               </h3>
               {insumos.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Sin insumos cargados</p>
               ) : (
                  <div className="space-y-2">
                     {insumos.map(item => {
                        const isLow = Number(item.min_stock_alert) > 0 && Number(item.current_stock) <= Number(item.min_stock_alert)
                        const pct = Number(item.min_stock_alert) > 0 ? Math.min(100, (Number(item.current_stock) / Number(item.min_stock_alert)) * 100) : 100
                        return (
                           <div key={item.id} className={`p-4 rounded-xl border ${isLow ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                              <div className="flex justify-between items-center mb-2">
                                 <span className="font-bold text-slate-800">{item.name}</span>
                                 <span className={`font-mono font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{item.current_stock} {item.unit_of_measure}</span>
                              </div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : pct > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(5, pct)}%` }}></div>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>

            {/* Productos Terminados con Acordeón de Lotes */}
            <FinishedProductsList terminados={terminados} allLots={activeLots || []} />
         </div>
      </div>
   )
}
