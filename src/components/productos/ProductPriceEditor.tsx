'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateProductPrice } from '@/app/actions/productoActions'

export default function ProductPriceEditor({ product }: { product: any }) {
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [isEditing, setIsEditing] = useState(false)
   const [price, setPrice] = useState(product.price ? product.price.toString() : '0')

   const handleSave = () => {
      const numericPrice = parseFloat(price.trim())
      
      if (isNaN(numericPrice) || numericPrice <= 0) {
         alert("Por favor ingresá un precio válido mayor a 0")
         return
      }

      startTransition(async () => {
         const res = await updateProductPrice(product.id, numericPrice)
         
         if (res.error) {
            alert("Error actualizando precio base: " + res.error)
         } else {
            setIsEditing(false)
            router.refresh()
         }
      })
   }

   if (isEditing) {
      return (
         <div className="flex items-center gap-1.5 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="relative flex items-center">
               <span className="absolute left-2.5 text-slate-400 font-extrabold text-sm">$</span>
               <input 
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={isPending}
                  className="w-24 pl-5 pr-2 py-1 text-sm border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-xl text-slate-800 font-black bg-white"
               />
            </div>
            <button 
               onClick={handleSave} 
               disabled={isPending}
               className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition shadow cursor-pointer disabled:opacity-50"
               title="Guardar"
            >
               {isPending ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>}
            </button>
            <button 
               onClick={() => { setIsEditing(false); setPrice(product.price ? product.price.toString() : '0') }} 
               disabled={isPending}
               className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition cursor-pointer"
               title="Cancelar"
            >
               <X size={14}/>
            </button>
         </div>
      )
   }

   return (
      <div 
         onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
         className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 px-3 py-1 rounded-xl transition group border border-dashed border-transparent hover:border-slate-200"
         title="Hacé clic para editar el precio base de este producto"
      >
         <span className="font-black text-2xl text-slate-900">${product.price}</span>
         <Pencil size={14} className="text-slate-300 group-hover:text-slate-500 transition opacity-0 group-hover:opacity-100"/>
      </div>
   )
}
