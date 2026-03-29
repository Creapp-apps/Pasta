import { createClient } from '@/utils/supabase/server'
import { Map, MapPin } from 'lucide-react'
import StopCard from '@/components/logistics/StopCard'

export default async function RepartidorRoutePage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   
   // Buscar el viaje activo para ESTE cadete específico
   const { data: activeDelivery } = await supabase.from('deliveries')
      .select('id, delivery_stops(id, status, stop_order_index, orders(id, total_calc, clients(name, address, latitude, longitude, phone_number)))')
      .eq('repartidor_id', user?.id)
      .eq('status', 'active')
      .single()

   if (!activeDelivery) {
      return (
         <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-slate-50 text-center px-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-200/50 to-slate-50/0 pointer-events-none"></div>
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 mb-8 z-10 animate-bounce cursor-default">
               <MapPin size={64} className="text-orange-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 z-10 tracking-tight">Sin carga asignada</h2>
            <p className="text-slate-500 font-medium text-lg max-w-sm z-10">¡Tómate un descanso! La fábrica aún no te asignó ningún envío físico.</p>
         </div>
      )
   }

   const pendingStops = activeDelivery.delivery_stops.filter((s:any) => s.status === 'pending').sort((a:any, b:any) => a.stop_order_index - b.stop_order_index)
   const deliveredStops = activeDelivery.delivery_stops.filter((s:any) => s.status === 'delivered')

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-32 max-w-lg mx-auto md:max-w-3xl">
         <div className="bg-slate-900 px-8 py-6 rounded-3xl shadow-2xl shadow-slate-900/30 sticky top-4 z-40 text-white flex justify-between items-center backdrop-blur-xl bg-slate-900/90 border border-slate-800">
            <div>
               <h2 className="text-3xl font-black tracking-tight mb-1">Misión Activa</h2>
               <p className="text-orange-400 font-bold text-sm tracking-widest uppercase">{pendingStops.length} Paradas Físicas Restantes</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
               <Map size={28} className="text-white"/>
            </div>
         </div>

         {pendingStops.length === 0 ? (
            <div className="bg-emerald-50 border-4 border-emerald-500 rounded-3xl p-8 text-center">
               <p className="text-4xl mb-4">🏆</p>
               <h2 className="text-2xl font-black text-emerald-800">¡Ruta finalizada con éxito!</h2>
               <p className="text-emerald-700 font-medium mt-2">Le informaremos al dueño que regresas a base.</p>
            </div>
         ) : (
            <div className="space-y-4 px-2">
               {pendingStops.map((stop: any) => (
                  <StopCard key={stop.id} stop={stop} />
               ))}
            </div>
         )}

         {deliveredStops.length > 0 && (
            <div className="pt-10 px-4">
               <h3 className="font-extrabold text-slate-400 uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
                  <div className="h-px bg-slate-300 flex-1"></div>
                  Auditoría del Viaje
                  <div className="h-px bg-slate-300 flex-1"></div>
               </h3>
               <div className="space-y-3 opacity-60">
                  {deliveredStops.map((stop: any) => (
                     <div key={stop.id} className="bg-slate-100 p-5 rounded-2xl flex justify-between items-center">
                        <span className="font-bold text-slate-600 line-through truncate mr-4">{stop.orders.clients?.address || 'Dirección Cifrada'}</span>
                        <span className="text-emerald-600 font-black whitespace-nowrap bg-emerald-100 px-3 py-1 rounded-lg text-sm">ENTREGADO</span>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   )
}
