'use client'

import { useState } from 'react'
import { Pencil, Trash2, Save, X, Printer } from 'lucide-react'
import { adjustLot, deleteLot } from '@/app/actions/lotProductionActions'

export default function RecentLotsList({ recentLots }: { recentLots: any[] }) {
   const [editingLot, setEditingLot] = useState<string | null>(null)
   const [editQty, setEditQty] = useState('')
   const [editReason, setEditReason] = useState('')

   const handleSave = async (lot: any) => {
      if (!editReason) return alert("Tenés que justificar el motivo del cambio.")
      const qty = parseFloat(editQty)
      if (isNaN(qty) || qty < 0) return alert("Cantidad inválida")

      await adjustLot(lot.id, qty, editReason)
      setEditingLot(null)
      setEditReason('')
   }

   const handleDelete = async (lot: any) => {
      const reason = prompt("Justificación para ELIMINAR lote:")
      if (!reason) return
      if (!confirm(`¿Eliminar LOTE ${lot.lot_code} permanentemente? Esto va a descontar el stock.`)) return
      
      await deleteLot(lot.id, reason)
   }

   const printLabel = (lot: any, itemName: string) => {
      const variantName = lot.product_variants?.name ? ' - ' + lot.product_variants.name : ''
      const labelHtml = `
         <html><head><style>
            @page { size: 40mm 30mm; margin: 2mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; text-align: center; }
            .lot { font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
            .name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .date { font-size: 9px; color: #555; }
         </style></head><body>
            <div class="lot">${lot.lot_code}</div>
            <div class="name">${itemName}${variantName}</div>
            <div class="date">Elab: ${new Date(lot.elaboration_date).toLocaleDateString('es-AR')}</div>
         </body></html>
      `
      const printWindow = window.open('', '_blank', 'width=300,height=200')
      if (printWindow) {
         printWindow.document.write(labelHtml)
         printWindow.document.close()
         printWindow.print()
      }
   }

   if (!recentLots || recentLots.length === 0) return null

   return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">Últimos Lotes Producidos</h3>
         {/* Lista Mobile */}
         <div className="grid grid-cols-1 gap-4 md:hidden">
            {recentLots.map((lot: any) => (
               <div key={lot.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                     <span className="font-mono font-bold text-orange-600">#{lot.lot_code}</span>
                     <span className="text-slate-500 text-xs">{new Date(lot.elaboration_date).toLocaleDateString('es-AR')}</span>
                  </div>
                  <div>
                     <p className="font-semibold text-slate-800 text-lg">{lot.products?.name}</p>
                     <p className="text-slate-500 text-sm">{lot.product_variants?.name || 'Base única'}</p>
                  </div>
                  
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg mt-2">
                     <span className="text-xs uppercase font-bold text-slate-400">Stock Disp:</span>
                     {editingLot === lot.id ? (
                        <input 
                           type="number" value={editQty} onChange={e => setEditQty(e.target.value)} 
                           className="w-20 px-2 py-1 border border-orange-300 rounded font-bold text-center text-sm focus:outline-none focus:ring-2"
                        />
                     ) : (
                        <span className="font-black text-slate-900 text-xl">{lot.quantity_remaining}</span>
                     )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                     {editingLot === lot.id ? (
                        <div className="flex w-full gap-2">
                           <input type="text" placeholder="Motivo?" value={editReason} onChange={e => setEditReason(e.target.value)} className="flex-1 text-sm px-2 py-2 border border-slate-200 rounded"/>
                           <button onClick={() => handleSave(lot)} className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save size={18}/></button>
                           <button onClick={() => setEditingLot(null)} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X size={18}/></button>
                        </div>
                     ) : (
                        <>
                           <button onClick={() => {setEditingLot(lot.id); setEditQty(lot.quantity_remaining.toString())}} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Ajustar stock">
                              <Pencil size={20}/>
                           </button>
                           <button onClick={() => handleDelete(lot)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar Lote">
                              <Trash2 size={20}/>
                           </button>
                           <button onClick={() => printLabel(lot, lot.products?.name || '')} className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Limprimir">
                              <Printer size={20}/>
                           </button>
                        </>
                     )}
                  </div>
               </div>
            ))}
         </div>

         {/* Lista Desktop */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
               <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                     <th className="py-3 font-semibold px-2">Lote</th>
                     <th className="py-3 font-semibold">Producto</th>
                     <th className="py-3 font-semibold">Variante</th>
                     <th className="py-3 font-semibold text-center">Restantes</th>
                     <th className="py-3 font-semibold text-center">Producidos</th>
                     <th className="py-3 font-semibold text-center px-2">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {recentLots.map((lot: any) => (
                     <tr key={lot.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3 px-2 font-mono font-bold text-orange-600">{lot.lot_code}</td>
                        <td className="py-3 font-semibold text-slate-800">{lot.products?.name}</td>
                        <td className="py-3 text-slate-600">{lot.product_variants?.name || '—'}</td>
                        
                        <td className="py-3 text-center">
                           {editingLot === lot.id ? (
                              <input 
                                 type="number" value={editQty} onChange={e => setEditQty(e.target.value)} 
                                 className="w-16 px-2 py-1 border border-orange-300 rounded font-bold text-center text-sm focus:outline-none focus:ring-2"
                              />
                           ) : (
                              <span className="font-bold text-slate-900">{lot.quantity_remaining}</span>
                           )}
                        </td>

                        <td className="py-3 text-center text-slate-400 text-sm">{lot.quantity_produced}</td>

                        <td className="py-3 px-2 text-right w-44">
                           {editingLot === lot.id ? (
                              <div className="flex justify-end gap-1">
                                 <input type="text" placeholder="Motivo?" value={editReason} onChange={e => setEditReason(e.target.value)} className="w-20 text-xs px-2 py-1 border border-slate-200 rounded"/>
                                 <button onClick={() => handleSave(lot)} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save size={14}/></button>
                                 <button onClick={() => setEditingLot(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X size={14}/></button>
                              </div>
                           ) : (
                              <div className="flex justify-end gap-1">
                                 <button onClick={() => {setEditingLot(lot.id); setEditQty(lot.quantity_remaining.toString())}} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Ajustar stock">
                                    <Pencil size={16}/>
                                 </button>
                                 <button onClick={() => handleDelete(lot)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar Lote">
                                    <Trash2 size={16}/>
                                 </button>
                                 <button onClick={() => printLabel(lot, lot.products?.name || '')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Limprimir">
                                    <Printer size={16}/>
                                 </button>
                              </div>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   )
}
