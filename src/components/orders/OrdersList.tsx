'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, MapPin, Check, Truck, X, Loader2, Trash2, Pencil, Plus, Minus, Navigation } from 'lucide-react'
import { updateOrderStatus, deleteOrderAction, updateOrderItemsAction } from '@/app/actions/orderActions'
import { updateClientAddressAction } from '@/app/actions/clientActions'
import { createDeliveryRoute } from '@/app/actions/logisticsActions'
import { openCashSessionAction, closeCashSessionAction } from '@/app/actions/cashActions'
import LoadingOverlay from '../layout/LoadingOverlay'
import { createPortal } from 'react-dom'

function Portal({ children }: { children: React.ReactNode }) {
   const [mounted, setMounted] = useState(false)
   useEffect(() => {
      setMounted(true)
      return () => setMounted(false)
   }, [])
   return mounted ? createPortal(children, document.body) : null
}


const formatARS = (amount: number) => {
   return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const formatOrderNumber = (order: any) => {
   if (order && (order.order_number !== undefined && order.order_number !== null)) {
      return `#${String(order.order_number).padStart(3, '0')}`
   }
   return `#${order.id.substring(0, 8)}`
}

export default function OrdersList({ 
   orders, 
   products = [], 
   variants = [],
   repartidores = [],
   activeSession
}: { 
   orders: any[], 
   products?: any[], 
   variants?: any[],
   repartidores?: any[],
   activeSession?: any
}) {
   const router = useRouter()
   const searchParams = useSearchParams()
   const [isPending, startTransition] = useTransition()
   const [loadingMessage, setLoadingMessage] = useState('Actualizando estado del pedido...')
   const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
   const [selectedGroupOrderIds, setSelectedGroupOrderIds] = useState<string[]>([])
   const [isEditingAddress, setIsEditingAddress] = useState(false)
   const [editAddressValue, setEditAddressValue] = useState('')

   // States for bulk selection
   const [checkedOrderIds, setCheckedOrderIds] = useState<string[]>([])
   const [bulkRepartidorId, setBulkRepartidorId] = useState('')
   const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)

   // Tab filter state
   const [activeTab, setActiveTab] = useState<'active' | 'delivered'>('active')

   useEffect(() => {
      if (searchParams?.get('tab') === 'delivered') {
         setActiveTab('delivered')
      } else {
         setActiveTab('active')
      }
   }, [searchParams])

   const filteredOrders = orders.filter(o => {
      if (activeTab === 'active') {
         return o.status === 'pending' || o.status === 'on_route' || o.status === 'ready'
      } else {
         if (activeSession) {
            return o.status === 'delivered' && o.cash_session_id === activeSession.id
         }
         return o.status === 'delivered'
      }
   })

   // States for daily cash session
   const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false)
   const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false)
   const [startingCashVal, setStartingCashVal] = useState('0')
   
   // Closing drawer inputs
   const [actualCashVal, setActualCashVal] = useState('')
   const [actualTransferVal, setActualTransferVal] = useState('')
   const [actualMpVal, setActualMpVal] = useState('')
   const [sessionNotes, setSessionNotes] = useState('')

   // States for editing order items
   const [isEditingItems, setIsEditingItems] = useState(false)
   const [editItemsList, setEditItemsList] = useState<any[]>([])
   const [addSelectorProductId, setAddSelectorProductId] = useState('')
   const [addSelectorVariantId, setAddSelectorVariantId] = useState('')

   const selectOrder = (order: any) => {
      setSelectedOrder(order)
      setSelectedGroupOrderIds([])
      setIsEditingAddress(false)
      setEditAddressValue(order.clients?.address || '')
      setIsEditingItems(false)
      setEditItemsList(order.order_items?.map((item: any) => ({
         id: item.id,
         productId: item.product_id,
         variantId: item.variant_id || null,
         qty: item.quantity,
         unitPrice: item.unit_price,
         name: item.products?.name,
         variantName: item.product_variants?.name
      })) || [])
   }

   const handleStatusChange = (orderId: string, newStatus: string) => {
      setLoadingMessage('Actualizando estado del pedido...')
      startTransition(async () => {
         const idsToUpdate = newStatus === 'on_route'
            ? [orderId, ...selectedGroupOrderIds]
            : orderId

         const res = await updateOrderStatus(idsToUpdate, newStatus)
         if (res.error) {
            alert(res.error)
         } else {
            // Update selected order details dynamically
            setSelectedOrder((prev: any) => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev)
            setSelectedGroupOrderIds([])
            router.refresh()
         }
      })
   }

   const handleDeleteOrder = (orderId: string) => {
      if (!confirm("¿Estás seguro de que querés eliminar este pedido? Se restaurará el stock físico de todos los productos y variantes asociados.")) return

      setLoadingMessage('Eliminando pedido...')
      startTransition(async () => {
         const res = await deleteOrderAction(orderId)
         if (res.error) {
            alert(res.error)
         } else {
            setSelectedOrder(null)
            router.refresh()
         }
      })
   }

   const handleSaveAddress = () => {
      if (!selectedOrder?.client_id) return

      setLoadingMessage('Guardando dirección...')
      startTransition(async () => {
         const res = await updateClientAddressAction(selectedOrder.client_id, editAddressValue)
         if (res.error) {
            alert(res.error)
         } else {
            setSelectedOrder((prev: any) => {
               if (!prev) return null
               return {
                  ...prev,
                  clients: {
                     ...prev.clients,
                     address: editAddressValue
                  }
               }
            })
            setIsEditingAddress(false)
            router.refresh()
         }
      })
   }

   // --- Items Editing Helpers ---
   const handleEditItemQty = (index: number, change: number) => {
      const newList = [...editItemsList]
      const newQty = Math.max(0.5, Number(newList[index].qty) + change)
      newList[index].qty = newQty
      setEditItemsList(newList)
   }

   const handleRemoveEditItem = (index: number) => {
      const newList = [...editItemsList]
      newList.splice(index, 1)
      setEditItemsList(newList)
   }

   const handleAddEditItem = () => {
      if (!addSelectorProductId) return
      
      const prod = products.find(p => p.id === addSelectorProductId)
      if (!prod) return
      
      let price = Number(prod.price || 0)
      let variantName = ''
      
      if (addSelectorVariantId) {
         const v = variants.find(varObj => varObj.id === addSelectorVariantId)
         if (v) {
            variantName = v.name
            if (v.price_override !== null && v.price_override !== undefined) {
               price = Number(v.price_override)
            }
         }
      }
      
      // Check if product/variant already exists in editing list
      const existingIndex = editItemsList.findIndex(
         item => item.productId === addSelectorProductId && 
         (item.variantId || null) === (addSelectorVariantId || null)
      )

      if (existingIndex !== -1) {
         handleEditItemQty(existingIndex, 1)
         setAddSelectorProductId('')
         setAddSelectorVariantId('')
         return
      }

      const newItem = {
         productId: addSelectorProductId,
         variantId: addSelectorVariantId || null,
         qty: 1,
         unitPrice: price,
         name: prod.name,
         variantName: variantName || null
      }

      setEditItemsList(prev => [...prev, newItem])
      setAddSelectorProductId('')
      setAddSelectorVariantId('')
   }

   const handleSaveItems = () => {
      if (editItemsList.length === 0) {
         alert("Tenés que tener al menos un ítem en el pedido.")
         return
      }

      setLoadingMessage('Guardando cambios del pedido...')
      startTransition(async () => {
         const res = await updateOrderItemsAction(selectedOrder.id, editItemsList.map(item => ({
            productId: item.productId,
            variantId: item.variantId || null,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice)
         })))

         if (res.error) {
            alert(res.error)
         } else {
            setSelectedOrder((prev: any) => {
               if (!prev) return null
               const newTotal = editItemsList.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0)
               return {
                  ...prev,
                  total_calc: newTotal,
                  order_items: editItemsList.map(item => ({
                     id: item.id || Math.random().toString(),
                     product_id: item.productId,
                     variant_id: item.variantId || null,
                     quantity: item.qty,
                     unit_price: item.unitPrice,
                     products: { name: item.name },
                     product_variants: item.variantName ? { name: item.variantName } : null
                  }))
               }
            })
            setIsEditingItems(false)
            router.refresh()
         }
      })
   }

   const handleBulkDispatch = () => {
      if (!bulkRepartidorId) return alert("Seleccioná el repartidor.")
      
      const ordersWithAddresses = orders
         .filter(o => checkedOrderIds.includes(o.id))
         .filter(o => o.clients?.address)
      
      if (ordersWithAddresses.length === 0) {
         alert("Ninguno de los pedidos seleccionados tiene dirección de entrega asignada.")
         return
      }

      setLoadingMessage('Generando reparto y ruta logística...')
      startTransition(async () => {
         const form = new FormData()
         form.append('repartidorId', bulkRepartidorId)
         
         const sortedOrderIds = ordersWithAddresses
            .sort((a, b) => {
               const addrA = a.clients?.address || ''
               const addrB = b.clients?.address || ''
               return addrA.localeCompare(addrB)
            })
            .map(o => o.id)

         form.append('orderIds', JSON.stringify(sortedOrderIds))

         const res = await createDeliveryRoute(form)
         if (res.error) {
            alert(res.error)
         } else {
            alert(`✅ Ruta de reparto despachada con éxito para ${sortedOrderIds.length} pedidos.`)
            setCheckedOrderIds([])
            setBulkRepartidorId('')
            setIsDispatchModalOpen(false)
            router.refresh()
         }
      })
   }

   const handleBulkMarkDelivered = () => {
      if (!confirm(`¿Querés marcar los ${checkedOrderIds.length} pedidos seleccionados como Entregados?`)) return

      setLoadingMessage('Entregando pedidos...')
      startTransition(async () => {
         const res = await updateOrderStatus(checkedOrderIds, 'delivered')
         if (res.error) {
            alert(res.error)
         } else {
            setCheckedOrderIds([])
            router.refresh()
         }
      })
   }

   const toggleBulkSelection = (id: string) => {
      setCheckedOrderIds(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id])
   }

   const toggleSelectAllPending = () => {
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'ready')
      const allSelected = pendingOrders.every(o => checkedOrderIds.includes(o.id))
      
      if (allSelected) {
         setCheckedOrderIds(prev => prev.filter(id => !pendingOrders.some(po => po.id === id)))
      } else {
         const pendingIds = pendingOrders.map(o => o.id)
         setCheckedOrderIds(prev => Array.from(new Set([...prev, ...pendingIds])))
      }
   }

   const handleOpenSession = () => {
      const startingCash = parseFloat(startingCashVal)
      if (isNaN(startingCash) || startingCash < 0) {
         alert("Ingresá un monto inicial de caja válido (mayor o igual a 0).")
         return
      }

      setLoadingMessage('Abriendo caja...')
      startTransition(async () => {
         const res = await openCashSessionAction(startingCash)
         if (res.error) {
            alert(res.error)
         } else {
            setIsOpenSessionModalOpen(false)
            setStartingCashVal('0')
            router.refresh()
         }
      })
   }

   const handleCloseSession = () => {
      const actualCash = parseFloat(actualCashVal)
      const actualTransfer = parseFloat(actualTransferVal)
      const actualMp = parseFloat(actualMpVal)

      if (isNaN(actualCash) || actualCash < 0 ||
          isNaN(actualTransfer) || actualTransfer < 0 ||
          isNaN(actualMp) || actualMp < 0) {
         alert("Por favor, ingresá montos reales contados válidos (mayor o igual a 0) para todas las categorías.")
         return
      }

      setLoadingMessage('Cerrando caja y realizando arqueo...')
      startTransition(async () => {
         const res = await closeCashSessionAction(
            actualCash,
            actualTransfer,
            actualMp,
            sessionNotes
         )
         if (res.error) {
            alert(res.error)
         } else {
            setIsCloseSessionModalOpen(false)
            setActualCashVal('')
            setActualTransferVal('')
            setActualMpVal('')
            setSessionNotes('')
            router.refresh()
         }
      })
   }

   // Compute metrics for active session if it exists
   const sessionOrders = activeSession 
      ? orders.filter(o => o.status === 'delivered' && o.cash_session_id === activeSession.id)
      : []

   let expectedCash = 0
   let expectedTransfer = 0
   let expectedMp = 0

   sessionOrders.forEach(o => {
      const val = Number(o.total_calc || 0)
      if (o.payment_method === 'cash') {
         expectedCash += val
      } else if (o.payment_method === 'transfer') {
         expectedTransfer += val
      } else {
         expectedMp += val
      }
   })

   const totalExpectedDrawerCash = activeSession ? (Number(activeSession.starting_cash || 0) + expectedCash) : 0

   return (
      <>
         {/* Barra de Estado de Caja (Arqueo Diario) */}
         <div className="mb-6">
            {activeSession ? (
               <div className="bg-emerald-50 border border-emerald-200 p-4 md:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-extrabold text-emerald-800 text-sm md:text-base uppercase tracking-wider">Caja Abierta Diario</span>
                        <span className="text-[10px] bg-emerald-250 text-emerald-800 font-bold px-2 py-0.5 rounded-full">En Curso</span>
                     </div>
                     <p className="text-xs text-emerald-700 font-medium font-semibold">
                        Abierta el {new Date(activeSession.opened_at).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                     </p>
                     <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-slate-650 font-bold">
                        <span>💵 Inicial: <strong className="text-slate-850">{formatARS(activeSession.starting_cash)}</strong></span>
                        <span>💰 Ventas Efectivo: <strong className="text-slate-850">{formatARS(expectedCash)}</strong></span>
                        <span>🏦 Transf: <strong className="text-slate-850">{formatARS(expectedTransfer)}</strong></span>
                        <span>📲 MP: <strong className="text-slate-850">{formatARS(expectedMp)}</strong></span>
                        <span className="border-t sm:border-t-0 sm:border-l border-slate-300 pt-1 sm:pt-0 sm:pl-2">Total Caja Estimado: <strong className="text-emerald-700">{formatARS(totalExpectedDrawerCash)}</strong></span>
                     </div>
                  </div>
                  <button 
                     onClick={() => {
                        setActualCashVal('')
                        setActualTransferVal('')
                        setActualMpVal('')
                        setSessionNotes('')
                        setIsCloseSessionModalOpen(true)
                     }}
                     className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/10 transition active:scale-95 shrink-0"
                  >
                     CERRAR CAJA / ARQUEO 📊
                  </button>
               </div>
            ) : (
               <div className="bg-rose-50 border border-rose-200 p-4 md:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-extrabold text-rose-800 text-sm md:text-base uppercase tracking-wider">Caja Cerrada</span>
                        <span className="text-[10px] bg-rose-250 text-rose-800 font-bold px-2 py-0.5 rounded-full">Requerido</span>
                     </div>
                     <p className="text-xs text-rose-700 font-medium font-semibold">
                        ⚠️ Antes de iniciar repartos o registrar entregas locales, debés abrir la caja diaria.
                     </p>
                  </div>
                  <button 
                     onClick={() => setIsOpenSessionModalOpen(true)}
                     className="w-full md:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/10 transition active:scale-95 shrink-0"
                  >
                     ABRIR CAJA DIARIA 🔓
                  </button>
               </div>
            )}
         </div>

         {/* Tabs Selector */}
         <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6 shrink-0">
            <button 
               onClick={() => {
                  setActiveTab('active')
                  setCheckedOrderIds([])
               }}
               className={`px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === 'active' 
                     ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' 
                     : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-250/50'
               }`}
            >
               <Truck size={16}/>
               Pedidos Activos
               <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-250 text-slate-700'
               }`}>
                  {orders.filter(o => o.status !== 'delivered').length}
               </span>
            </button>
            <button 
               onClick={() => {
                  setActiveTab('delivered')
                  setCheckedOrderIds([])
               }}
               className={`px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === 'delivered' 
                     ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                     : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-250/50'
               }`}
            >
               <Check size={16}/>
               Entregados (Historial)
               <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  activeTab === 'delivered' ? 'bg-white/20 text-white' : 'bg-slate-250 text-slate-700'
               }`}>
                  {orders.filter(o => {
                     if (activeSession) {
                        return o.status === 'delivered' && o.cash_session_id === activeSession.id
                     }
                     return o.status === 'delivered'
                  }).length}
               </span>
            </button>
         </div>

         {/* Vista Mobile (Tarjetas) */}
         <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredOrders.length === 0 ? (
               <div className="text-center py-12 text-slate-400 italic text-sm bg-slate-50 border border-slate-200/50 rounded-2xl">
                  No hay pedidos {activeTab === 'active' ? 'activos' : 'entregados'}.
               </div>
            ) : filteredOrders.map(o => (
               <div 
                  key={o.id} 
                  onClick={() => selectOrder(o)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition cursor-pointer flex flex-col gap-3 text-left"
               >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                     <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <input 
                           type="checkbox"
                           checked={checkedOrderIds.includes(o.id)}
                           disabled={o.status === 'delivered' || !activeSession}
                           onChange={() => toggleBulkSelection(o.id)}
                           className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-slate-800">{formatOrderNumber(o)}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                           o.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                           o.status === 'on_route' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                           o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                           'bg-slate-100 text-slate-800'
                        }`}>{
                           o.status === 'pending' ? 'Pendiente' :
                           o.status === 'on_route' ? 'En Reparto 🚚' :
                           o.status === 'delivered' ? 'Entregado' : o.status
                        }</span>
                        <button 
                           onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOrder(o.id)
                           }}
                           className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition"
                           title="Eliminar Pedido"
                        >
                           <Trash2 size={16}/>
                        </button>
                     </div>
                  </div>
                  <div>
                     <p className="font-semibold text-slate-700 text-lg">{o.clients?.name || 'Consumidor Final (Anónimo)'}</p>
                     {o.scheduled_date && (
                        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg w-max font-bold mt-1 inline-flex items-center gap-1 shadow-sm">
                           📅 Entrega: {new Date(o.scheduled_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                     )}
                     {o.clients?.address && (
                        <p className="text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1">
                           📍 {o.clients.address}
                        </p>
                     )}
                     <p className="text-slate-500 text-sm mt-1 border-t border-slate-50 pt-2 flex justify-between">
                        <span>{o.payment_method === 'cash' ? '💵 Efectivo' : o.payment_method === 'transfer' ? '🏦 Transf.' : '📲 MP'}</span>
                        <span className="font-black text-slate-800 text-lg">{formatARS(o.total_calc)}</span>
                     </p>
                  </div>
               </div>
            ))}
         </div>

         {/* Vista Desktop (Tabla) */}
         <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-sm font-bold text-slate-500 p-4">
                     <td className="p-4 w-12">
                        <input 
                           type="checkbox"
                           disabled={!activeSession}
                           checked={orders.filter(o => o.status === 'pending' || o.status === 'ready').length > 0 && orders.filter(o => o.status === 'pending' || o.status === 'ready').every(o => checkedOrderIds.includes(o.id))}
                           onChange={toggleSelectAllPending}
                           className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                           title={!activeSession ? "Abrí la caja para seleccionar pedidos" : "Seleccionar todos los pendientes"}
                        />
                     </td>
                     <td className="p-4">ID Pedido</td>
                     <td className="p-4">Cliente</td>
                     <td className="p-4">Dirección de Entrega</td>
                     <td className="p-4">Estado</td>
                     <td className="p-4">Método Pago</td>
                     <td className="p-4 text-right">Total $</td>
                     <td className="p-4 text-right">Acciones</td>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                     <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic text-sm bg-slate-50">
                           No hay pedidos {activeTab === 'active' ? 'activos' : 'entregados'}.
                        </td>
                     </tr>
                  ) : filteredOrders.map(o => (
                     <tr 
                        key={o.id} 
                        onClick={() => selectOrder(o)}
                        className="border-b border-slate-100 hover:bg-orange-50/50 transition cursor-pointer"
                     >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                           <input 
                              type="checkbox"
                              checked={checkedOrderIds.includes(o.id)}
                              disabled={o.status === 'delivered' || !activeSession}
                              onChange={() => toggleBulkSelection(o.id)}
                              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                           />
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">{formatOrderNumber(o)}</td>
                        <td className="p-4 font-semibold text-slate-700">
                           <div>{o.clients?.name || 'Consumidor Final'}</div>
                           {o.scheduled_date && (
                              <span className="inline-block text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg font-bold mt-1 shadow-sm">
                                 📅 {new Date(o.scheduled_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                           )}
                        </td>
                        <td className="p-4 text-slate-600 text-sm font-medium">
                           {o.clients?.address ? (
                              <span className="inline-flex items-center gap-1">
                                 {o.clients.address} 📍
                              </span>
                           ) : (
                              <span className="text-slate-400 italic">Retira en local</span>
                           )}
                        </td>
                        <td className="p-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              o.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              o.status === 'on_route' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-800'
                           }`}>{
                              o.status === 'pending' ? 'Pendiente' :
                              o.status === 'on_route' ? 'En Reparto 🚚' :
                              o.status === 'delivered' ? 'Entregado' : o.status
                           }</span>
                        </td>
                        <td className="p-4 text-slate-500 text-sm font-medium">{o.payment_method === 'cash' ? 'Efectivo' : o.payment_method === 'transfer' ? 'Transferencia' : 'Mercado Pago'}</td>
                        <td className="p-4 text-right font-black text-slate-800 text-lg">{formatARS(o.total_calc)}</td>
                        <td className="p-4 text-right">
                           <button 
                              onClick={(e) => {
                                 e.stopPropagation()
                                 handleDeleteOrder(o.id)
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition"
                              title="Eliminar Pedido"
                           >
                              <Trash2 size={16}/>
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* --- DETALLE MODAL --- */}
         {selectedOrder && (
            <Portal>
               <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 text-left">
                     {/* Header */}
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <div>
                           <h3 className="font-extrabold text-xl text-slate-800">
                              Detalle del Pedido {formatOrderNumber(selectedOrder)}
                           </h3>
                           <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                              Creado: {new Date(selectedOrder.created_at).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <button 
                              onClick={() => handleDeleteOrder(selectedOrder.id)} 
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                              title="Eliminar Pedido"
                           >
                              <Trash2 size={20}/>
                           </button>
                           <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
                              <X size={20}/>
                           </button>
                        </div>
                     </div>

                     {/* Body */}
                     <div className="p-6 pb-8 overflow-y-auto flex-1 space-y-5">
                        
                        {/* Info Cliente */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Información de Entrega</h4>
                           <div>
                              <p className="font-extrabold text-slate-800 text-lg">{selectedOrder.clients?.name || 'Consumidor Final (Anónimo)'}</p>
                              {selectedOrder.scheduled_date && (
                                 <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl w-max font-bold mt-1 shadow-sm">
                                    📅 Entrega Programada: {new Date(selectedOrder.scheduled_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                 </p>
                              )}
                              {selectedOrder.clients?.phone_number && (
                                 <a href={`tel:${selectedOrder.clients.phone_number}`} className="text-sm font-bold text-orange-500 hover:underline inline-flex items-center gap-1.5 mt-1">
                                    <Phone size={14}/> {selectedOrder.clients.phone_number}
                                 </a>
                              )}
                           </div>

                           {isEditingAddress ? (
                              <div className="space-y-3 pt-2 border-t border-slate-200/50">
                                 <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Dirección de Envío</label>
                                 <div className="flex flex-col gap-2">
                                    <input 
                                       type="text"
                                       value={editAddressValue}
                                       onChange={(e) => setEditAddressValue(e.target.value)}
                                       className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 font-semibold"
                                       placeholder="Ej. Independencia 2825, Carapachay"
                                    />
                                    <div className="flex gap-2">
                                       <button 
                                          onClick={handleSaveAddress}
                                          className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
                                       >
                                          Guardar Dirección
                                       </button>
                                       <button 
                                          onClick={() => {
                                             setIsEditingAddress(false)
                                             setEditAddressValue(selectedOrder.clients?.address || '')
                                          }}
                                          className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition"
                                       >
                                          Cancelar
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ) : selectedOrder.clients?.address ? (
                              <div className="space-y-3 pt-1 border-t border-slate-200/50">
                                 <div className="flex justify-between items-start gap-2">
                                    <p className="text-slate-700 font-bold text-sm flex items-start gap-1">
                                       <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5"/> 
                                       <span>{selectedOrder.clients.address}</span>
                                    </p>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                       {selectedOrder.client_id && (
                                          <button 
                                             onClick={() => {
                                                setEditAddressValue(selectedOrder.clients?.address || '')
                                                setIsEditingAddress(true)
                                             }}
                                             className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                                             title="Editar Dirección"
                                          >
                                             <Pencil size={14}/>
                                          </button>
                                       )}
                                       <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.clients.address)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-black text-blue-500 hover:underline"
                                       >
                                          Maps ↗
                                       </a>
                                    </div>
                                 </div>
                                 
                                 {/* Maps Preview embed */}
                                 <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                                    <iframe 
                                       width="100%" 
                                       height="160" 
                                       style={{ border: 0 }} 
                                       loading="lazy" 
                                       allowFullScreen 
                                       src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedOrder.clients.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                    ></iframe>
                                 </div>
                              </div>
                           ) : (
                              <div className="pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                 <p className="text-slate-400 font-bold text-sm italic">
                                    Retiro directo por el local
                                 </p>
                                 {selectedOrder.client_id && (
                                    <button 
                                       onClick={() => {
                                          setEditAddressValue('')
                                          setIsEditingAddress(true)
                                       }}
                                       className="text-xs font-black text-orange-500 hover:underline text-left"
                                    >
                                       + Agregar Dirección de Envío 🚚
                                    </button>
                                 )}
                              </div>
                           )}
                        </div>

                        {/* Detalle Productos */}
                        <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Productos Facturados</h4>
                              {!isEditingItems && selectedOrder.status !== 'delivered' && (
                                 <button 
                                    onClick={() => setIsEditingItems(true)} 
                                    className="text-xs font-black text-orange-500 hover:underline inline-flex items-center gap-1"
                                 >
                                    <Pencil size={12}/> Editar Ítems
                                 </button>
                              )}
                           </div>
                           
                           {isEditingItems ? (
                              <div className="space-y-3">
                                 <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                                    {editItemsList.map((item: any, idx: number) => (
                                       <div key={idx} className="p-4 bg-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-sm">
                                          <div>
                                             <p className="font-extrabold text-slate-800">{item.name}</p>
                                             {item.variantName && (
                                                <p className="text-xs text-slate-500 font-bold">{item.variantName}</p>
                                             )}
                                             <p className="text-xs text-slate-400 font-bold mt-0.5">{formatARS(item.unitPrice)} c/u</p>
                                          </div>
                                          <div className="flex items-center justify-between sm:justify-end gap-4">
                                             {/* Controles cantidad */}
                                             <div className="flex items-center gap-2">
                                                <button 
                                                   onClick={() => handleEditItemQty(idx, -1)} 
                                                   className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition font-black flex items-center justify-center active:scale-90"
                                                >
                                                   <Minus size={12}/>
                                                </button>
                                                <input 
                                                   type="number"
                                                   step="any"
                                                   min="0"
                                                   value={item.qty}
                                                   onChange={(e) => {
                                                      const val = parseFloat(e.target.value)
                                                      const newList = [...editItemsList]
                                                      newList[idx].qty = isNaN(val) ? 0 : val
                                                      setEditItemsList(newList)
                                                   }}
                                                   className="w-16 px-1 py-1 border border-slate-200 rounded text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                                                />
                                                <button 
                                                   onClick={() => handleEditItemQty(idx, 1)} 
                                                   className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition font-black flex items-center justify-center active:scale-90"
                                                >
                                                   <Plus size={12}/>
                                                </button>
                                             </div>
                                             {/* Subtotal y Borrar */}
                                             <div className="flex items-center gap-3 min-w-[110px] justify-end">
                                                <span className="font-black text-slate-800 text-base">{formatARS(item.qty * item.unitPrice)}</span>
                                                <button 
                                                   onClick={() => handleRemoveEditItem(idx)} 
                                                   className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                   title="Eliminar ítem"
                                                >
                                                   <Trash2 size={16}/>
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                    {editItemsList.length === 0 && (
                                       <div className="p-6 text-center text-slate-400 italic text-xs bg-white">
                                          No hay ítems en el pedido. Agregá uno abajo.
                                       </div>
                                    )}
                                 </div>

                                 {/* Selector de nuevo producto/variante */}
                                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-normal">
                                       + Agregar Producto al Pedido
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                       <div>
                                          <select 
                                             value={addSelectorProductId} 
                                             onChange={(e) => {
                                                setAddSelectorProductId(e.target.value)
                                                setAddSelectorVariantId('')
                                             }} 
                                             className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                                          >
                                             <option value="">Seleccionar Producto...</option>
                                             {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                             ))}
                                          </select>
                                       </div>
                                       
                                       {addSelectorProductId && products.find(p => p.id === addSelectorProductId) && (
                                          <div>
                                             {variants.filter(v => v.product_id === addSelectorProductId).length > 0 ? (
                                                <select 
                                                   value={addSelectorVariantId} 
                                                   onChange={(e) => setAddSelectorVariantId(e.target.value)} 
                                                   className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                                                >
                                                   <option value="">Seleccionar Sabor/Variante...</option>
                                                   {variants.filter(v => v.product_id === addSelectorProductId).map(v => (
                                                      <option key={v.id} value={v.id}>{v.name} ({formatARS(v.price_override || products.find(p => p.id === addSelectorProductId)?.price || 0)})</option>
                                                   ))}
                                                </select>
                                             ) : (
                                                <div className="text-xs text-slate-400 font-bold p-2.5 italic bg-white border border-slate-100 rounded-xl">
                                                   Sin variantes (Precio: {formatARS(products.find(p => p.id === addSelectorProductId)?.price || 0)})
                                                </div>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                    
                                    <button 
                                       onClick={handleAddEditItem}
                                       disabled={!addSelectorProductId || (variants.filter(v => v.product_id === addSelectorProductId).length > 0 && !addSelectorVariantId)}
                                       className="w-full py-2.5 bg-slate-900 disabled:opacity-50 text-white font-black text-xs rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                                    >
                                       <Plus size={14}/> Agregar al Pedido
                                    </button>
                                 </div>

                                 {/* Botones de acción de edición */}
                                 <div className="flex gap-2 pt-2">
                                    <button 
                                       onClick={handleSaveItems}
                                       className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-sm transition active:scale-95 duration-100 flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                                    >
                                       <Check size={16}/> Guardar Cambios
                                    </button>
                                    <button 
                                       onClick={() => {
                                          setIsEditingItems(false)
                                          // Revert list
                                          setEditItemsList(selectedOrder.order_items?.map((item: any) => ({
                                             id: item.id,
                                             productId: item.product_id,
                                             variantId: item.variant_id || null,
                                             qty: item.quantity,
                                             unitPrice: item.unit_price,
                                             name: item.products?.name,
                                             variantName: item.product_variants?.name
                                          })) || [])
                                       }}
                                       className="flex-1 py-3 bg-slate-200 text-slate-700 font-black rounded-xl text-sm hover:bg-slate-300 transition flex items-center justify-center gap-1.5"
                                    >
                                       <X size={16}/> Cancelar
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                 {selectedOrder.order_items?.map((item: any) => (
                                    <div key={item.id} className="p-4 bg-white flex justify-between items-center text-sm">
                                       <div>
                                          <p className="font-extrabold text-slate-800">{item.products?.name}</p>
                                          {item.product_variants?.name && (
                                             <p className="text-xs text-slate-500 font-bold">{item.product_variants.name}</p>
                                          )}
                                          <p className="text-xs text-slate-400 font-bold mt-0.5">{formatARS(item.unit_price)} x {item.quantity}</p>
                                       </div>
                                       <p className="font-black text-slate-800 text-base">{formatARS(item.quantity * item.unit_price)}</p>
                                    </div>
                                 ))}
                              </div>
                           )}

                           {/* Pago y Total */}
                           <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl">
                              <div>
                                 <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Metodo de Pago</span>
                                 <span className="font-bold text-sm capitalize">
                                    {selectedOrder.payment_method === 'cash' ? '💵 Efectivo' : selectedOrder.payment_method === 'transfer' ? '🏦 Transferencia' : '📲 Mercado Pago'}
                                 </span>
                              </div>
                              <div className="text-right">
                                 <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Cobrado</span>
                                 <span className="text-2xl font-black text-orange-400">{formatARS(selectedOrder.total_calc)}</span>
                              </div>
                           </div>
                        </div>

                        {/* Botón de Acción Principal y Selección de Grupo */}
                        <div className="pt-2 text-left">
                           {!activeSession && selectedOrder.status !== 'delivered' ? (
                              <div className="p-4 bg-rose-50 border border-rose-250 text-rose-800 rounded-2xl text-center font-bold text-sm">
                                 ⚠️ Caja Cerrada: Debés abrir la caja diaria en la sección de pedidos para poder registrar la entrega o iniciar repartos.
                              </div>
                           ) : selectedOrder.status === 'pending' && (
                              <>
                                 {selectedOrder.clients?.address ? (
                                    <div className="space-y-4">
                                       <button 
                                          onClick={() => handleStatusChange(selectedOrder.id, 'on_route')}
                                          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 transition active:scale-95 duration-150"
                                       >
                                          <Truck size={22}/> INICIAR REPARTO 🚚
                                       </button>

                                       {/* Listado de otros pedidos pendientes para agrupar */}
                                       {orders.filter(o => o.id !== selectedOrder.id && o.status === 'pending' && o.clients?.address).length > 0 && (
                                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                                             <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-normal">
                                                ¿Querés despachar otros pedidos pendientes en el mismo reparto?
                                             </h5>
                                             <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {orders
                                                   .filter(o => o.id !== selectedOrder.id && o.status === 'pending' && o.clients?.address)
                                                   .map(o => {
                                                      const isChecked = selectedGroupOrderIds.includes(o.id)
                                                      return (
                                                         <label 
                                                            key={o.id}
                                                            className="flex items-start gap-3 p-2.5 bg-white border border-slate-100 hover:border-orange-300 rounded-xl cursor-pointer transition select-none text-left"
                                                         >
                                                            <input 
                                                               type="checkbox"
                                                               checked={isChecked}
                                                               onChange={(e) => {
                                                                  if (e.target.checked) {
                                                                     setSelectedGroupOrderIds(prev => [...prev, o.id])
                                                                  } else {
                                                                     setSelectedGroupOrderIds(prev => prev.filter(id => id !== o.id))
                                                                  }
                                                               }}
                                                               className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500 shrink-0"
                                                            />
                                                            <div className="text-xs font-medium text-slate-700">
                                                               <span className="font-mono font-bold text-slate-900">#{o.id.substring(0,8)}</span> - {o.clients?.name}
                                                               <p className="text-[10px] text-slate-400 mt-0.5 truncate">{o.clients?.address}</p>
                                                            </div>
                                                         </label>
                                                      )
                                                   })
                                                }
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 ) : (
                                    <button 
                                       onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                                       className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition active:scale-95 duration-150"
                                    >
                                       <Check size={22}/> ENTREGAR PEDIDO EN LOCAL ✅
                                    </button>
                                 )}
                              </>
                           )}
                           {selectedOrder.status === 'on_route' && (
                              <button 
                                 onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                                 className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition active:scale-95 duration-150"
                              >
                                 <Check size={22}/> MARCAR COMO ENTREGADO ✅
                              </button>
                           )}
                           {selectedOrder.status === 'delivered' && (
                              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 justify-center font-bold text-sm">
                                 <Check size={18}/> ¡Este pedido ya fue entregado y cobrado!
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </Portal>
         )}

         {/* --- BARRA DE ACCIONES POR LOTE --- */}
         {checkedOrderIds.length > 0 && (
            <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-2xl flex flex-col gap-4 border border-slate-850 animate-in slide-in-from-bottom-6 z-55">
               <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
                  <div>
                     <h4 className="font-extrabold text-base text-white">Despacho por Lote</h4>
                     <p className="text-xs font-bold text-slate-400 mt-0.5">{checkedOrderIds.length} pedidos seleccionados</p>
                  </div>
                  <button 
                     onClick={() => setCheckedOrderIds([])}
                     className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                     title="Limpiar Selección"
                  >
                     <X size={16}/>
                  </button>
               </div>

               {/* Route Sequence sorted by address */}
               <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar text-xs">
                  <span className="font-black text-slate-500 uppercase tracking-widest block mb-1">Secuencia por Direcciones (Optimizado):</span>
                  {orders
                     .filter(o => checkedOrderIds.includes(o.id))
                     .sort((a, b) => {
                        const addrA = a.clients?.address || ''
                        const addrB = b.clients?.address || ''
                        return addrA.localeCompare(addrB)
                     })
                     .map((o, idx) => (
                        <div key={o.id} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                           <div className="truncate pr-2">
                              <span className="font-bold text-slate-400">{idx + 1}. </span>
                              <span className="font-extrabold text-white">{o.clients?.address || 'Retiro en Local'}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate font-medium">{o.clients?.name || 'Cliente Ocasional'} ({formatOrderNumber(o)})</p>
                           </div>
                           <span className="font-bold text-emerald-500 shrink-0">{formatARS(o.total_calc)}</span>
                        </div>
                     ))}
               </div>

               {/* Combined Route link (only if there are addresses) */}
               {orders.filter(o => checkedOrderIds.includes(o.id) && o.clients?.address).length > 0 && (
                  <a 
                     href={(() => {
                        const addresses = orders
                           .filter(o => checkedOrderIds.includes(o.id) && o.clients?.address)
                           .sort((a, b) => (a.clients?.address || '').localeCompare(b.clients?.address || ''))
                           .map(o => o.clients.address)
                        const destination = encodeURIComponent(addresses[addresses.length - 1])
                        const waypoints = addresses.slice(0, -1).map(encodeURIComponent).join('%7C')
                        return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`
                     })()}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="py-2.5 px-3 bg-blue-900/40 border border-blue-800/50 hover:bg-blue-900/60 rounded-xl font-bold text-xs text-blue-300 flex items-center justify-center gap-1.5 transition active:scale-95 duration-100"
                  >
                     <MapPin size={14} className="text-blue-400" />
                     Ver Ruta Completa en Maps ↗
                  </a>
               )}

               {/* Action triggers */}
               <div className="space-y-3 pt-2 border-t border-slate-800 shrink-0">
                  {isDispatchModalOpen ? (
                     <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Conductor (Repartidor)</label>
                        <div className="flex flex-col gap-2">
                           <select 
                              value={bulkRepartidorId}
                              onChange={e => setBulkRepartidorId(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-orange-500 transition"
                           >
                              <option value="">-- Asignar Cadete Disponible --</option>
                              {repartidores.map((r: any) => (
                                 <option key={r.id} value={r.id}>{r.full_name}</option>
                              ))}
                           </select>
                           
                           <div className="flex gap-2">
                              <button 
                                 onClick={handleBulkDispatch}
                                 disabled={!bulkRepartidorId}
                                 className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-xl text-xs transition active:scale-95 duration-100 flex items-center justify-center gap-1.5"
                              >
                                 <Navigation size={12}/> Confirmar Carga
                              </button>
                              <button 
                                 onClick={() => {
                                    setIsDispatchModalOpen(false)
                                    setBulkRepartidorId('')
                                 }}
                                 className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold rounded-xl text-xs transition"
                              >
                                 Atrás
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="flex gap-2">
                        <button 
                           onClick={() => setIsDispatchModalOpen(true)}
                           disabled={orders.filter(o => checkedOrderIds.includes(o.id) && o.clients?.address).length === 0}
                           className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 duration-100 shadow-md shadow-orange-500/10"
                        >
                           <Truck size={14}/> Despachar Reparto
                        </button>
                        <button 
                           onClick={handleBulkMarkDelivered}
                           className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 duration-100 border border-slate-700"
                        >
                           <Check size={14}/> Entregados (Local)
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* --- MODAL ABRIR CAJA --- */}
         {isOpenSessionModalOpen && (
            <Portal>
               <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-8 duration-300 text-left">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                           <h3 className="font-extrabold text-xl text-slate-800">Apertura de Caja Diario</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ingresá el saldo inicial en efectivo</p>
                        </div>
                        <button 
                           onClick={() => setIsOpenSessionModalOpen(false)}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"
                        >
                           <X size={20}/>
                        </button>
                     </div>

                     <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                           <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Monto Inicial en Efectivo ($)</label>
                           <input 
                              type="number"
                              min="0"
                              value={startingCashVal}
                              onChange={(e) => setStartingCashVal(e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 font-semibold"
                              placeholder="Ej: 15000"
                           />
                           <p className="text-[10px] text-slate-400 font-medium font-semibold">El efectivo de reserva disponible en la caja física al comenzar el día.</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <button 
                              onClick={handleOpenSession}
                              className="flex-1 py-3 bg-orange-50 hover:bg-orange-600 text-white font-black rounded-xl text-sm transition active:scale-95 duration-100 flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                           >
                              <Check size={16}/> Confirmar Apertura
                           </button>
                           <button 
                              onClick={() => setIsOpenSessionModalOpen(false)}
                              className="flex-1 py-3 bg-slate-250 text-slate-700 font-black rounded-xl text-sm hover:bg-slate-350 transition flex items-center justify-center gap-1.5"
                           >
                              Cancelar
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </Portal>
         )}

         {/* --- MODAL CERRAR CAJA (ARQUEO) --- */}
         {isCloseSessionModalOpen && activeSession && (
            <Portal>
               <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 text-left">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                           <h3 className="font-extrabold text-xl text-slate-800">Cierre de Caja y Arqueo Diario</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sesión: {new Date(activeSession.opened_at).toLocaleDateString('es-AR')}</p>
                        </div>
                        <button 
                           onClick={() => setIsCloseSessionModalOpen(false)}
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"
                        >
                           <X size={20}/>
                        </button>
                     </div>

                     <div className="p-6 overflow-y-auto space-y-4">
                        {/* Resumen del sistema */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                           <h4 className="font-extrabold text-slate-700 uppercase tracking-wider">Métricas Esperadas por Sistema</h4>
                           <div className="grid grid-cols-2 gap-2 text-slate-650 font-bold">
                              <div>Efectivo Inicial:</div>
                              <div className="text-right text-slate-800">{formatARS(activeSession.starting_cash)}</div>
                              
                              <div>Ventas Efectivo:</div>
                              <div className="text-right text-slate-800">{formatARS(expectedCash)}</div>

                              <div className="border-t border-slate-200 pt-1 font-black text-slate-700">Total en Efectivo Estimado:</div>
                              <div className="border-t border-slate-200 pt-1 text-right font-black text-emerald-600">{formatARS(totalExpectedDrawerCash)}</div>

                              <div className="border-t border-slate-250/50 pt-1">Ventas Transferencias:</div>
                              <div className="border-t border-slate-250/50 pt-1 text-right text-slate-850">{formatARS(expectedTransfer)}</div>

                              <div>Ventas Mercado Pago:</div>
                              <div className="text-right text-slate-850">{formatARS(expectedMp)}</div>
                           </div>
                        </div>

                        {/* Inputs de conteo real */}
                        <div className="space-y-3">
                           <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest leading-normal">
                              Ingrese los montos reales contados
                           </h4>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Efectivo Real ($)</label>
                                 <input 
                                    type="number"
                                    min="0"
                                    value={actualCashVal}
                                    onChange={(e) => setActualCashVal(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="Contado"
                                 />
                              </div>
                              <div className="space-y-1">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Transf. Real ($)</label>
                                 <input 
                                    type="number"
                                    min="0"
                                    value={actualTransferVal}
                                    onChange={(e) => setActualTransferVal(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="Banco"
                                 />
                              </div>
                              <div className="space-y-1">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">MP Real ($)</label>
                                 <input 
                                    type="number"
                                    min="0"
                                    value={actualMpVal}
                                    onChange={(e) => setActualMpVal(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    placeholder="Mercado Pago"
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Diferencias en tiempo real */}
                        {actualCashVal !== '' && (
                           <div className="p-3.5 rounded-xl border flex justify-between items-center text-xs font-extrabold transition duration-200 bg-slate-50">
                              <span>Diferencia Efectivo Contado vs Estimado:</span>
                              {(() => {
                                 const currentActualCash = parseFloat(actualCashVal) || 0
                                 const diff = currentActualCash - totalExpectedDrawerCash
                                 if (diff === 0) return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">¡Cuadra perfectamente! ($0)</span>
                                 if (diff > 0) return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Sobrante de {formatARS(diff)}</span>
                                 return <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-250">Faltante de {formatARS(Math.abs(diff))}</span>
                              })()}
                           </div>
                        )}

                        {/* Notas */}
                        <div className="space-y-1.5">
                           <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Notas / Observaciones del Arqueo</label>
                           <textarea 
                              rows={2}
                              value={sessionNotes}
                              onChange={(e) => setSessionNotes(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-semibold"
                              placeholder="Ej: Faltaron $50 por diferencia de vueltos, o se retiró efectivo para compras..."
                           />
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                           <button 
                              onClick={handleCloseSession}
                              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition active:scale-95 duration-100 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
                           >
                              <Check size={16}/> Cerrar Caja y Registrar Arqueo
                           </button>
                           <button 
                              onClick={() => setIsCloseSessionModalOpen(false)}
                              className="flex-1 py-3 bg-slate-250 text-slate-700 font-black rounded-xl text-sm hover:bg-slate-350 transition"
                           >
                              Volver
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </Portal>
         )}

         {isPending && <LoadingOverlay message={loadingMessage} />}
      </>
   )
}
