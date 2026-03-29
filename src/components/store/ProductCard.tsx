'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { Plus, Minus, ShoppingCart } from 'lucide-react'

export default function ProductCard({ product }: { product: any }) {
  const [qty, setQty] = useState(1)
  const { addItem } = useCart()
  
  const handleAdd = () => {
     addItem(product, qty)
     setQty(1) // reset
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition">
       <div className="h-40 bg-slate-50 rounded-2xl mb-4 flex items-center justify-center text-6xl shadow-inner border border-slate-100 relative overflow-hidden">
         🍝
         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-200/50 to-transparent pointer-events-none" />
       </div>
       <div className="flex-1">
         <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{product.name}</h3>
         <p className="text-sm text-slate-500 mb-4 capitalize">{product.unit_of_measure}</p>
         <p className="text-2xl font-black text-slate-900">${product.price}</p>
       </div>
       
       <div className="mt-6 flex flex-col gap-3">
         <div className="flex items-center justify-between border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 text-slate-400 hover:text-orange-500 bg-white rounded-lg cursor-pointer shadow-sm"><Minus size={16}/></button>
            <span className="font-bold text-slate-800 px-4 text-lg">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-2 text-slate-400 hover:text-orange-500 bg-white rounded-lg cursor-pointer shadow-sm"><Plus size={16}/></button>
         </div>
         <button onClick={handleAdd} className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 duration-150">
            <ShoppingCart size={18} /> Agregar al Pedido
         </button>
       </div>
    </div>
  )
}
