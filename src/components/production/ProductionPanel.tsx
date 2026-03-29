'use client'

import { useState } from 'react'
import { CheckCircle2, UserCircle2, Loader2, Target } from 'lucide-react'
import { submitProductionAction } from '@/app/actions/productionActions'

export default function ProductionPanel({ recipes, userData }: { recipes: any[], userData: any }) {
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [qty, setQty] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState<any>(null)

  const handleProduce = async () => {
     if (!selectedRecipe || !qty || Number(qty) <= 0) return
     
     setLoading(true)
     const res = await submitProductionAction(selectedRecipe.id, Number(qty))
     setLoading(false)

     if (res.error) {
        alert(res.error)
     } else {
        setSuccessData({ points: res.points, recipeName: selectedRecipe.products.name, badge: res.badge })
        setSelectedRecipe(null)
        setQty('')
        setTimeout(() => setSuccessData(null), 5000) // Animacion oculta luego de 5segundos
     }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       
       <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recipes.map(recipe => (
               <button 
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`relative p-6 rounded-3xl border-4 text-left transition transform hover:-translate-y-1 ${selectedRecipe?.id === recipe.id ? 'border-orange-500 bg-orange-50 shadow-orange-500/20 shadow-xl' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}`}
               >
                  <p className="text-5xl mb-4">🤌</p>
                  <h3 className="font-extrabold text-slate-800 leading-tight text-lg">{recipe.products.name}</h3>
                  <p className="text-orange-600 font-bold text-sm mt-3 bg-white border border-slate-200 inline-block px-2 py-1 rounded">Rinde: {recipe.base_yield}</p>
               </button>
            ))}
            
            {recipes.length === 0 && (
               <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-slate-200">
                  Aún no hay recetas configuradas por el Administrador.
               </div>
            )}
          </div>

          {selectedRecipe && (
             <div className="bg-slate-900 p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-bottom-4 border-b-8 border-orange-500">
                <div className="flex-1">
                   <h4 className="text-white font-black text-2xl lg:text-3xl mb-2">Haciendo {selectedRecipe.products.name}</h4>
                   <p className="text-slate-400 font-medium">Usá el teclado para ingresar el volumen preparado.</p>
                </div>
                <div className="flex items-stretch gap-2 bg-slate-800 p-2 rounded-2xl border border-slate-700">
                   <input 
                      type="number" min="1" step="0.5" 
                      value={qty} onChange={e => setQty(e.target.value)}
                      placeholder="0"
                      className="w-24 bg-slate-700 text-white font-black text-center rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-3xl placeholder-slate-500"
                   />
                   <span className="flex items-center text-slate-400 px-2 font-bold uppercase">{selectedRecipe.products.unit_of_measure}</span>
                   <button 
                      onClick={handleProduce}
                      disabled={loading || !qty}
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 rounded-xl font-black uppercase tracking-wider transition ml-2 shadow-lg shadow-orange-500/20 active:scale-95 duration-100"
                   >
                     {loading ? <Loader2 className="animate-spin mx-auto"/> : 'COSER'}
                   </button>
                </div>
             </div>
          )}

          {successData && (
             <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl animate-in fade-in zoom-in slide-in-from-top-4 flex items-center gap-5 shadow-lg shadow-emerald-500/10">
                <div className="bg-emerald-500 text-white p-4 rounded-full"><CheckCircle2 size={36} strokeWidth={3} /></div>
                <div>
                   <h4 className="font-black text-emerald-800 text-2xl tracking-tight">¡Masa Registrada!</h4>
                   <p className="text-emerald-700 font-bold text-lg">Insumos restados. ¡Conseguiste <strong className="text-emerald-900 bg-emerald-200 px-2 rounded-md">+{successData.points} XP</strong>!</p>
                </div>
             </div>
          )}
       </div>

       {/* Widget de Perfil y Gamificación */}
       <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
             <UserCircle2 size={72} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight text-center">{userData.full_name}</h3>
          <p className="text-orange-600 font-black uppercase tracking-widest text-xs bg-orange-50 px-4 py-2 rounded-full mt-3 mb-8 border border-orange-200 shadow-sm">
             {userData.current_badge || 'Novato Pastero'}
          </p>

          <div className="w-full bg-slate-50 border border-slate-100 p-6 rounded-2xl relative overflow-hidden group hover:border-slate-300 transition cursor-default">
             <Target className="absolute -right-4 -top-4 text-slate-100 opacity-50 group-hover:scale-110 transition duration-500" size={120} />
             
             <div className="flex justify-between items-center mb-4 relative z-10">
                <span className="text-slate-500 font-extrabold flex items-center gap-2"><Target size={18} className="text-orange-500"/> Medidor XP</span>
                <span className="text-3xl font-black text-slate-900">{userData.gamification_score || 0}</span>
             </div>
             <div className="h-4 bg-slate-200 rounded-full overflow-hidden relative z-10 p-0.5">
                <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${Math.min(100, (userData.gamification_score || 0) / 20)}%`}}></div>
             </div>
             <p className="text-center text-xs text-slate-400 mt-4 font-bold relative z-10 bg-slate-50">Llegá a los 2000 XP para subir de Rango</p>
          </div>
       </div>

    </div>
  )
}
