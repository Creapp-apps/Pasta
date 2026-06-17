'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateVariantPrice } from '@/app/actions/productoActions'

export default function VariantPriceEditor({ variant }: { variant: any }) {
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [isEditing, setIsEditing] = useState(false)
   const [price, setPrice] = useState(variant.price_override !== null && variant.price_override !== undefined ? variant.price_override.toString() : '')

   const handleSave = () => {
      const numericPrice = price.trim() === '' ? null : parseFloat(price)
      
      if (numericPrice !== null && (isNaN(numericPrice) || numericPrice < 0)) {
         alert("Por favor ingresá un precio válido")
         return
      }

      startTransition(async () => {
         const res = await updateVariantPrice(variant.id, numericPrice)
         
         if (res.error) {
            alert("Error actualizando precio: " + res.error)
         } else {
            setIsEditing(false)
            router.refresh()
         }
      })
   }

   if (isEditing) {
      return (
         <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
            <div className="relative flex items-center">
               <span className="absolute left-2 text-slate-400 font-bold text-xs">$</span>
               <input 
                  type="number"
                  placeholder="Base"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={isPending}
                  className="w-20 pl-4 pr-1 py-1 text-xs border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg text-slate-800 font-bold bg-white"
               />
            </div>
            <button 
               onClick={handleSave} 
               disabled={isPending}
               className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition shadow cursor-pointer disabled:opacity-50"
               title="Guardar"
            >
               {isPending ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>}
            </button>
            <button 
               onClick={() => { setIsEditing(false); setPrice(variant.price_override !== null && variant.price_override !== undefined ? variant.price_override.toString() : '') }} 
               disabled={isPending}
               className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md transition cursor-pointer"
               title="Cancelar"
            >
               <X size={14}/>
            </button>
         </div>
      )
   }

   return (
      <div 
         onClick={() => setIsEditing(true)}
         className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2 py-0.5 rounded-md transition group border border-dashed border-transparent hover:border-slate-200 shrink-0 whitespace-nowrap"
         title="Hacé clic para editar el precio de esta variante"
      >
         <span className={`font-mono font-bold ${variant.price_override ? 'text-slate-900' : 'text-slate-400'}`}>
            {variant.price_override ? `$${variant.price_override}` : 'Precio base'}
         </span>
         <Pencil size={12} className="text-slate-300 group-hover:text-slate-500 transition opacity-0 group-hover:opacity-100"/>
      </div>
   )
}
