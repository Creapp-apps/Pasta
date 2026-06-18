import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Home, Package, ShoppingCart, Users, Truck, Factory, CreditCard, Settings, Wheat, UtensilsCrossed, BarChart3, Printer, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '@/components/layout/BottomNav'
import NavigationLoader from '@/components/layout/NavigationLoader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // 1. Session Auth
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) { redirect('/login') }

  // 2. Role Check
  const { data: superAdmin } = await supabase.from('super_admins').select('*').eq('id', user.id).single()
  
  // Si no es Super Admin, verificamos su rol en una fábrica
  let employeeData = null
  let tenantData = null
  if (!superAdmin) {
     const { data: emp } = await supabase.from('users').select('*').eq('id', user.id).single()
     employeeData = emp
     if (emp) {
        const { data: ten } = await supabase.from('tenants').select('*').eq('id', emp.tenant_id).single()
        tenantData = ten
     } else {
        return (
           <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-800 flex-col gap-4">
             <h1 className="text-2xl font-bold">Acceso Pendiente</h1>
             <p className="text-slate-500 text-center max-w-sm">Tu cuenta de usuario existe pero no ha sido vinculada a ninguna fábrica ni posees rango de Súper Administrador.</p>
             <form action="/auth/signout" method="post"><button className="px-6 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 font-medium transition cursor-pointer">Reintentar con otra cuenta</button></form>
           </div>
        )
     }
  }

  const isSuperAdmin = !!superAdmin

  // Fetch data for BottomNav quick actions
  let products: any[] = []
  let clients: any[] = []
  let recipes: any[] = []
  let variants: any[] = []
  let productionLots: any[] = []
  let todayOrders: any[] = []
  let todayWaste: any[] = []
  let activeSession: any = null

  if (!isSuperAdmin && employeeData) {
     const tenantId = employeeData.tenant_id
     const { data: prodData } = await supabase.from('products').select('*').eq('tenant_id', tenantId)
     products = prodData || []

     const { data: clientData } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).order('name')
     clients = clientData || []

     const { data: recData } = await supabase.from('recipes').select('finished_product_id').eq('tenant_id', tenantId)
     recipes = recData?.map(r => r.finished_product_id) || []

     const { data: varData } = await supabase.from('product_variants').select('*').eq('tenant_id', tenantId)
     variants = varData || []

     const { data: lotsData } = await supabase.from('production_lots').select('*').eq('tenant_id', tenantId).gt('quantity_remaining', 0)
     productionLots = lotsData || []

     // Fetch metrics for Metrics Modal in Argentina timezone (UTC-3)
     const now = new Date()
     const arOffset = -3
     const arTime = new Date(now.getTime() + (arOffset * 60 * 60 * 1000))
     const arStartOfDay = new Date(Date.UTC(
       arTime.getUTCFullYear(),
       arTime.getUTCMonth(),
       arTime.getUTCDate(),
       3, 0, 0, 0
     ))
     const todayIso = arStartOfDay.toISOString()

     const { data: todayOrdData } = await supabase
        .from('orders')
        .select('total_calc, payment_method, status, cash_session_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayIso)
     todayOrders = todayOrdData || []

     const { data: todayWstData } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('tenant_id', tenantId)
        .eq('movement_type', 'waste')
        .gte('created_at', todayIso)
     todayWaste = todayWstData || []

     const { data: actSessData } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .maybeSingle()
     activeSession = actSessData
  }

  const roleTitle = isSuperAdmin ? "Súper Admin Maestro" : employeeData?.role || "Inactivo"
  const userInitial = user.email?.charAt(0).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar Dinámico (Oculto en celular) */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex flex-col shadow-sm shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            {isSuperAdmin ? (
               <span className="bg-orange-500 text-white p-1.5 rounded-lg">
                 <Factory size={20}/>
               </span>
            ) : tenantData?.logo_url ? (
               <img src={tenantData.logo_url} alt="Logo" className="h-9 w-9 object-contain rounded-lg border border-slate-100 shrink-0" />
            ) : (
               <span className="bg-orange-500 text-white p-1.5 rounded-lg">
                 <Home size={20}/>
               </span>
            )}
            <span className="truncate max-w-[150px]">
               {isSuperAdmin ? 'Panel SaaS' : tenantData?.name || 'Fábrica'}
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {/* Menú Súper Admin */}
          {isSuperAdmin && (
             <>
               <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Home size={20} /> Resumen General
               </Link>
               <Link href="/dashboard/tenants" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Factory size={20} /> Gestión de Fábricas
               </Link>
               <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <CreditCard size={20} /> Pagos de Suscripción
               </Link>
               <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Settings size={20} /> Configuración Global
               </Link>
             </>
          )}

          {/* Menú Empleados/Admin de Fábrica */}
          {!isSuperAdmin && (
             <>
               <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Home size={20} /> Mi Resumen
               </Link>

               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 pt-5 pb-1">Inventario</p>
               <Link href="/dashboard/insumos" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Wheat size={20} /> Insumos
               </Link>
               <Link href="/dashboard/productos" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <UtensilsCrossed size={20} /> Productos
               </Link>
               <Link href="/dashboard/stock" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <BarChart3 size={20} /> Stock Central
               </Link>

               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 pt-5 pb-1">Operaciones</p>
               <Link href="/dashboard/produccion" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Package size={20} /> Producción
               </Link>
               <Link href="/dashboard/pedidos" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <ShoppingCart size={20} /> Pedidos
               </Link>
               <Link href="/dashboard/clientes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Users size={20} /> Clientes
               </Link>
               <Link href="/dashboard/logistics" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Truck size={20} /> Reparto
               </Link>

               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 pt-5 pb-1">Sistema</p>
               <Link href="/dashboard/configuracion" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition font-medium">
                 <Printer size={20} /> Configuración
               </Link>
             </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 capitalize">
              {userInitial}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-slate-900 truncate">{user.email}</span>
              <span className="text-xs text-orange-600 font-bold truncate capitalize">{roleTitle}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white/50 backdrop-blur-md sticky top-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-slate-700 transition">
              <ChevronLeft size={18} /> Volver
            </Link>
            <span className="text-slate-200">|</span>
            <h1 className="text-xl font-semibold text-slate-800">{isSuperAdmin ? 'Panel Maestro' : 'Administración'}</h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 transition cursor-pointer">
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </form>
        </header>

        <div className="p-4 md:p-8 pb-32 md:pb-8">
          {children}
        </div>
      </main>

      {/* Loader de navegación global */}
      <NavigationLoader />

      {/* Tab Bar Móvil */}
      <BottomNav 
         isSuperAdmin={isSuperAdmin}
         products={products}
         clients={clients}
         recipes={recipes}
         variants={variants}
         productionLots={productionLots}
         userData={employeeData}
         tenantData={tenantData}
         todayOrders={todayOrders}
         todayWaste={todayWaste}
         activeSession={activeSession}
      />
    </div>
  )
}

