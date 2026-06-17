'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markStopDelivered } from '@/app/actions/logisticsActions'
import { CheckCircle2, Navigation, Loader2, Phone } from 'lucide-react'
import LoadingOverlay from '../layout/LoadingOverlay'

export default function StopCard({ stop }: { stop: any }) {
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [loading, setLoading] = useState(false)
   const client = stop.orders.clients

   // Generador dinámico de URL Deep-Link para Waze o GMaps basado en el domicilio (OSM style)
   const gmapsUrl = client?.latitude 
      ? `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client?.address || 'Oficina Central')}`

   const handleDeliver = () => {
      const isConfirmed = confirm(`💰 ¿Atención: Ya cobraste los $${stop.orders.total_calc}? Confirmá para cerrar pedido.`)
      if (!isConfirmed) return
      
      startTransition(async () => {
         setLoading(true)
         const res = await markStopDelivered(stop.id, stop.orders.id)
         setLoading(false)
         if (res?.error) {
            alert(res.error)
         } else {
            router.refresh()
         }
      })
   }

   return (
      <div className="bg-white p-7 rounded-[2rem] shadow-xl shadow-slate-200/50 border-t-8 border-transparent hover:border-orange-500 transition-all flex flex-col group relative">
         <div className="flex justify-between items-start mb-8 gap-4">
            <div className="flex-1">
               <span className="inline-block bg-orange-100/50 text-orange-600 font-black px-4 py-1.5 rounded-full text-xs tracking-widest mb-4 border border-orange-200 uppercase">
                  Parada #{stop.stop_order_index}
               </span>
               <h3 className="font-black text-2xl text-slate-900 leading-tight mb-2 line-clamp-3">{client?.address || 'Retira en Sucursal / Sin Domicilio'}</h3>
               <p className="text-slate-500 font-bold text-base flex items-center gap-2">👤 {client?.name || 'Comprador Anónimo'}</p>
            </div>
            <div className="text-right shrink-0 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
               <p className="text-xs text-emerald-600/70 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
               <p className="font-black text-3xl text-emerald-600">${stop.orders.total_calc}</p>
            </div>
         </div>

         {client?.address && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 mb-6 shrink-0">
               <iframe 
                  width="100%" 
                  height="160" 
                  style={{ border: 0 }} 
                  loading="lazy" 
                  allowFullScreen 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
               ></iframe>
            </div>
         )}

         <div className="grid grid-cols-2 gap-4 mt-auto">
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-black py-5 rounded-2xl transition active:scale-95 duration-150">
               <Navigation size={22} /> Rutar GPS
            </a>
            <button onClick={handleDeliver} disabled={loading || isPending} className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl transition shadow-xl shadow-slate-900/20 disabled:opacity-50 active:scale-95 duration-150">
               {loading || isPending ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={22} /> Cobraje Listo</>}
            </button>
         </div>
         {client?.phone_number && (
             <a href={`tel:${client.phone_number}`} className="mt-4 flex items-center justify-center gap-2 text-slate-500 font-bold hover:text-orange-500 transition py-2">
               <Phone size={18} /> Llamar al timbre ({(client.phone_number)})
             </a>
         )}
         {isPending && <LoadingOverlay message="Confirmando entrega y cobro..." />}
      </div>
   )
}
