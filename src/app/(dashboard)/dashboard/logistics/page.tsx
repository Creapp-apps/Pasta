import { createClient } from '@/utils/supabase/server'
import { Truck } from 'lucide-react'
import CreateRouteForm from '@/components/logistics/CreateRouteForm'

export default async function AdminLogisticsPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: uData } = await supabase.from('users').select('tenant_id, role').eq('id', user?.id).single()
   
   if (!uData?.tenant_id) return <p className="p-8">Acceso Denegado: Entorno no localizado.</p>

   // Obtener pedidos pendientes o listos (B2C)
   const { data: availableOrders } = await supabase
      .from('orders')
      .select('id, total_calc, client_id, status, clients(name, address)')
      .eq('tenant_id', uData.tenant_id)
      .in('status', ['pending', 'ready'])

   // Obtener cadetes/repartidores
   const { data: repartidores } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('tenant_id', uData.tenant_id)
      .eq('role', 'repartidor')
      
   // Rutas Activas
   const { data: activeRoutes } = await supabase
      .from('deliveries')
      .select('id, status, route_date, users!deliveries_repartidor_id_fkey(full_name), delivery_stops(id, status)')
      .eq('tenant_id', uData.tenant_id)
      .eq('status', 'active')

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Centro de Monitoreo de Entregas</h2>
            <p className="text-slate-500 text-sm font-medium">Armá y controlá las hojas de ruta de tus repartidores.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 sticky top-20">
               <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Despachar Nueva Carga</h3>
               <CreateRouteForm orders={availableOrders || []} repartidores={repartidores || []} />
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl shadow-inner border border-slate-200">
               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <Truck className="text-orange-500"/> Unidades en Tránsito
               </h3>
               
               {!activeRoutes || activeRoutes.length === 0 ? (
                  <div className="text-center py-16 bg-white/50 border border-slate-200/50 rounded-2xl border-dashed">
                     <p className="text-slate-500 font-medium">No hay mensajeros ejecutando entregas ahora mismo.</p>
                  </div>
               ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                     {activeRoutes.map((route: any) => {
                        const deliveredStops = route.delivery_stops.filter((s:any) => s.status === 'delivered').length
                        const totalStops = route.delivery_stops.length
                        const progress = totalStops > 0 ? (deliveredStops / totalStops) * 100 : 0
                        return (
                           <div key={route.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                              <h4 className="font-extrabold text-xl text-slate-800">{route.users.full_name}</h4>
                              <p className="text-sm text-slate-400 font-bold mb-4 uppercase tracking-widest">{route.route_date}</p>
                              
                              <div className="space-y-2">
                                 <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-widest">
                                    <span>Rendimiento Físico</span>
                                    <span className="text-orange-600">{deliveredStops} / {totalStops}</span>
                                 </div>
                                 <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-1000 rounded-full" style={{ width: `${progress}%` }}></div>
                                 </div>
                              </div>
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
