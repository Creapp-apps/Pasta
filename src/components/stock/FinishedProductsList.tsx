'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2, Save, X, Package, Printer } from 'lucide-react'
import { adjustLot, deleteLot } from '@/app/actions/lotProductionActions'

export default function FinishedProductsList({ terminados, allLots }: { terminados: any[], allLots: any[] }) {
   const [expandedId, setExpandedId] = useState<string | null>(null)
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
      if (!confirm(`¿Eliminar LOTE ${lot.lot_code} permanentemente? Esto va a descontar el stock del producto.`)) return
      
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


   return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Package size={20} className="text-orange-500"/> Productos Terminados
         </h3>
         
         {terminados.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Sin productos cargados</p>
         ) : (
            <div className="space-y-3">
               {terminados.map(item => {
                  const itemLots = allLots.filter((l: any) => l.product_id === item.id)
                  const isExpanded = expandedId === item.id

                  return (
                     <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden transition-all bg-white hover:border-slate-300">
                        <div 
                           className="p-4 flex justify-between items-center cursor-pointer select-none group"
                           onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                           <div className="flex items-center gap-3">
                              <div className={`p-1 rounded-full transition ${isExpanded ? 'bg-orange-100 text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                 {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                              </div>
                              <div>
                                 <span className="font-bold text-slate-800 text-lg">{item.name}</span>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">{item.category}</span>
                                    {itemLots.length > 0 && <span className="text-xs text-orange-600 font-semibold">{itemLots.length} lotes activos</span>}
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="font-mono font-black text-2xl text-slate-900">{item.current_stock}</span>
                              <span className="text-sm font-semibold text-slate-500 ml-1">{item.unit_of_measure}</span>
                           </div>
                        </div>

                        {/* Accordion Lotes */}
                        {isExpanded && (
                           <div className="bg-slate-50 p-4 border-t border-slate-200">
                              {itemLots.length === 0 ? (
                                 <p className="text-sm text-slate-500 italic text-center py-2">No hay lotes activos. El stock puede haber sido cargado manualmente.</p>
                              ) : (
                                 <div className="space-y-3">
                                    <div className="hidden md:grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                                       <div className="col-span-3">Lote</div>
                                       <div className="col-span-4">Variante/Sabor</div>
                                       <div className="col-span-2 text-center">Restantes</div>
                                       <div className="col-span-3 text-right">Acciones</div>
                                    </div>
                                    {itemLots.map((lot: any) => (
                                       <div key={lot.id} className="flex flex-col md:grid md:grid-cols-12 items-start md:items-center bg-white p-3 md:p-3 rounded-lg border border-slate-100 shadow-sm gap-3 md:gap-0">
                                          {/* Vista Mobile: Header, Vista PC: Columnas 1 y 2 */}
                                          <div className="w-full md:col-span-7 flex justify-between items-center md:grid md:grid-cols-7">
                                             <div className="md:col-span-3 font-mono font-bold text-orange-600 text-base md:text-sm">{lot.lot_code}</div>
                                             <div className="md:col-span-4 text-sm font-medium text-slate-700">{lot.product_variants?.name || 'Base única'}</div>
                                          </div>
                                          
                                          {/* Vista Mobile: Detalles y Acciones, Vista PC: Columnas 3 y 4 */}
                                          <div className="w-full md:col-span-5 flex justify-between items-center md:grid md:grid-cols-5 pt-3 md:pt-0 border-t border-slate-50 md:border-none">
                                             <div className="md:col-span-2 flex items-center md:justify-center">
                                                <span className="text-xs uppercase font-bold text-slate-400 mr-2 md:hidden">Stock:</span>
                                                {editingLot === lot.id ? (
                                                   <input 
                                                      type="number" value={editQty} onChange={e => setEditQty(e.target.value)} 
                                                      className="w-16 px-2 py-1 border border-orange-300 rounded font-bold text-center text-sm focus:outline-none focus:ring-2"
                                                   />
                                                ) : (
                                                   <span className="font-bold text-lg text-slate-900">{lot.quantity_remaining}</span>
                                                )}
                                             </div>

                                             <div className="md:col-span-3 flex justify-end gap-1">
                                                {editingLot === lot.id ? (
                                                   <>
                                                      <input type="text" placeholder="Motivo?" value={editReason} onChange={e => setEditReason(e.target.value)} className="w-24 text-xs px-2 py-1 border border-slate-200 rounded"/>
                                                      <button onClick={() => handleSave(lot)} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save size={14}/></button>
                                                      <button onClick={() => setEditingLot(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X size={14}/></button>
                                                   </>
                                                ) : (
                                                   <>
                                                      <button onClick={() => {setEditingLot(lot.id); setEditQty(lot.quantity_remaining.toString())}} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Ajustar cantidad">
                                                         <Pencil size={18} className="md:hidden"/><Pencil size={16} className="hidden md:block"/>
                                                      </button>
                                                      <button onClick={() => printLabel(lot, item.name)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Reimprimir Etiqueta">
                                                         <Printer size={18} className="md:hidden"/><Printer size={16} className="hidden md:block"/>
                                                      </button>
                                                      <button onClick={() => handleDelete(lot)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar Lote">
                                                         <Trash2 size={18} className="md:hidden"/><Trash2 size={16} className="hidden md:block"/>
                                                      </button>
                                                   </>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  )
               })}
            </div>
         )}
      </div>
   )
}
