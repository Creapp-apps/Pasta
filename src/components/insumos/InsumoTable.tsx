'use client'

import { useState } from 'react'
import { Trash2, Save, AlertTriangle, Pencil, Plus, Minus, X } from 'lucide-react'
import { updateInsumoStock, deleteInsumo } from '@/app/actions/insumoActions'

export default function InsumoTable({ insumos }: { insumos: any[] }) {
   const [editingId, setEditingId] = useState<string | null>(null)
   const [editStock, setEditStock] = useState<string>('')
   const [adjustMode, setAdjustMode] = useState<'set' | 'add' | 'sub'>('set')

   const handleStartEdit = (insumo: any, mode: 'set' | 'add' | 'sub') => {
      setEditingId(insumo.id)
      setAdjustMode(mode)
      setEditStock(mode === 'set' ? insumo.current_stock.toString() : '')
   }

   const handleSaveStock = async (insumo: any) => {
      const val = parseFloat(editStock) || 0
      let finalStock = val
      
      if (adjustMode === 'add') {
         finalStock = Number(insumo.current_stock) + val
      } else if (adjustMode === 'sub') {
         finalStock = Number(insumo.current_stock) - val
      }
      
      if (finalStock < 0) finalStock = 0
      await updateInsumoStock(insumo.id, finalStock)
      setEditingId(null)
   }

   const handleDelete = async (id: string, name: string) => {
      if (!confirm(`¿Eliminar "${name}" del depósito? Esta acción no se puede deshacer.`)) return
      await deleteInsumo(id)
   }

   return (
      <div className="overflow-x-auto">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="border-b border-slate-100 text-sm text-slate-500">
                  <th className="py-3 font-semibold px-2">Insumo</th>
                  <th className="py-3 font-semibold">Unidad</th>
                  <th className="py-3 font-semibold">Stock Actual</th>
                  <th className="py-3 font-semibold">Alerta Mín.</th>
                  <th className="py-3 font-semibold text-right px-2">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {insumos.map(insumo => {
                  const isLow = Number(insumo.min_stock_alert) > 0 && Number(insumo.current_stock) <= Number(insumo.min_stock_alert)
                  return (
                     <tr key={insumo.id} className={`border-b border-slate-50 transition ${isLow ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-4 px-2">
                           <div className="flex items-center gap-2">
                              {isLow && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                              <span className="font-semibold text-slate-800">{insumo.name}</span>
                           </div>
                        </td>
                        <td className="py-4">
                           <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600">
                              {insumo.unit_of_measure}
                           </span>
                        </td>
                        <td className="py-4">
                           {editingId === insumo.id ? (
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-slate-400">
                                    {adjustMode === 'add' ? 'Sumar:' : adjustMode === 'sub' ? 'Restar:' : 'Nuevo:'}
                                 </span>
                                 <input 
                                    type="number" step="0.01" value={editStock}
                                    onChange={e => setEditStock(e.target.value)}
                                    className="w-24 px-3 py-2 border border-orange-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    autoFocus
                                    placeholder="0"
                                 />
                                 <button onClick={() => handleSaveStock(insumo)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition" title="Guardar">
                                    <Save size={16} />
                                 </button>
                                 <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition" title="Cancelar">
                                    <X size={16} />
                                 </button>
                              </div>
                           ) : (
                              <span className={`font-mono font-bold px-3 py-1.5 rounded-lg ${isLow ? 'text-red-700 bg-red-100' : 'text-slate-900 bg-slate-50'}`}>
                                 {insumo.current_stock} {insumo.unit_of_measure}
                              </span>
                           )}
                        </td>
                        <td className="py-4 text-slate-500 font-medium">
                           {Number(insumo.min_stock_alert) > 0 ? `${insumo.min_stock_alert} ${insumo.unit_of_measure}` : '—'}
                        </td>
                        <td className="py-4 text-right px-2">
                           <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleStartEdit(insumo, 'add')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Sumar stock">
                                 <Plus size={18} />
                              </button>
                              <button onClick={() => handleStartEdit(insumo, 'sub')} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Restar stock">
                                 <Minus size={18} />
                              </button>
                              <button onClick={() => handleStartEdit(insumo, 'set')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Editar stock manualmente">
                                 <Pencil size={18} />
                              </button>
                              <button onClick={() => handleDelete(insumo.id, insumo.name)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  )
               })}
            </tbody>
         </table>
      </div>
   )
}
