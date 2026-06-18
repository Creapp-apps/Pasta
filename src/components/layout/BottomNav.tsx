'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Package, BarChart3, ShoppingCart, Menu, Plus, X, Wheat, Minus, Loader2, User, Printer, CheckCircle2, AlertCircle, Info, UtensilsCrossed, Users, Truck, Factory, CreditCard, Settings, LogOut, RefreshCw, Calendar } from 'lucide-react'
import { quickAdjustStockAction, quickPurchaseInsumoAction } from '@/app/actions/quickActions'
import { createClientAction } from '@/app/actions/clientActions'
import { createOrder } from '@/app/actions/orderActions'
import { getTodayDetailedMetricsAction } from '@/app/actions/cashActions'
import LoadingOverlay from './LoadingOverlay'
import { createPortal } from 'react-dom'

function Portal({ children }: { children: React.ReactNode }) {
   const [mounted, setMounted] = useState(false)
   useEffect(() => {
      setMounted(true)
      return () => setMounted(false)
   }, [])
   return mounted ? createPortal(children, document.body) : null
}

export default function BottomNav({
   isSuperAdmin = false,
   products = [],
   clients = [],
   recipes = [],
   variants = [],
   productionLots = [],
   userData = null,
   tenantData = null,
   todayOrders = [],
   todayWaste = [],
   activeSession = null
}: {
   isSuperAdmin?: boolean
   products?: any[]
   clients?: any[]
   recipes?: any[]
   variants?: any[]
   productionLots?: any[]
   userData?: any
   tenantData?: any
   todayOrders?: any[]
   todayWaste?: any[]
   activeSession?: any
}) {
   const pathname = usePathname()
   const router = useRouter()
   const [isOpen, setIsOpen] = useState(false)
   const [activeModal, setActiveModal] = useState<'add' | 'subtract' | 'order' | 'purchase' | null>(null)
   const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false)
   const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false)
   const [submitting, setSubmitting] = useState(false)
   const [isPending, startTransition] = useTransition()
   const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
   const [clientSearch, setClientSearch] = useState('')
   const [isSearchFocused, setIsSearchFocused] = useState(false)

   // --- METRICS MODAL STATE & ACTIONS ---
   const [metricsData, setMetricsData] = useState<any>(null)
   const [metricsLoading, setMetricsLoading] = useState(false)
   const [metricsFilter, setMetricsFilter] = useState<'day' | 'month' | 'custom'>('day')

   const getTodayStr = () => {
      const d = new Date()
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
   }

   const [metricsStartDate, setMetricsStartDate] = useState(getTodayStr())
   const [metricsEndDate, setMetricsEndDate] = useState(getTodayStr())

   const fetchMetrics = async () => {
      setMetricsLoading(true)
      try {
         const res = await getTodayDetailedMetricsAction({
            filterType: metricsFilter,
            startDateStr: metricsFilter === 'custom' ? metricsStartDate : undefined,
            endDateStr: metricsFilter === 'custom' ? metricsEndDate : undefined
         })
         if ('error' in res) {
            showToast(res.error || "Error cargando métricas", "error")
         } else {
            setMetricsData(res)
         }
      } catch (err: any) {
         showToast("Error inesperado cargando métricas", "error")
      } finally {
         setMetricsLoading(false)
      }
   }

   useEffect(() => {
      if (isMetricsModalOpen) {
         fetchMetrics()
      }
   }, [isMetricsModalOpen, metricsFilter, metricsStartDate, metricsEndDate])

   const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 4000)
   }

   const isRouteActive = (route: string) => {
      if (route === '/dashboard') return pathname === '/dashboard'
      return pathname.startsWith(route)
   }

   // Lists
   const finishedProducts = products.filter(p => p.type === 'finished')
   const rawMaterials = products.filter(p => p.type === 'raw_material')

   const closeModal = () => {
      setActiveModal(null)
      setIsOpen(false)
      setAddState({ productId: '', variantId: '', qty: '', applyRecipe: false, printLabel: false })
      setSubState({ productId: '', variantId: '', qty: '', reason: 'adjustment' })
      setPurchState({ productId: '', qty: '', cost: '' })
      setOrderState({
         clientId: 'anonymous',
         newClientName: '',
         newClientPhone: '',
         newClientAddress: '',
         items: [{ productId: '', qty: 1, unitPrice: 0 }],
         paymentMethod: 'cash'
      })
      setNewClientMode(false)
   }

   // --- FORM STATES ---
   const [addState, setAddState] = useState({ productId: '', variantId: '', qty: '', applyRecipe: false, printLabel: false })
   const [subState, setSubState] = useState({ productId: '', variantId: '', qty: '', reason: 'adjustment' })
   const [purchState, setPurchState] = useState({ productId: '', qty: '', cost: '' })
   
   const [newClientMode, setNewClientMode] = useState(false)
   const [orderState, setOrderState] = useState<{
      clientId: string
      newClientName: string
      newClientPhone: string
      newClientAddress: string
      items: { productId: string; variantId?: string; qty: number; unitPrice: number }[]
      paymentMethod: string
   }>({
      clientId: 'anonymous',
      newClientName: '',
      newClientPhone: '',
      newClientAddress: '',
      items: [{ productId: '', qty: 1, unitPrice: 0 }],
      paymentMethod: 'cash'
   })

    // --- ACTIONS ---
    const handleAddStock = (e: React.FormEvent) => {
       e.preventDefault()
       if (!addState.productId || !addState.qty || Number(addState.qty) <= 0) return showToast("Seleccioná producto y cantidad", "error")
       
       startTransition(async () => {
          setSubmitting(true)
          const res = await quickAdjustStockAction({
             productId: addState.productId,
             variantId: addState.variantId || null,
             qty: Number(addState.qty),
             type: 'add',
             applyRecipe: addState.applyRecipe
          })
          setSubmitting(false)
          if (res.error) {
             showToast(res.error, "error")
          } else {
             showToast(`Stock sumado correctamente. Lote: ${res.lotCode || 'N/A'}`, "success")
             if (addState.printLabel && res.lotCode) {
                const prodName = products.find(p => p.id === addState.productId)?.name || 'Producto'
                const labelHtml = `
                   <html><head><style>
                      @page { size: 40mm 30mm; margin: 2mm; }
                      body { font-family: Arial, sans-serif; font-size: 10px; text-align: center; }
                      .lot { font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
                      .name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
                      .date { font-size: 9px; color: #555; }
                   </style></head><body>
                      <div class="lot">${res.lotCode}</div>
                      <div class="name">${prodName}</div>
                      <div class="date">Elab: ${new Date().toLocaleDateString('es-AR')}</div>
                   </body></html>
                `
                const printWindow = window.open('', '_blank', 'width=300,height=200')
                if (printWindow) {
                   printWindow.document.write(labelHtml)
                   printWindow.document.close()
                   printWindow.print()
                }
             }
             closeModal()
             router.refresh()
          }
       })
    }
 
    const handleSubStock = (e: React.FormEvent) => {
       e.preventDefault()
       if (!subState.productId || !subState.qty || Number(subState.qty) <= 0) return showToast("Seleccioná producto/insumo y cantidad", "error")
       
       const hasVariants = variants.filter(v => v.product_id === subState.productId).length > 0
       if (hasVariants && !subState.variantId) {
          return showToast("Seleccioná el sabor/variante", "error")
       }

       startTransition(async () => {
          setSubmitting(true)
          const res = await quickAdjustStockAction({
             productId: subState.productId,
             variantId: subState.variantId || null,
             qty: Number(subState.qty),
             type: 'subtract',
             applyRecipe: false,
             reason: subState.reason
          })
          setSubmitting(false)
          if (res.error) {
             showToast(res.error, "error")
          } else {
             showToast("Stock descontado correctamente", "success")
             closeModal()
             router.refresh()
          }
       })
    }
 
    const handlePurchaseInsumo = (e: React.FormEvent) => {
       e.preventDefault()
       if (!purchState.productId || !purchState.qty || Number(purchState.qty) <= 0) return showToast("Seleccioná insumo y cantidad", "error")
       
       startTransition(async () => {
          setSubmitting(true)
          const res = await quickPurchaseInsumoAction({
             productId: purchState.productId,
             qty: Number(purchState.qty),
             cost: purchState.cost ? Number(purchState.cost) : undefined
          })
          setSubmitting(false)
          if (res.error) {
             showToast(res.error, "error")
          } else {
             showToast("Insumo ingresado correctamente", "success")
             closeModal()
             router.refresh()
          }
       })
    }
 
    const handleTakeOrder = (e: React.FormEvent) => {
       e.preventDefault()
       const validItems = orderState.items.filter(i => i.productId && i.qty > 0)
       if (validItems.length === 0) return showToast("Tenés que agregar al menos un producto válido", "error")
 
       startTransition(async () => {
          setSubmitting(true)
          let finalClientId: string | null = null
 
          if (orderState.clientId !== 'anonymous') {
             finalClientId = orderState.clientId
          }
 
          if (newClientMode) {
             if (!orderState.newClientName) {
                setSubmitting(false)
                return showToast("El nombre del nuevo cliente es obligatorio", "error")
             }
             const clientRes = await createClientAction({
                customer_type: 'b2c',
                name: orderState.newClientName,
                phone_number: orderState.newClientPhone,
                address: orderState.newClientAddress
             })
             if (clientRes.error) {
                setSubmitting(false)
                return showToast("Error creando cliente: " + clientRes.error, "error")
             }
             finalClientId = (clientRes as any).clientId || null
          }
 
          const totalCalc = validItems.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0)
 
          const res = await createOrder({
             clientId: finalClientId,
             items: validItems.map(vi => ({
                productId: vi.productId,
                variantId: vi.variantId || null,
                qty: vi.qty,
                unitPrice: vi.unitPrice
             })),
             paymentMethod: orderState.paymentMethod,
             isManualLotSelection: false, // FIFO automático
             totalCalc
          })
 
          setSubmitting(false)
          if (res.error) {
             showToast(res.error, "error")
          } else {
             showToast("Pedido registrado correctamente", "success")
             closeModal()
             router.refresh()
          }
       })
    }

   const addOrderItem = () => {
      setOrderState({
         ...orderState,
         items: [...orderState.items, { productId: '', qty: 1, unitPrice: 0 }]
      })
   }

   const removeOrderItem = (index: number) => {
      const newItems = [...orderState.items]
      newItems.splice(index, 1)
      setOrderState({ ...orderState, items: newItems })
   }

   const updateOrderItem = (index: number, field: string, value: any) => {
      const newItems = [...orderState.items]
      newItems[index] = { ...newItems[index], [field]: value }

      if (field === 'productId') {
         newItems[index].variantId = '' // reset variant selection
         const prod = products.find(p => String(p.id) === String(value))
         if (prod) {
            newItems[index].unitPrice = Number(prod.price || 0)
         }
      }

      if (field === 'variantId') {
         const variant = variants.find(v => String(v.id) === String(value))
         if (variant && variant.price_override !== null && variant.price_override !== undefined) {
            newItems[index].unitPrice = Number(variant.price_override)
         } else {
            // fallback to base product price
            const prod = products.find(p => String(p.id) === String(newItems[index].productId))
            if (prod) {
               newItems[index].unitPrice = Number(prod.price || 0)
            }
         }
      }

      setOrderState({ ...orderState, items: newItems })
   }

   const hasRecipe = recipes.includes(addState.productId)

   // --- CALCULATIONS FOR METRICS MODAL ---
   const getMetricsCalculations = () => {
      if (!metricsData) return {
         totalSales: 0,
         totalOrders: 0,
         deliveredOrdersCount: 0,
         deliveredSales: 0,
         cashSales: 0,
         transferSales: 0,
         mpSales: 0,
         expectedDrawerCash: 0,
         productSales: [],
         wastes: []
      }

      const orders = metricsData.orders || []
      const products = metricsData.products || []
      const variants = metricsData.variants || []
      const mermas = metricsData.mermas || []

      let totalSales = 0
      let totalOrders = orders.length
      let deliveredOrdersCount = 0
      let deliveredSales = 0
      let cashSales = 0
      let transferSales = 0
      let mpSales = 0

      orders.forEach((o: any) => {
         const val = Number(o.total_calc || 0)
         totalSales += val
         
         if (o.status === 'delivered') {
            deliveredOrdersCount++
            deliveredSales += val
            if (o.payment_method === 'cash') {
               cashSales += val
            } else if (o.payment_method === 'transfer') {
               transferSales += val
            } else if (o.payment_method === 'mercado_pago') {
               mpSales += val
            }
         } else if (metricsFilter !== 'day') {
            if (o.payment_method === 'cash') {
               cashSales += val
            } else if (o.payment_method === 'transfer') {
               transferSales += val
            } else if (o.payment_method === 'mercado_pago') {
               mpSales += val
            }
         }
      })

      const startingCash = metricsData.activeSession ? Number(metricsData.activeSession.starting_cash || 0) : 0
      const expectedDrawerCash = startingCash + cashSales

      // Group items sold
      const productSalesMap: { [prodId: string]: any } = {}
      orders.forEach((o: any) => {
         if (!o.order_items) return
         o.order_items.forEach((item: any) => {
            const prodId = item.product_id
            const varId = item.variant_id || 'no_variant'
            const qty = Number(item.quantity || 0)
            const subtotal = Number(item.subtotal || 0)

            if (!productSalesMap[prodId]) {
               const prodObj = products.find((p: any) => p.id === prodId)
               productSalesMap[prodId] = {
                  id: prodId,
                  name: prodObj?.name || 'Producto Desconocido',
                  type: prodObj?.type || 'finished',
                  totalQty: 0,
                  totalRevenue: 0,
                  variants: {}
               }
            }

            productSalesMap[prodId].totalQty += qty
            productSalesMap[prodId].totalRevenue += subtotal

            if (!productSalesMap[prodId].variants[varId]) {
               const varObj = variants.find((v: any) => v.id === item.variant_id)
               productSalesMap[prodId].variants[varId] = {
                  id: varId,
                  name: varObj?.name || 'Sabor Único/Estándar',
                  qty: 0,
                  revenue: 0
               }
            }

            productSalesMap[prodId].variants[varId].qty += qty
            productSalesMap[prodId].variants[varId].revenue += subtotal
         })
      })

      const productSalesList = Object.values(productSalesMap).map((ps: any) => {
         const variantsList = Object.values(ps.variants).sort((a: any, b: any) => b.qty - a.qty)
         return {
            ...ps,
            variantsList
         }
      }).sort((a: any, b: any) => b.totalQty - a.totalQty)

      // Group mermas
      const mermasMap: { [prodId: string]: any } = {}
      mermas.forEach((m: any) => {
         const prodId = m.product_id
         const qty = Number(m.quantity || 0)
         if (!mermasMap[prodId]) {
            const prodObj = products.find((p: any) => p.id === prodId)
            mermasMap[prodId] = {
               id: prodId,
               name: prodObj?.name || 'Insumo/Producto Desconocido',
               qty: 0
            }
         }
         mermasMap[prodId].qty += qty
      })
      const wastesList = Object.values(mermasMap).sort((a: any, b: any) => b.qty - a.qty)

      return {
         totalSales,
         totalOrders,
         deliveredOrdersCount,
         deliveredSales,
         cashSales,
         transferSales,
         mpSales,
         expectedDrawerCash,
         productSales: productSalesList,
         wastes: wastesList
      }
   }

   const {
      totalSales,
      totalOrders,
      deliveredOrdersCount,
      deliveredSales,
      cashSales,
      transferSales,
      mpSales,
      expectedDrawerCash,
      productSales,
      wastes
   } = getMetricsCalculations()

   // --- RENDER ---
   if (isSuperAdmin) {
      // Super Admin Menu Links
      const superNavItems = [
         { href: '/dashboard', label: 'Inicio', icon: Home },
         { href: '/dashboard/tenants', label: 'Fábricas', icon: Package },
         { href: '/dashboard/billing', label: 'Pagos', icon: ShoppingCart },
         { href: '/dashboard/settings', label: 'Ajustes', icon: Menu },
      ]
      return (
         <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around h-16">
               {superNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = isRouteActive(item.href)
                  return (
                     <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                           isActive ? 'text-orange-500' : 'text-slate-500'
                        }`}
                     >
                        <Icon size={22} className={isActive ? 'opacity-100' : 'opacity-80'} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
                     </Link>
                  )
               })}
            </div>
         </nav>
      )
   }

   return (
      <>
         {/* Speed Dial Menu for Employees */}
         {isOpen && (
            <div className="fixed bottom-24 left-0 right-0 mx-auto w-max md:left-auto md:right-6 md:mx-0 z-50 flex flex-col items-center md:items-end gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
               {/* Botón Compra de Insumo */}
               <button 
                  onClick={() => setActiveModal('purchase')} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 border border-slate-200 hover:border-amber-500 hover:text-amber-600 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer"
               >
                  <Wheat size={16} className="text-amber-500"/>
                  Compra de Insumo
               </button>

               {/* Botón Tomar Pedido */}
               <button 
                  onClick={() => setActiveModal('order')} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer"
               >
                  <ShoppingCart size={16} className="text-emerald-500"/>
                  Tomar Pedido
               </button>

               {/* Botón Descontar Stock */}
               <button 
                  onClick={() => setActiveModal('subtract')} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 border border-slate-200 hover:border-red-500 hover:text-red-600 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer"
               >
                  <Minus size={16} className="text-red-500"/>
                  Descontar Stock
               </button>

               {/* Botón Sumar Stock */}
               <button 
                  onClick={() => setActiveModal('add')} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg font-bold text-sm transition-all cursor-pointer"
               >
                  <Package size={16} className="text-orange-500"/>
                  Sumar Stock (Producción)
               </button>
            </div>
         )}

         {/* Bottom Nav Bar with Center '+' button */}
         <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around h-16 px-2 relative">
               
               {/* 1. Inicio */}
               <Link 
                  href="/dashboard"
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                     isRouteActive('/dashboard') && pathname === '/dashboard' ? 'text-orange-500' : 'text-slate-500'
                  }`}
               >
                  <Home size={22} strokeWidth={isRouteActive('/dashboard') && pathname === '/dashboard' ? 2.5 : 2} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Inicio</span>
               </Link>

               {/* 2. Stock */}
               <Link 
                  href="/dashboard/stock"
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                     isRouteActive('/dashboard/stock') ? 'text-orange-500' : 'text-slate-500'
                  }`}
               >
                  <BarChart3 size={22} strokeWidth={isRouteActive('/dashboard/stock') ? 2.5 : 2} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Stock</span>
               </Link>

               {/* 3. CENTER BUTTON '+' */}
               <div className="relative w-16 h-full flex items-center justify-center">
                  <button
                     onClick={() => setIsOpen(!isOpen)}
                     className={`h-14 w-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 transition-transform active:scale-95 duration-300 -translate-y-5 border-4 border-white ${
                        isOpen ? 'rotate-45 bg-slate-800 shadow-slate-800/30' : ''
                     }`}
                  >
                     <Plus size={26} strokeWidth={3}/>
                  </button>
               </div>

               {/* 4. Pedidos */}
               <Link 
                  href="/dashboard/pedidos"
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                     isRouteActive('/dashboard/pedidos') ? 'text-orange-500' : 'text-slate-500'
                  }`}
               >
                  <ShoppingCart size={22} strokeWidth={isRouteActive('/dashboard/pedidos') ? 2.5 : 2} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Pedidos</span>
               </Link>

               {/* 5. Menú / Config */}
               <button 
                  onClick={() => setIsMenuDrawerOpen(true)}
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                     isMenuDrawerOpen ? 'text-orange-500' : 'text-slate-500'
                  }`}
               >
                  <Menu size={22} strokeWidth={isMenuDrawerOpen ? 2.5 : 2} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Menú</span>
               </button>

            </div>
         </nav>

         {/* Floating Button for Desktop */}
         <div className="fixed bottom-6 right-6 z-40 hidden md:block">
            <button
               onClick={() => setIsOpen(!isOpen)}
               className={`h-14 w-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 transition-all active:scale-95 duration-300 border-4 border-white cursor-pointer ${
                  isOpen ? 'rotate-45 bg-slate-800 shadow-slate-800/30' : ''
               }`}
            >
               <Plus size={26} strokeWidth={3}/>
            </button>
         </div>

         {/* --- MODAL WRAPPER (z-index 100 on top of bottom nav) --- */}
         {activeModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
               <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                     <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                        {activeModal === 'add' && <><Package className="text-orange-500"/> Sumar Stock</>}
                        {activeModal === 'subtract' && <><Minus className="text-red-500"/> Descontar Stock</>}
                        {activeModal === 'purchase' && <><Wheat className="text-amber-500"/> Compra de Insumo</>}
                        {activeModal === 'order' && <><ShoppingCart className="text-emerald-500"/> Tomar Pedido</>}
                     </h3>
                     <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
                        <X size={20}/>
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 pb-16 overflow-y-auto flex-1 space-y-4">
                     
                     {/* 1. SUMAR STOCK */}
                     {activeModal === 'add' && (
                        <form onSubmit={handleAddStock} className="space-y-4">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Producto</label>
                              <select 
                                 value={addState.productId} 
                                 onChange={e => setAddState({ ...addState, productId: e.target.value, variantId: '' })}
                                 required
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              >
                                 <option value="">-- Seleccionar Producto --</option>
                                 {finishedProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                           </div>

                           {addState.productId && variants.filter(v => v.product_id === addState.productId).length > 0 && (
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Variante / Sabor</label>
                                 <select 
                                    value={addState.variantId} 
                                    onChange={e => setAddState({ ...addState, variantId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                                 >
                                    <option value="">-- Seleccionar Variante --</option>
                                    {variants.filter(v => v.product_id === addState.productId).map(v => (
                                       <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                 </select>
                              </div>
                           )}

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad a Agregar</label>
                              <input 
                                 type="number" 
                                 step="0.5" 
                                 min="0.5" 
                                 value={addState.qty} 
                                 onChange={e => setAddState({ ...addState, qty: e.target.value })}
                                 required
                                 placeholder="Ej. 10" 
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              />
                           </div>

                           {addState.productId && hasRecipe && (
                              <div className="flex items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                 <input 
                                    type="checkbox" 
                                    id="applyRecipe" 
                                    checked={addState.applyRecipe} 
                                    onChange={e => setAddState({ ...addState, applyRecipe: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500"
                                 />
                                 <label htmlFor="applyRecipe" className="text-sm font-bold text-slate-700 select-none">
                                    Descontar ingredientes automáticamente de la receta
                                 </label>
                              </div>
                           )}

                           <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <input 
                                 type="checkbox" 
                                 id="printLabel" 
                                 checked={addState.printLabel} 
                                 onChange={e => setAddState({ ...addState, printLabel: e.target.checked })}
                                 className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                              />
                              <label htmlFor="printLabel" className="text-sm font-bold text-slate-700 select-none flex items-center gap-1.5">
                                 <Printer size={16}/> Imprimir etiqueta de lote al finalizar
                              </label>
                           </div>

                           <button 
                              type="submit" 
                              disabled={submitting}
                              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                           >
                              {submitting ? <Loader2 className="animate-spin" size={20}/> : 'CONFIRMAR INGRESO'}
                           </button>
                        </form>
                     )}

                     {/* 2. DESCONTAR STOCK */}
                     {activeModal === 'subtract' && (
                        <form onSubmit={handleSubStock} className="space-y-4">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Producto / Insumo</label>
                              <select 
                                 value={subState.productId} 
                                 onChange={e => setSubState({ ...subState, productId: e.target.value, variantId: '' })}
                                 required
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              >
                                 <option value="">-- Seleccionar Item --</option>
                                 <optgroup label="Productos Terminados">
                                    {finishedProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.current_stock} {p.unit_of_measure} disp.)</option>)}
                                 </optgroup>
                                 <optgroup label="Materias Primas / Insumos">
                                    {rawMaterials.map(p => <option key={p.id} value={p.id}>{p.name} ({p.current_stock} {p.unit_of_measure} disp.)</option>)}
                                 </optgroup>
                              </select>
                           </div>

                           {subState.productId && variants.filter(v => v.product_id === subState.productId).length > 0 && (
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Variante / Sabor</label>
                                 <select 
                                    value={subState.variantId} 
                                    onChange={e => setSubState({ ...subState, variantId: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                                 >
                                    <option value="">-- Seleccionar Variante --</option>
                                    {variants.filter(v => v.product_id === subState.productId).map(v => (
                                       <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                 </select>
                              </div>
                           )}

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad a Restar</label>
                              <input 
                                 type="number" 
                                 step="0.5" 
                                 min="0.5" 
                                 value={subState.qty} 
                                 onChange={e => setSubState({ ...subState, qty: e.target.value })}
                                 required
                                 placeholder="Ej. 2" 
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Tipo de Salida</label>
                              <select 
                                 value={subState.reason} 
                                 onChange={e => setSubState({ ...subState, reason: e.target.value })}
                                 required
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              >
                                 <option value="adjustment">Ajuste de Stock (Manual)</option>
                                 <option value="waste">Merma / Desperdicio (Desechado)</option>
                              </select>
                           </div>

                           <button 
                              type="submit" 
                              disabled={submitting}
                              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                           >
                              {submitting ? <Loader2 className="animate-spin" size={20}/> : 'CONFIRMAR EGRESO'}
                           </button>
                        </form>
                     )}

                     {/* 3. COMPRA INSUMO */}
                     {activeModal === 'purchase' && (
                        <form onSubmit={handlePurchaseInsumo} className="space-y-4">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Materia Prima / Insumo</label>
                              <select 
                                 value={purchState.productId} 
                                 onChange={e => setPurchState({ ...purchState, productId: e.target.value })}
                                 required
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              >
                                 <option value="">-- Seleccionar Insumo --</option>
                                 {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} (Actual: {m.current_stock} {m.unit_of_measure})</option>)}
                              </select>
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad Comprada</label>
                              <input 
                                 type="number" 
                                 step="0.5" 
                                 min="0.5" 
                                 value={purchState.qty} 
                                 onChange={e => setPurchState({ ...purchState, qty: e.target.value })}
                                 required
                                 placeholder="Ej. 25" 
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Costo Estimado (Opcional)</label>
                              <input 
                                 type="number" 
                                 value={purchState.cost} 
                                 onChange={e => setPurchState({ ...purchState, cost: e.target.value })}
                                 placeholder="Ej. 1500" 
                                 className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
                              />
                           </div>

                           <button 
                              type="submit" 
                              disabled={submitting}
                              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                           >
                              {submitting ? <Loader2 className="animate-spin" size={20}/> : 'REGISTRAR COMPRA'}
                           </button>
                        </form>
                     )}

                     {/* 4. TOMAR PEDIDO */}
                     {activeModal === 'order' && (
                        <form onSubmit={handleTakeOrder} className="space-y-4">
                           {/* Modo Cliente */}
                           <div className="flex justify-between items-center bg-slate-100 p-1 rounded-xl">
                              <button 
                                 type="button" 
                                 onClick={() => { setNewClientMode(false); setOrderState({ ...orderState, clientId: 'anonymous' }) }} 
                                 className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!newClientMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                              >
                                 Cliente Registrado / Anónimo
                              </button>
                              <button 
                                 type="button" 
                                 onClick={() => setNewClientMode(true)} 
                                 className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${newClientMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                              >
                                 + Nuevo Cliente
                              </button>
                           </div>

                           {!newClientMode ? (
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Cliente / Dirección</label>
                                 <div className="relative">
                                    {(() => {
                                       const selectedClientObj = orderState.clientId === 'anonymous' 
                                          ? { name: 'Consumidor Final (Anónimo)', address: '', phone_number: '' }
                                          : clients.find(c => c.id === orderState.clientId)
                                       return (
                                          <>
                                             <input 
                                                type="text" 
                                                placeholder="🔍 Buscar por nombre, dirección o teléfono..."
                                                value={isSearchFocused ? clientSearch : (selectedClientObj?.address ? `${selectedClientObj.name} (${selectedClientObj.address})` : selectedClientObj?.name || 'Consumidor Final (Anónimo)')}
                                                onFocus={() => {
                                                   setIsSearchFocused(true)
                                                   setClientSearch('') // clear search to show all options
                                                }}
                                                onBlur={() => {
                                                   // Delay closing to allow onMouseDown of options to run
                                                   setTimeout(() => {
                                                      setIsSearchFocused(false)
                                                   }, 250)
                                                }}
                                                onChange={e => setClientSearch(e.target.value)}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 text-sm shadow-sm"
                                             />
                                             
                                             {isSearchFocused && (
                                                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl z-[120] divide-y divide-slate-100">
                                                   <div 
                                                      onMouseDown={() => {
                                                         setOrderState({ ...orderState, clientId: 'anonymous' })
                                                         setIsSearchFocused(false)
                                                      }}
                                                      className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col text-left"
                                                   >
                                                      <span className="font-bold text-slate-800 text-xs">Consumidor Final (Anónimo)</span>
                                                   </div>
                                                   {clients
                                                      .filter(c => {
                                                         const q = clientSearch.toLowerCase().trim()
                                                         if (!q) return true
                                                         return (
                                                            c.name?.toLowerCase().includes(q) ||
                                                            c.address?.toLowerCase().includes(q) ||
                                                            c.phone_number?.toLowerCase().includes(q)
                                                         )
                                                      })
                                                      .map(c => (
                                                         <div 
                                                            key={c.id}
                                                            onMouseDown={() => {
                                                               setOrderState({ ...orderState, clientId: c.id })
                                                               setIsSearchFocused(false)
                                                            }}
                                                            className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col text-left"
                                                         >
                                                            <span className="font-bold text-slate-800 text-xs">{c.name}</span>
                                                            {(c.address || c.phone_number) && (
                                                               <span className="text-[10px] text-slate-500 mt-0.5">
                                                                  {c.address ? `📍 ${c.address}` : ''}{c.address && c.phone_number ? ' | ' : ''}{c.phone_number ? `📞 ${c.phone_number}` : ''}
                                                               </span>
                                                            )}
                                                         </div>
                                                      ))
                                                   }
                                                </div>
                                             )}
                                          </>
                                       )
                                    })()}
                                 </div>
                              </div>
                           ) : (
                              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
                                 <h4 className="font-bold text-emerald-800 text-sm">Nuevo Cliente</h4>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Nombre / Razón Social *</label>
                                    <input 
                                       type="text" 
                                       required={newClientMode}
                                       value={orderState.newClientName} 
                                       onChange={e => setOrderState({ ...orderState, newClientName: e.target.value })}
                                       placeholder="Ej. Juan Pérez" 
                                       className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-800"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono</label>
                                       <input 
                                          type="text" 
                                          value={orderState.newClientPhone} 
                                          onChange={e => setOrderState({ ...orderState, newClientPhone: e.target.value })}
                                          placeholder="1112345678" 
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-800"
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-slate-600 mb-1">Dirección</label>
                                       <input 
                                          type="text" 
                                          value={orderState.newClientAddress} 
                                          onChange={e => setOrderState({ ...orderState, newClientAddress: e.target.value })}
                                          placeholder="Av. Rivadavia 4500" 
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-800"
                                       />
                                    </div>
                                 </div>
                              </div>
                           )}

                           {/* Listado de Productos */}
                           <div>
                              <div className="flex justify-between items-center mb-2">
                                 <label className="block text-sm font-bold text-slate-700">Productos del Pedido</label>
                                 <button 
                                    type="button" 
                                    onClick={addOrderItem}
                                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                 >
                                    <Plus size={14}/> Agregar Item
                                 </button>
                              </div>

                              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                 {orderState.items.map((item, index) => (
                                    <div key={index} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-sm text-left">
                                       {/* Header with Title and Delete Button */}
                                       <div className="flex justify-between items-center">
                                          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Item #{index + 1}</span>
                                          {orderState.items.length > 1 && (
                                             <button 
                                                type="button" 
                                                onClick={() => removeOrderItem(index)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                                             >
                                                <X size={16}/>
                                             </button>
                                          )}
                                       </div>

                                       {/* Selectors Stack */}
                                       <div className="space-y-2">
                                          <div>
                                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Producto</label>
                                             <select 
                                                value={item.productId}
                                                onChange={e => updateOrderItem(index, 'productId', e.target.value)}
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                             >
                                                <option value="">-- Seleccionar Producto --</option>
                                                {finishedProducts.map(p => {
                                                   const hasVariants = variants.some(v => v.product_id === p.id)
                                                   const suffix = (!hasVariants && p.current_stock !== undefined && p.current_stock !== null) ? ` (${p.current_stock} ${p.unit_of_measure} disp.)` : ''
                                                   return (
                                                      <option key={p.id} value={p.id}>
                                                         {p.name}{suffix} (${p.price})
                                                      </option>
                                                   )
                                                })}
                                             </select>
                                          </div>

                                          {item.productId && variants.filter(v => v.product_id === item.productId).length > 0 && (
                                             <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sabor / Variante</label>
                                                <select 
                                                   value={item.variantId || ''}
                                                   onChange={e => updateOrderItem(index, 'variantId', e.target.value)}
                                                   required
                                                   className="w-full px-3 py-2 border border-orange-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                >
                                                   <option value="">-- Seleccionar Sabor --</option>
                                                   {variants.filter(v => v.product_id === item.productId).map(v => {
                                                      const varLots = productionLots.filter((l: any) => l.variant_id === v.id)
                                                      const varStock = varLots.reduce((acc: number, curr: any) => acc + Number(curr.quantity_remaining || 0), 0)
                                                      const p = finishedProducts.find(prod => prod.id === item.productId)
                                                      const unit = p?.unit_of_measure || 'u.'
                                                      return (
                                                         <option key={v.id} value={v.id}>
                                                            {v.name} ({varStock} {unit} disp.)
                                                         </option>
                                                      )
                                                   })}
                                                </select>
                                             </div>
                                          )}
                                       </div>

                                       {/* Quantity and Price Grid */}
                                       <div className="grid grid-cols-2 gap-3 pt-1">
                                          <div>
                                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cantidad</label>
                                             <input 
                                                type="number" 
                                                min="1" 
                                                value={item.qty}
                                                onChange={e => updateOrderItem(index, 'qty', parseInt(e.target.value) || 0)}
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-bold"
                                             />
                                          </div>
                                          <div>
                                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Unitario ($)</label>
                                             <input 
                                                type="number" 
                                                value={item.unitPrice}
                                                onChange={e => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                required
                                                placeholder="Precio"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-bold text-emerald-600"
                                             />
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Total y Pago */}
                           <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-2xl text-white">
                              <div>
                                 <span className="text-xs text-slate-400 font-bold block">MEDIO DE PAGO</span>
                                 <select 
                                    value={orderState.paymentMethod}
                                    onChange={e => setOrderState({ ...orderState, paymentMethod: e.target.value })}
                                    className="bg-slate-800 text-white font-bold text-sm rounded-lg px-2 py-1 focus:outline-none border-none mt-1"
                                 >
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="mercado_pago">Mercado Pago</option>
                                 </select>
                              </div>
                              <div className="text-right">
                                 <span className="text-xs text-slate-400 font-bold block">TOTAL ESTIMADO</span>
                                 <span className="text-xl font-black text-orange-500">
                                    ${orderState.items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0).toLocaleString('es-AR')}
                                 </span>
                              </div>
                           </div>

                           <button 
                              type="submit" 
                              disabled={submitting}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                           >
                              {submitting ? <Loader2 className="animate-spin" size={20}/> : 'CONFIRMAR PEDIDO'}
                           </button>
                        </form>
                     )}

                  </div>
               </div>
            </div>
         )}

         {/* Sliding Menu Drawer for mobile */}
         {isMenuDrawerOpen && (
            <Portal>
               <div className="fixed inset-0 z-[140] flex justify-end animate-in fade-in duration-200">
                  {/* Backdrop */}
                  <div 
                     className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                     onClick={() => setIsMenuDrawerOpen(false)}
                  />

                  {/* Drawer Content */}
                  <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-left">
                     {/* Drawer Header */}
                     <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {tenantData?.logo_url ? (
                                 <img src={tenantData.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded border border-slate-200 shrink-0" />
                              ) : (
                                 <div className="h-8 w-8 rounded bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {tenantData?.name?.charAt(0) || 'F'}
                                 </div>
                              )}
                              <span className="font-extrabold text-slate-800 text-sm truncate max-w-[160px]">
                                 {tenantData?.name || 'Mi Fábrica'}
                              </span>
                           </div>
                           <button 
                              onClick={() => setIsMenuDrawerOpen(false)}
                              className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-200 rounded-full transition"
                           >
                              <X size={18} />
                           </button>
                        </div>
                        <div className="flex items-center gap-2.5 mt-1">
                           <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-xs capitalize">
                              {userData?.full_name?.charAt(0) || userData?.role?.charAt(0) || 'U'}
                           </div>
                           <div className="flex flex-col overflow-hidden text-left">
                              <span className="text-xs font-semibold text-slate-850 truncate">{userData?.full_name || 'Personal'}</span>
                              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">{userData?.role || 'Empleado'}</span>
                           </div>
                        </div>
                     </div>

                     {/* Drawer Body */}
                     <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        {isSuperAdmin ? (
                           <>
                              <Link 
                                 href="/dashboard/tenants" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition font-medium"
                              >
                                 <Factory size={20} className="text-slate-450" />
                                 <span className="text-sm">Gestión de Fábricas</span>
                              </Link>
                              <Link 
                                 href="/dashboard/billing" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-655 hover:bg-slate-50 hover:text-slate-900 transition font-medium"
                              >
                                 <CreditCard size={20} className="text-slate-450" />
                                 <span className="text-sm">Suscripciones</span>
                              </Link>
                              <Link 
                                 href="/dashboard/settings" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-655 hover:bg-slate-50 hover:text-slate-900 transition font-medium"
                              >
                                 <Settings size={20} className="text-slate-450" />
                                 <span className="text-sm">Configuración Global</span>
                              </Link>
                           </>
                        ) : (
                           <>
                              {/* Stock */}
                              <Link 
                                 href="/dashboard/productos" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <UtensilsCrossed size={20} className="text-orange-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Stock (Productos)</span>
                              </Link>

                              {/* INSUMOS */}
                              <Link 
                                 href="/dashboard/insumos" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <Wheat size={20} className="text-amber-600 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Insumos</span>
                              </Link>

                              {/* Clientes */}
                              <Link 
                                 href="/dashboard/clientes" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <Users size={20} className="text-blue-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Clientes</span>
                              </Link>

                              {/* PEDIDOS ENTREGADOS */}
                              <Link 
                                 href="/dashboard/pedidos?tab=delivered" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Pedidos Entregados</span>
                              </Link>

                              {/* Metricas */}
                              <button 
                                 onClick={() => {
                                    setIsMenuDrawerOpen(false)
                                    setIsMetricsModalOpen(true)
                                 }}
                                 className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold text-left"
                              >
                                 <BarChart3 size={20} className="text-purple-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Métricas</span>
                              </button>

                              {/* Repartos */}
                              <Link 
                                 href="/dashboard/logistics" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <Truck size={20} className="text-emerald-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Repartos</span>
                              </Link>

                              <hr className="border-slate-100 my-4" />

                              {/* Configuración */}
                              <Link 
                                 href="/dashboard/configuracion" 
                                 onClick={() => setIsMenuDrawerOpen(false)}
                                 className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-655 hover:bg-orange-50/50 hover:text-slate-900 transition font-bold"
                              >
                                 <Printer size={20} className="text-slate-500 shrink-0" />
                                 <span className="text-sm font-extrabold text-slate-755">Configuración</span>
                              </Link>
                           </>
                        )}
                     </div>

                     {/* Drawer Footer (Sign out) */}
                     <div className="p-4 border-t border-slate-100 shrink-0">
                        <form action="/auth/signout" method="post" className="w-full">
                           <button className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left hover:bg-red-50 transition text-red-500 font-black">
                              <LogOut size={20} className="shrink-0" />
                              <span className="text-sm">Cerrar Sesión</span>
                           </button>
                        </form>
                     </div>
                  </div>
               </div>
            </Portal>
         )}

         {/* Metrics Modal */}
         {isMetricsModalOpen && (
            <Portal>
               <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-slate-55 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[92vh] sm:h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
                     
                     {/* Modal Header */}
                     <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                        <div className="text-left">
                           <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                              <BarChart3 className="text-purple-600 animate-pulse" size={24} />
                              Métricas de Fábrica
                           </h3>
                           <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {tenantData?.name || 'Administración Central'}
                           </p>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                              onClick={fetchMetrics}
                              disabled={metricsLoading}
                              className="p-2 text-slate-500 hover:text-slate-755 hover:bg-slate-100 rounded-full transition disabled:opacity-50"
                              title="Refrescar datos"
                           >
                              <RefreshCw size={18} className={metricsLoading ? "animate-spin text-purple-650" : "text-slate-600"} />
                           </button>
                           <button 
                              onClick={() => setIsMetricsModalOpen(false)} 
                              className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition"
                           >
                              <X size={20}/>
                           </button>
                        </div>
                     </div>

                     {/* Filter Selector */}
                     <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0">
                        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                           <button
                              onClick={() => setMetricsFilter('day')}
                              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                                 metricsFilter === 'day' 
                                    ? 'bg-white text-slate-850 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                              }`}
                           >
                              Diario (Hoy)
                           </button>
                           <button
                              onClick={() => setMetricsFilter('month')}
                              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                                 metricsFilter === 'month' 
                                    ? 'bg-white text-slate-850 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                              }`}
                           >
                              Mensual (Mes)
                           </button>
                           <button
                              onClick={() => setMetricsFilter('custom')}
                              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                                 metricsFilter === 'custom' 
                                    ? 'bg-white text-slate-850 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                              }`}
                           >
                              Personalizado
                           </button>
                        </div>

                        {/* Custom Date Inputs */}
                        {metricsFilter === 'custom' && (
                           <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                              <div className="text-left">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Desde</label>
                                 <input 
                                    type="date"
                                    value={metricsStartDate}
                                    onChange={e => setMetricsStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                                 />
                              </div>
                              <div className="text-left">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Hasta</label>
                                 <input 
                                    type="date"
                                    value={metricsEndDate}
                                    onChange={e => setMetricsEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                                 />
                              </div>
                           </div>
                        )}

                        {/* Active Cash Session Status Badge */}
                        {metricsFilter === 'day' && (
                           <div className="transition-all">
                              {metricsData?.activeSession ? (
                                 <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-xs text-emerald-850">
                                    <div className="flex items-center gap-2 font-bold">
                                       <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                       <span>Sesión de Caja Abierta</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">
                                       Iniciada: {new Date(metricsData.activeSession.opened_at).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} hs
                                    </span>
                                 </div>
                              ) : (
                                 <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-650 font-bold">
                                    <div className="flex items-center gap-2">
                                       <span className="w-2.5 h-2.5 bg-slate-400 rounded-full shrink-0" />
                                       <span>Caja Cerrada (Día General)</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">
                                       Sin sesión activa
                                    </span>
                                 </div>
                               )}
                           </div>
                        )}
                     </div>

                     {/* Scrollable Body */}
                     <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50">
                        
                        {metricsLoading ? (
                           <div className="flex flex-col items-center justify-center py-20 gap-4">
                              <Loader2 className="animate-spin text-purple-650" size={36} />
                              <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Cargando métricas de fábrica...</p>
                           </div>
                        ) : !metricsData ? (
                           <div className="text-center py-20 text-slate-450 font-bold text-sm">
                              No hay datos para mostrar. Toca refrescar.
                           </div>
                        ) : (
                           <>
                              {/* Financial Summary */}
                              <div className="space-y-3">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Resumen de Cobros y Ventas</h4>
                                 
                                 {metricsFilter === 'day' && metricsData.activeSession ? (
                                    <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 text-white shadow-lg text-left">
                                       <span className="text-[9px] font-black text-emerald-100 uppercase tracking-wider block">EFECTIVO ESPERADO EN CAJA</span>
                                       <span className="text-3xl font-black">${expectedDrawerCash.toLocaleString('es-AR')}</span>
                                       <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] font-bold text-emerald-100">
                                          <div>Monto Inicial: <span className="text-white">${Number(metricsData.activeSession.starting_cash).toLocaleString('es-AR')}</span></div>
                                          <div className="text-right">Vendido Efectivo: <span className="text-white">${cashSales.toLocaleString('es-AR')}</span></div>
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg text-left">
                                       <span className="text-[9px] font-black text-purple-100 uppercase tracking-wider block">VENTAS TOTALES REGISTRADAS</span>
                                       <span className="text-3xl font-black">${totalSales.toLocaleString('es-AR')}</span>
                                       <p className="text-[10px] font-bold text-purple-200 mt-1">
                                          Total de {totalOrders} pedidos registrados
                                       </p>
                                    </div>
                                 )}

                                 {/* Breakdown Grid */}
                                 <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs text-left">
                                       <span className="text-[8px] font-black text-slate-450 uppercase tracking-wider block">EFECTIVO</span>
                                       <span className="text-sm font-black text-slate-800 block mt-0.5">${cashSales.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs text-left">
                                       <span className="text-[8px] font-black text-slate-450 uppercase tracking-wider block">TRANSF.</span>
                                       <span className="text-sm font-black text-slate-800 block mt-0.5">${transferSales.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs text-left">
                                       <span className="text-[8px] font-black text-slate-450 uppercase tracking-wider block">M. PAGO</span>
                                       <span className="text-sm font-black text-slate-800 block mt-0.5">${mpSales.toLocaleString('es-AR')}</span>
                                    </div>
                                 </div>

                                 {metricsFilter === 'day' && metricsData.activeSession && (
                                    <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs flex justify-between items-center text-xs">
                                       <div className="text-left">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TOTAL COBRADO EN SESIÓN</span>
                                          <span className="font-extrabold text-emerald-600 block mt-0.5">${deliveredSales.toLocaleString('es-AR')}</span>
                                       </div>
                                       <div className="text-right text-[10px] text-slate-500 font-bold">
                                          ({deliveredOrdersCount} de {totalOrders} entregados)
                                       </div>
                                    </div>
                                 )}
                              </div>

                              {/* Products and Flavors */}
                              <div className="space-y-3">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Desglose de lo Vendido</h4>
                                 
                                 {productSales.length === 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-bold text-xs">
                                       No hay productos ni sabores registrados en este período.
                                    </div>
                                 ) : (
                                    <div className="space-y-4">
                                       {productSales.map((ps: any) => (
                                          <div key={ps.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                             
                                             {/* Category Title */}
                                             <div className="px-4 py-3 bg-slate-100/60 border-b border-slate-200/60 flex justify-between items-center text-left">
                                                <span className="font-extrabold text-sm text-slate-850 capitalize">{ps.name}</span>
                                                <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full">
                                                   Total: {ps.totalQty} u | ${ps.totalRevenue.toLocaleString('es-AR')}
                                                </span>
                                             </div>

                                             {/* Flavor Details */}
                                             <div className="p-4 space-y-3">
                                                {ps.variantsList.map((v: any) => {
                                                   const pct = ps.totalQty > 0 ? Math.round((v.qty / ps.totalQty) * 100) : 0
                                                   return (
                                                      <div key={v.id} className="space-y-1">
                                                         <div className="flex justify-between text-xs font-bold text-slate-700">
                                                            <span className="capitalize">{v.name}</span>
                                                            <span>{v.qty} u (${v.revenue.toLocaleString('es-AR')})</span>
                                                         </div>
                                                         <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                            <div 
                                                               className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                                                               style={{ width: `${pct}%` }}
                                                            />
                                                         </div>
                                                         <div className="text-[9px] text-slate-450 font-bold text-right">
                                                            {pct}% de {ps.name}
                                                         </div>
                                                      </div>
                                                   )
                                                })}
                                             </div>

                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>

                              {/* Waste Section */}
                              <div className="space-y-3">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Mermas (Desperdicio)</h4>
                                 
                                 {wastes.length === 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 font-bold text-xs">
                                       No se registraron mermas en este período.
                                    </div>
                                 ) : (
                                    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                                       {wastes.map((w: any) => (
                                          <div key={w.id} className="px-4 py-3 flex justify-between items-center text-xs font-bold text-left">
                                             <span className="text-slate-700 capitalize">{w.name}</span>
                                             <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                                                -{w.qty} u
                                             </span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           </>
                        )}

                     </div>

                     {/* Modal Footer */}
                     <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                        <button 
                           onClick={() => setIsMetricsModalOpen(false)}
                           className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl transition shadow-md"
                        >
                           Cerrar Métricas
                        </button>
                     </div>

                  </div>
               </div>
            </Portal>
         )}

         {/* Loading Overlay */}
         {isPending && <LoadingOverlay message="Actualizando datos de fábrica..." />}

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
