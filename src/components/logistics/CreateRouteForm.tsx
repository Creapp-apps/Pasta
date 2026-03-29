'use client'

import { useState } from 'react'
import { createDeliveryRoute } from '@/app/actions/logisticsActions'
import { Navigation, Loader2 } from 'lucide-react'

export default function CreateRouteForm({ orders, repartidores }: { orders: any[], repartidores: any[] }) {
   const [selectedRepartidor, setSelectedRepartidor] = useState('')
   const [selectedOrders, setSelectedOrders] = useState<string[]>([])
   const [loading, setLoading] = useState(false)

   const toggleOrder = (id: string) => {
      setSelectedOrders(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id])
   }

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedRepartidor) return alert("Seleccioná el conductor.")
      if (selectedOrders.length === 0) return alert("Cargá al menos un paquete en el vehículo.")
      
      setLoading(true)
      const form = new FormData()
      form.append('repartidorId', selectedRepartidor)
      form.append('orderIds', JSON.stringify(selectedOrders))

      const res = await createDeliveryRoute(form)
      setLoading(false)

      if (res.error) alert(res.error)
      else {
         alert("📡 Ruta lanzada exitosamente al dispositivo del repartidor.")
         setSelectedRepartidor('')
         setSelectedOrders([])
      }
   }

   return (
      <form onSubmit={handleSubmit} className="space-y-6">
         <div>
            <label className="block text-sm font-black tracking-tight text-slate-700 mb-2 uppercase">Asignar al Vehículo:</label>
            <select 
               value={selectedRepartidor} 
               onChange={e => setSelectedRepartidor(e.target.value)}
               className="w-full px-5 py-4 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 shadow-sm font-bold text-slate-800 focus:outline-none"
            >
               <option value="">-- Buscar Cadete Disponible --</option>
               {repartidores.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
            {repartidores.length === 0 && <p className="text-red-500 text-xs mt-2 font-bold px-2">¡Atención! Aún no cargaste a nadie con el rol "repartidor" en la sección de control.</p>}
         </div>

         <div>
            <label className="flex items-center justify-between text-sm font-black tracking-tight text-slate-700 mb-3 uppercase">
               <span>Punto de Entrega (B2C):</span>
               <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs">{selectedOrders.length} Seleccionados</span>
            </label>
            
            {orders.length === 0 ? (
               <div className="bg-slate-50 p-8 text-center rounded-2xl border border-slate-200 shadow-inner">
                  <p className="text-slate-500 text-sm font-bold">Sin paquetes listos para enviar.</p>
                  <p className="text-slate-400 text-xs mt-1">Los clientes o la cocina no han reportado lotes finalizados.</p>
               </div>
            ) : (
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {orders.map(order => (
                     <label key={order.id} className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition cursor-pointer select-none group ${selectedOrders.includes(order.id) ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-500/10' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${selectedOrders.includes(order.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                           {selectedOrders.includes(order.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1">
                           <p className="font-extrabold text-slate-800 text-base">{order.clients?.address || 'Cliente Sin Domicilio / Retiro Local'}</p>
                           <p className="text-sm font-medium text-slate-500 mt-1">{order.clients?.name || 'Cliente Ocasional'}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">A Cobrar</p>
                           <p className="font-black text-lg text-emerald-600">${order.total_calc}</p>
                        </div>
                     </label>
                  ))}
               </div>
            )}
         </div>

         <button disabled={loading || selectedOrders.length === 0} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50 transition active:scale-95 duration-150">
            {loading ? <Loader2 className="animate-spin" /> : <><Navigation size={22} /> Envíar Rutas al Celular</>}
         </button>
      </form>
   )
}
