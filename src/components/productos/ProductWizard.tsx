'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { createProductWithVariants } from '@/app/actions/productoActions'

export default function ProductWizard({ insumos }: { insumos: any[] }) {
   const [step, setStep] = useState(1)
   const [loading, setLoading] = useState(false)
   
   // Step 1: Base
   const [name, setName] = useState('')
   const [category, setCategory] = useState('Pastas Rellenas')
   const [unit, setUnit] = useState('cajas')
   const [priceBase, setPriceBase] = useState('')

   // Step 2: Receta Base
   const [baseIngredients, setBaseIngredients] = useState<{rawMaterialId: string; qty: string}[]>([])

   // Step 3: Variantes
   const [variants, setVariants] = useState<{name: string; price: string; extraIngredients: {rawMaterialId: string; qty: string}[]}[]>([])

   const addBaseIngredient = () => setBaseIngredients([...baseIngredients, { rawMaterialId: '', qty: '' }])
   const removeBaseIngredient = (i: number) => setBaseIngredients(baseIngredients.filter((_, idx) => idx !== i))

   const addVariant = () => setVariants([...variants, { name: '', price: '', extraIngredients: [] }])
   const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i))
   
   const addVariantIngredient = (vi: number) => {
      const newV = [...variants]
      newV[vi].extraIngredients.push({ rawMaterialId: '', qty: '' })
      setVariants(newV)
   }
   const removeVariantIngredient = (vi: number, ii: number) => {
      const newV = [...variants]
      newV[vi].extraIngredients = newV[vi].extraIngredients.filter((_, idx) => idx !== ii)
      setVariants(newV)
   }

   const handleSubmit = async () => {
      if (!name) return alert("Ingresá el nombre del producto")
      setLoading(true)

      const res = await createProductWithVariants({
         name,
         category,
         unit,
         priceBase: parseFloat(priceBase) || 0,
         baseIngredients: baseIngredients.filter(i => i.rawMaterialId && i.qty).map(i => ({ rawMaterialId: i.rawMaterialId, qty: parseFloat(i.qty) })),
         variants: variants.filter(v => v.name).map(v => ({
            name: v.name,
            price: parseFloat(v.price) || 0,
            extraIngredients: v.extraIngredients.filter(i => i.rawMaterialId && i.qty).map(i => ({ rawMaterialId: i.rawMaterialId, qty: parseFloat(i.qty) }))
         }))
      })

      setLoading(false)
      if (res.error) return alert(res.error)
      
      alert('¡Producto creado con éxito!')
      setStep(1); setName(''); setPriceBase(''); setBaseIngredients([]); setVariants([])
   }

   return (
      <div className="space-y-6">
         {/* Progress */}
         <div className="flex items-center gap-2">
            {[1,2,3].map(s => (
               <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 text-slate-400'}`}>
                     {step > s ? <Check size={16}/> : s}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
                     {s === 1 ? 'Base' : s === 2 ? 'Receta' : 'Variantes'}
                  </span>
                  {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-orange-400' : 'bg-slate-200'}`}></div>}
               </div>
            ))}
         </div>

         {/* Step 1: Producto Base */}
         {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto</label>
                  <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Ej: Sorrentinos" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" required/>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                     <option>Pastas Rellenas</option>
                     <option>Pastas Secas</option>
                     <option>Pastas Frescas</option>
                     <option>Salsas</option>
                     <option>Tapas</option>
                     <option>Otro</option>
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Unidad de Venta</label>
                     <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                        <option value="cajas">Cajas / Planchas</option>
                        <option value="kg">Kilogramos</option>
                        <option value="gramos">Gramos</option>
                        <option value="unidades">Unidades</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Precio Base ($)</label>
                     <input value={priceBase} onChange={e => setPriceBase(e.target.value)} type="number" step="0.01" placeholder="5500" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                  </div>
               </div>
               <button onClick={() => { if (!name) return alert("Poné un nombre"); setStep(2) }} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer shadow-lg">
                  Siguiente: Receta Base <ChevronRight size={18}/>
               </button>
            </div>
         )}

         {/* Step 2: Receta Base */}
         {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                  <p className="text-orange-800 text-sm font-medium">
                     Definí los ingredientes que son <strong>comunes a TODAS las variantes</strong> de "{name}".
                     <br/><br/>
                     💡 <strong>¿Cómo defino la cantidad?</strong><br/>
                     Poné la cantidad exacta de insumo que necesitas para elaborar <strong>1 {unit === 'cajas' ? 'caja / plancha' : unit === 'unidades' ? 'unidad' : unit}</strong> de este producto. El sistema va a multiplicar esto automáticamente cuando produzcas lotes.
                  </p>
               </div>
               
               {baseIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-3">
                     <select value={ing.rawMaterialId} onChange={e => { const n = [...baseIngredients]; n[i].rawMaterialId = e.target.value; setBaseIngredients(n) }} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-white" required>
                        <option value="">Elegir insumo...</option>
                        {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.name} ({ins.unit_of_measure})</option>)}
                     </select>
                     <input value={ing.qty} onChange={e => { const n = [...baseIngredients]; n[i].qty = e.target.value; setBaseIngredients(n) }} type="number" step="0.01" placeholder={`Cant. para 1 ${unit === 'cajas' ? 'caja' : unit}`} className="w-40 text-center px-4 py-3 border border-slate-200 rounded-xl" required/>
                     <button onClick={() => removeBaseIngredient(i)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={18}/></button>
                  </div>
               ))}

               <button onClick={addBaseIngredient} className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-2 rounded-lg transition cursor-pointer">
                  <Plus size={16}/> Agregar insumo base
               </button>

               <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer">
                     <ChevronLeft size={18}/> Atrás
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer shadow-lg">
                     Siguiente: Variantes <ChevronRight size={18}/>
                  </button>
               </div>
            </div>
         )}

         {/* Step 3: Variantes */}
         {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-blue-800 text-sm font-medium">
                     Agregá los <strong>sabores o rellenos</strong> específicos de "{name}". Cada variante hereda la receta base.
                     <br/><br/>
                     💡 Las cantidades extra abajo deben ser necesarias para <strong>1 {unit === 'cajas' ? 'caja / plancha' : unit === 'unidades' ? 'unidad' : unit}</strong> de este sabor.
                  </p>
               </div>

               {variants.map((variant, vi) => (
                  <div key={vi} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                     <div className="flex items-center gap-3">
                        <input value={variant.name} onChange={e => { const n = [...variants]; n[vi].name = e.target.value; setVariants(n) }} placeholder="Nombre: de Jamón y Queso" className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                        <input value={variant.price} onChange={e => { const n = [...variants]; n[vi].price = e.target.value; setVariants(n) }} type="number" step="0.01" placeholder="Precio ($)" className="w-32 px-4 py-3 border border-slate-200 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                        <button onClick={() => removeVariant(vi)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={18}/></button>
                     </div>
                     
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Insumos adicionales de esta variante:</p>
                     {variant.extraIngredients.map((ing, ii) => (
                        <div key={ii} className="flex items-center gap-3">
                           <select value={ing.rawMaterialId} onChange={e => { const n = [...variants]; n[vi].extraIngredients[ii].rawMaterialId = e.target.value; setVariants(n) }} className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm">
                              <option value="">Elegir insumo...</option>
                              {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.name} ({ins.unit_of_measure})</option>)}
                           </select>
                           <input value={ing.qty} onChange={e => { const n = [...variants]; n[vi].extraIngredients[ii].qty = e.target.value; setVariants(n) }} type="number" step="0.01" placeholder={`Cant. 1 ${unit === 'cajas' ? 'caja' : unit}`} className="w-28 text-center px-3 py-2.5 border border-slate-200 rounded-xl text-sm"/>
                           <button onClick={() => removeVariantIngredient(vi, ii)} className="p-2 text-red-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                        </div>
                     ))}
                     <button onClick={() => addVariantIngredient(vi)} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition cursor-pointer">
                        <Plus size={14} className="inline mr-1"/> Agregar insumo variable
                     </button>
                  </div>
               ))}

               <button onClick={addVariant} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer border-2 border-dashed border-slate-300">
                  <Plus size={18}/> Agregar Variante (Sabor/Relleno)
               </button>

               <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer">
                     <ChevronLeft size={18}/> Atrás
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50">
                     {loading ? <Loader2 className="animate-spin" size={18}/> : <><Check size={18}/> Guardar Producto Completo</>}
                  </button>
               </div>
            </div>
         )}
      </div>
   )
}
