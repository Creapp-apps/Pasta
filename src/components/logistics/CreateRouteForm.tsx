'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createDeliveryRoute } from '@/app/actions/logisticsActions'
import { Navigation, Loader2 } from 'lucide-react'
import LoadingOverlay from '../layout/LoadingOverlay'

export default function CreateRouteForm({ orders, repartidores }: { orders: any[], repartidores: any[] }) {
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [selectedRepartidor, setSelectedRepartidor] = useState('')
   const [selectedOrders, setSelectedOrders] = useState<string[]>([])
   const [loading, setLoading] = useState(false)
   const [focusedAddress, setFocusedAddress] = useState<string | null>(null)

   // Set initial focused address to first package with address
   useEffect(() => {
      if (orders.length > 0 && !focusedAddress) {
         const firstWithAddr = orders.find(o => o.clients?.address)
         setFocusedAddress(firstWithAddr?.clients?.address || null)
      }
   }, [orders, focusedAddress])

   const toggleOrder = (id: string) => {
      setSelectedOrders(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id])
   }

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedRepartidor) return alert("Seleccioná el conductor.")
      if (selectedOrders.length === 0) return alert("Cargá al menos un paquete en el vehículo.")
      
      startTransition(async () => {
         setLoading(true)
         const form = new FormData()
         form.append('repartidorId', selectedRepartidor)
         form.append('orderIds', JSON.stringify(selectedOrders))

         const res = await createDeliveryRoute(form)
         setLoading(false)

         if (res.error) {
            alert(res.error)
         } else {
            alert("📡 Ruta lanzada exitosamente al dispositivo del repartidor.")
            setSelectedRepartidor('')
            setSelectedOrders([])
            setFocusedAddress(null)
            router.refresh()
         }
      })
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
               <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {orders.map(order => (
                     <div 
                        key={order.id} 
                        onClick={() => {
                           toggleOrder(order.id)
                           if (order.clients?.address) {
                              setFocusedAddress(order.clients.address)
                           }
                        }}
                        className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition cursor-pointer select-none group ${selectedOrders.includes(order.id) ? 'border-orange-500 bg-orange-50 shadow-md shadow-orange-500/10' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                     >
                        <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${selectedOrders.includes(order.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                           {selectedOrders.includes(order.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1">
                           {order.clients?.address ? (
                              <a 
                                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.clients.address)}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="font-extrabold text-slate-800 text-base hover:text-blue-500 hover:underline inline-flex items-center gap-1.5"
                                 onClick={e => e.stopPropagation()}
                              >
                                 {order.clients.address} 📍
                              </a>
                           ) : (
                              <p className="font-extrabold text-slate-800 text-base text-slate-400 italic">Cliente Sin Domicilio / Retiro Local</p>
                           )}
                           <p className="text-sm font-medium text-slate-500 mt-1">{order.clients?.name || 'Cliente Ocasional'}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">A Cobrar</p>
                           <p className="font-black text-lg text-emerald-600">${order.total_calc}</p>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* Mapa de Ubicación de Entrega */}
         {focusedAddress && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
               <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Mapa de Ubicación de Entrega</h4>
                  <a 
                     href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(focusedAddress)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-xs font-bold text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                     Abrir en Maps ↗
                  </a>
               </div>
               <div className="rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                  <iframe 
                     width="100%" 
                     height="220" 
                     style={{ border: 0 }} 
                     loading="lazy" 
                     allowFullScreen 
                     src={`https://maps.google.com/maps?q=${encodeURIComponent(focusedAddress)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
               </div>
            </div>
         )}

         <button disabled={loading || selectedOrders.length === 0} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50 transition active:scale-95 duration-150">
            {loading ? <Loader2 className="animate-spin" /> : <><Navigation size={22} /> Envíar Rutas al Celular</>}
         </button>
         {isPending && <LoadingOverlay message="Creando ruta logística..." />}
      </form>
   )
}
