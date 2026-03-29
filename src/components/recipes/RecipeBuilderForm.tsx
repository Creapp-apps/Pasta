'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react'
import { createRecipeAction } from '@/app/actions/recipeActions'

export default function RecipeBuilderForm({ finishedProducts, rawMaterials }: { finishedProducts: any[], rawMaterials: any[] }) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [yieldQty, setYieldQty] = useState(1)
  const [ingredients, setIngredients] = useState([{ rawMaterialId: '', qty: '' }])
  const [loading, setLoading] = useState(false)

  const handleAddIngredient = () => setIngredients([...ingredients, { rawMaterialId: '', qty: '' }])
  
  const handleRemoveIngredient = (index: number) => {
     setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: string, value: string) => {
     const newIng = [...ingredients]
     if (field === 'id') newIng[index].rawMaterialId = value
     if (field === 'qty') newIng[index].qty = value
     setIngredients(newIng)
  }

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()
     setLoading(true)
     
     if (!selectedProduct || ingredients.some(i => !i.rawMaterialId || !i.qty)) {
        alert('Completá todos los campos de insumos.')
        setLoading(false)
        return
     }

     const formData = new FormData()
     formData.append('finishedProductId', selectedProduct)
     formData.append('baseYield', yieldQty.toString())
     formData.append('ingredients', JSON.stringify(ingredients))
     
     const res = await createRecipeAction(formData)
     setLoading(false)
     
     if (res.error) {
        alert(res.error)
     } else {
        alert('Receta BOM guardada existosamente. Cuando el operario la cocine, este stock se descontará automáticamente.')
        setSelectedProduct('')
        setIngredients([{ rawMaterialId: '', qty: '' }])
     }
  }

  return (
     <form onSubmit={handleSubmit} className="space-y-6">
       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2">Producto Terminado (A Fabricar)</label>
          <select 
             value={selectedProduct} 
             onChange={e => setSelectedProduct(e.target.value)}
             className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
             required
          >
             <option value="">-- Seleccioná qué pasta lleva esta receta --</option>
             {finishedProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Catálogo: {p.unit_of_measure})</option>
             ))}
          </select>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">Dato técnico: Separamos las "variantes" por producto (Ej: Muzzarella / Verdura) en lugar de juntarlos, así la computadora puede descontar la verdura o el queso de forma matemáticamente exacta sin que tengas cierres de caja erróneos.</p>
       </div>

       <div>
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <BookOpen size={20} className="text-orange-500"/> Insumos por Lote Unitario
          </h4>
          <p className="text-sm text-slate-500 mb-4">¿Cuáles y cuántos ingredientes brutos consumen 1 caja/kilo de lo seleccionado arriba?</p>
          
          <div className="space-y-3">
             {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3">
                   <select 
                     value={ing.rawMaterialId}
                     onChange={e => handleIngredientChange(i, 'id', e.target.value)}
                     className="flex-1 min-w-0 px-4 py-3 border border-slate-300 rounded-xl shadow-sm"
                     required
                   >
                     <option value="">Elegir Insumo Cargado</option>
                     {rawMaterials.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit_of_measure})</option>
                     ))}
                   </select>
                   <input 
                      type="number" step="0.01" placeholder="Cant." 
                      value={ing.qty}
                      onChange={e => handleIngredientChange(i, 'qty', e.target.value)}
                      className="w-28 text-center px-4 py-3 border border-slate-300 rounded-xl shadow-sm"
                      required
                   />
                   <button type="button" onClick={() => handleRemoveIngredient(i)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition cursor-pointer shadow-sm"><Trash2 size={20}/></button>
                </div>
             ))}
          </div>
          
          <button type="button" onClick={handleAddIngredient} className="mt-4 flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-2 rounded-lg transition cursor-pointer">
             <Plus size={16} /> Añadir otro insumo vital a la receta
          </button>
       </div>

       <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 shadow-xl shadow-slate-900/20 hover:bg-slate-800 text-white rounded-xl font-bold text-lg transition cursor-pointer disabled:opacity-70">
          {loading ? <Loader2 size={24} className="animate-spin" /> : 'Sematizar Receta en Sistema'}
       </button>
     </form>
  )
}
