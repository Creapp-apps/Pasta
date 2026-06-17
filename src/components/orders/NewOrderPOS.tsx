'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/app/actions/orderActions'
import { Plus, Trash2, ShoppingCart, Check, Loader2, ArrowRight, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import LoadingOverlay from '../layout/LoadingOverlay'

const formatARS = (amount: number) => {
   return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

export default function NewOrderPOS({ 
   products, variants, clients, activeLots 
}: { 
   products: any[], variants: any[], clients: any[], activeLots: any[] 
}) {
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [isManualLots, setIsManualLots] = useState(false)
   const [cartMap, setCartMap] = useState<any>({})
   const [selectedClient, setSelectedClient] = useState('')
   const [paymentMethod, setPaymentMethod] = useState('cash')
   const [loading, setLoading] = useState(false)
   const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

   const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 4000)
   }

   const addProductToCart = (prodId: string, varId: string | null) => {
      const p = products.find(x => x.id === prodId)
      const v = variants.find(x => x.id === varId)
      
      const key = `${prodId}_${varId || 'none'}`
      const basePrice = v?.price_override ?? p.price ?? 0

      setCartMap((prev: any) => {
         const old = prev[key]
         if (old) {
            return { ...prev, [key]: { ...old, qty: old.qty + 1 } }
         } else {
            return { ...prev, [key]: {
               productId: prodId,
               variantId: varId,
               name: `${p.name} ${v ? '- ' + v.name : ''}`,
               unitPrice: basePrice,
               qty: 1,
               manualAllocations: [] // [{lotId: '...', qty: 1}]
            }}
         }
      })
   }

   const removeFromCart = (key: string) => {
      setCartMap((prev: any) => {
         const n = { ...prev }
         delete n[key]
         return n
      })
   }

   const cartItems = Object.entries(cartMap).map(([k, v]) => ({ key: k, ...(v as any) }))
   const cartTotal = cartItems.reduce((acc, obj) => acc + (obj.qty * obj.unitPrice), 0)

   const handleSubmit = () => {
      if (cartItems.length === 0) return showToast('El carrito está vacío.', 'error')
      if (isManualLots) {
         // Valida si manual allocations == qty para cada item
         for (const i of cartItems) {
            const allocTotal = i.manualAllocations?.reduce((sum: number, a: any) => sum + (parseFloat(a.qty) || 0), 0) || 0
            if (allocTotal !== i.qty) {
               return showToast(`Error: El producto ${i.name} dice ${i.qty} unidades, pero vos le asignaste de lotes un total de ${allocTotal}. Ajustá el stock manual para que coincidan.`, 'error')
            }
         }
      }

      startTransition(async () => {
         setLoading(true)
         const res = await createOrder({
            clientId: selectedClient || null,
            items: cartItems.map(i => ({
               productId: i.productId,
               variantId: i.variantId,
               qty: i.qty,
               unitPrice: i.unitPrice,
               manualAllocations: isManualLots ? i.manualAllocations : undefined
            })),
            paymentMethod,
            isManualLotSelection: isManualLots,
            totalCalc: cartTotal
         })
         setLoading(false)

         if (res.error) return showToast(res.error, 'error')
         
         setCartMap({})
         setSelectedClient('')
         showToast(`¡Pedido #${res.orderId.substring(0,6)} creado y descontado con éxito!`, 'success')
         router.refresh()
      })
   }

   return (
      <>
      <div className="flex flex-col lg:flex-row gap-6">
         {/* Izquierda: Catálogo y POS */}
         <div className="flex-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                     <ShoppingCart className="text-orange-500" size={28} /> Punto de Venta
                  </h2>
                  <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                     <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={isManualLots} onChange={e => setIsManualLots(e.target.checked)}/>
                     <span className="font-bold text-slate-700 text-sm">Escaneo Manual de Lotes</span>
                  </label>
               </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                   {products.map(p => {
                      const pVars = variants.filter(v => v.product_id === p.id)
                      if (pVars.length === 0) {
                         const prodStock = p.current_stock !== undefined && p.current_stock !== null ? p.current_stock : 0
                         return (
                            <button 
                               key={p.id} 
                               onClick={() => addProductToCart(p.id, null)} 
                               className="p-5 rounded-2xl border-2 border-slate-100 hover:border-orange-400 focus:bg-orange-50 bg-white transition shadow-sm text-left flex flex-col justify-between h-full group"
                            >
                               <div>
                                  <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-orange-600 transition">{p.name}</h4>
                                  <span className="text-xs font-bold text-slate-400 mt-2 block bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 w-max">
                                     Stock: {prodStock} {p.unit_of_measure || 'u.'}
                                  </span>
                                </div>
                                <p className="text-orange-600 font-extrabold text-xl mt-4">{formatARS(p.price)}</p>
                            </button>
                         )
                      }

                      // Product with variants (flavors)
                      return (
                         <div key={p.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-full">
                            <div className="border-b border-slate-100 pb-3">
                               <h4 className="font-extrabold text-slate-800 text-lg leading-tight uppercase tracking-wider">{p.name}</h4>
                               <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Sabores y Precios</p>
                            </div>
                            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                               {pVars.map((v: any) => {
                                  const varLots = activeLots.filter((l: any) => l.variant_id === v.id)
                                  const varStock = varLots.reduce((acc: number, curr: any) => acc + Number(curr.quantity_remaining || 0), 0)
                                  const price = v.price_override || p.price || 0
                                  return (
                                     <button
                                        key={v.id}
                                        onClick={() => addProductToCart(p.id, v.id)}
                                        className="w-full p-3 rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/40 text-left flex justify-between items-center transition group active:scale-[0.98] duration-100"
                                     >
                                        <div className="space-y-0.5 pr-2">
                                           <p className="font-bold text-slate-700 text-sm group-hover:text-slate-900 leading-tight">{v.name}</p>
                                           <p className="text-[10px] font-bold text-slate-400">
                                              Stock: {varStock} {p.unit_of_measure || 'u.'}
                                           </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                           <p className="text-orange-600 font-extrabold text-sm">{formatARS(price)}</p>
                                        </div>
                                     </button>
                                  )
                               })}
                            </div>
                         </div>
                      )
                   })}
                </div>
            </div>
         </div>

         {/* Derecha: Resumen de Pedido y Trazabilidad */}
         <div id="ticket-section" className="lg:w-[450px] space-y-4">
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl lg:sticky lg:top-8">
               <h3 className="font-bold text-xl mb-6">Ticket Abierto</h3>

               <div className="space-y-4 mb-6">
                  {cartItems.length === 0 ? (
                     <p className="text-slate-500 italic text-center text-sm py-4">Agregá productos desde el catálogo</p>
                  ) : cartItems.map((item, index) => (
                     <div key={item.key} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="font-bold text-slate-100">{item.name}</p>
                              <p className="text-slate-400 text-sm">{formatARS(item.unitPrice)} x {item.qty}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <p className="font-black text-orange-400 text-lg">{formatARS(item.qty * item.unitPrice)}</p>
                              <button onClick={() => removeFromCart(item.key)} className="text-slate-500 hover:text-red-400 transition"><Trash2 size={16}/></button>
                           </div>
                        </div>

                        {/* Controles: +/- cantidad */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                           <span className="text-xs font-bold text-slate-500 uppercase">Cantidad Disp.</span>
                           <div className="flex items-center gap-4">
                              <button onClick={() => { if (item.qty > 1) setCartMap({ ...cartMap, [item.key]: { ...cartMap[item.key], qty: item.qty - 1 } }) }} className="w-8 h-8 rounded-full bg-slate-700 font-black">-</button>
                              <span className="font-black text-xl">{item.qty}</span>
                              <button onClick={() => { setCartMap({ ...cartMap, [item.key]: { ...cartMap[item.key], qty: item.qty + 1 } }) }} className="w-8 h-8 rounded-full bg-slate-700 font-black">+</button>
                           </div>
                        </div>

                        {/* Selector de Lotes (Solo si es manual) */}
                        {isManualLots && (
                           <div className="pt-2 border-t border-slate-700 space-y-2">
                              <p className="text-xs font-bold text-orange-400">ESCANEO DE LOTES PARA ESTA LÍNEA:</p>
                              <div className="flex gap-2">
                                 <select id={`lot-${item.key}`} className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs">
                                    <option value="">Elegir lote (Stock actual)...</option>
                                    {activeLots.filter(l => l.product_id === item.productId && (!item.variantId || l.variant_id === item.variantId)).map(l => (
                                       <option key={l.id} value={l.id}>{l.lot_code} ({l.quantity_remaining} dip.)</option>
                                    ))}
                                 </select>
                                 <input id={`qty-${item.key}`} type="number" step="0.5" min="0.5" defaultValue="1" className="w-16 bg-slate-950 border border-slate-600 rounded px-2 text-xs text-center"/>
                                 <button onClick={() => {
                                    const select = document.getElementById(`lot-${item.key}`) as HTMLSelectElement
                                    const ipt = document.getElementById(`qty-${item.key}`) as HTMLInputElement
                                    if (!select?.value || !ipt?.value) return
                                    
                                    const newAlloc = { lotId: select.value, qty: parseFloat(ipt.value) }
                                    const allocs = [...(item.manualAllocations || [])]
                                    const existingMatch = allocs.find(a => a.lotId === newAlloc.lotId)
                                    if (existingMatch) existingMatch.qty += newAlloc.qty
                                    else allocs.push(newAlloc)

                                    setCartMap({ ...cartMap, [item.key]: { ...cartMap[item.key], manualAllocations: allocs } })
                                 }} className="bg-slate-700 px-2 rounded hover:bg-slate-600 text-xs text-white">
                                    Añadir
                                 </button>
                              </div>

                              {item.manualAllocations?.map((alloc: any, i: number) => {
                                 const lotObj = activeLots.find(l => l.id === alloc.lotId)
                                 return (
                                    <div key={i} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded">
                                       <span className="text-slate-400 font-mono">[{lotObj?.lot_code}]</span>
                                       <span className="font-bold text-white pr-2">{alloc.qty} unds</span>
                                    </div>
                                 )
                              })}

                              {(() => {
                                 const totalAssigned = item.manualAllocations?.reduce((sum: number, a: any) => sum + (parseFloat(a.qty) || 0), 0) || 0
                                 if (totalAssigned !== item.qty) {
                                    return <span className="text-xs text-red-400 font-bold block pt-1 text-right">Faltan asignar {item.qty - totalAssigned} unidades</span>
                                 }
                                 return <span className="text-xs text-emerald-400 font-bold block pt-1 text-right">Lotes Completos ✓</span>
                              })()}
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               <div className="pt-4 border-t-2 border-dashed border-slate-700 mb-6 flex justify-between items-end">
                  <span className="text-slate-400 font-bold">TOTAL</span>
                  <span className="text-4xl font-black text-white">{formatARS(cartTotal)}</span>
               </div>
               
               <div className="space-y-4 mb-6">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Cliente (Mayorista u Otro)</label>
                     <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition">
                        <option value="">Consumidor Final</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Método de Pago</label>
                     <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition">
                        <option value="cash">Efectivo 💵</option>
                        <option value="transfer">Transferencia Bancaria 🏦</option>
                        <option value="mercado_pago">Mercado Pago 📲</option>
                     </select>
                  </div>
               </div>

               <button onClick={handleSubmit} disabled={loading || cartItems.length === 0} className="w-full flex justify-center items-center gap-2 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-lg transition shadow-xl shadow-orange-500/20 active:scale-95">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : <><Check size={24}/> COBRAR Y DESCONTAR</>}
               </button>
               {isManualLots ? (
                  <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed tracking-wide">
                     El sistema descontará la facturación de los <strong>lotes específicos</strong> asignados.
                  </p>
               ) : (
                  <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed tracking-wide">
                     El sistema usará magia <strong>FIFO</strong> para descontar de las elaboraciones más añejas automáticamente.
                  </p>
               )}
            </div>
         </div>
      </div>

      {cartTotal > 0 && (
         <a href="#ticket-section" className="fixed bottom-20 left-4 right-4 bg-orange-500 text-white font-black p-4 rounded-xl shadow-[0_-5px_20px_-5px_rgba(249,115,22,0.5)] flex justify-between items-center lg:hidden z-40">
            <span>Ver Ticket Mágico</span>
            <span>{formatARS(cartTotal)} <ArrowRight size={18} className="inline ml-2"/></span>
         </a>
      )}
         {/* Loading Overlay */}
         {isPending && <LoadingOverlay message="Cobrando y actualizando stock..." />}

         {/* Toast Notification */}
         {toast && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-extrabold animate-in fade-in slide-in-from-top-4 duration-300 ${
               toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
               toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
               'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
               {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
               {toast.type === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
               {toast.type === 'info' && <Info size={18} className="text-blue-500 shrink-0" />}
               <span>{toast.message}</span>
            </div>
         )}
      </>
   )
}
