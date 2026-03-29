'use client'

import { Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { deleteProduct } from '@/app/actions/productoActions'

export default function DeleteProductButton({ productId, productName }: { productId: string, productName: string }) {
   const [loading, setLoading] = useState(false)

   const handleDelete = async () => {
      if (!confirm(`¿Estás seguro de ELIMINAR el producto "${productName}" y todas sus recetas/variantes? Esta acción no se puede deshacer.`)) return
      setLoading(true)
      const res = await deleteProduct(productId)
      setLoading(false)
      if (res.error) alert(res.error)
   }

   return (
      <button 
         onClick={handleDelete} 
         disabled={loading}
         className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
         title="Eliminar producto"
      >
         {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      </button>
   )
}
