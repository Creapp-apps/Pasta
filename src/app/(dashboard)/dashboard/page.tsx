import { Activity, Factory, TrendingUp, Users, Plus, AlertCircle, ShoppingCart, Package } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import CreateTenantModal from '@/components/modals/CreateTenantModal'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [superAdminRes, userDataRes] = await Promise.all([
    supabase.from('super_admins').select('*').eq('id', user.id).single(),
    supabase.from('users').select('*, tenants(name)').eq('id', user.id).single()
  ])

  const superAdmin = superAdminRes.data
  const isSuperAdmin = !!superAdmin
  const userData = userDataRes.data

  // VISTA 1: SUPER ADMIN MAESTRO
  if (isSuperAdmin) {
     const { data: tenants } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })

     return (
       <div className="space-y-6 animate-in fade-in zoom-in duration-500">
         <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
               <h2 className="text-2xl font-bold text-slate-800">Métricas Súper Admin</h2>
               <p className="text-slate-500 text-sm">Visión general del SaaS de Fábricas de Pastas</p>
            </div>
            <CreateTenantModal />
         </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Fábricas Activas" value={tenants?.length.toString() || "0"} icon={<Factory className="text-blue-500" />} />
            <StatCard title="Ingresos Recurrentes" value="$ 0" icon={<TrendingUp className="text-green-500" />} />
            <StatCard title="Pagos Pendientes" value="0" icon={<AlertCircle className="text-red-500" />} />
          </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Nómina de Fábricas (Tenants)</h3>
           
           {tenants?.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center">
                 <Factory size={48} className="text-slate-200 mb-4" />
                 <p className="text-slate-700 font-bold text-xl mb-2">Aún no hay fábricas de pastas registradas.</p>
                 <p className="text-slate-500 text-sm max-w-sm">Este es el panel que vas a usar vos, pero necesitas agregar tu primer cliente (Tenant) dándole clic al botón de arriba.</p>
              </div>
           ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                     <th className="py-3 font-medium">Nombre de la Fábrica</th>
                     <th className="py-3 font-medium">Sitio Web (Micro-ecomm)</th>
                     <th className="py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants?.map(t => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="py-4 text-orange-500 hover:text-orange-600 underline font-medium cursor-pointer">/{t.slug}</td>
                      <td className="py-4">
                         <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                           {t.payment_status}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           )}
         </div>
       </div>
     )
  }

  // VISTA 2: EMPLEADOS Y ADMINS DE LAS FABRICAS
  const tenantName = userData?.tenants?.name || "Fábrica"
  const tenantId = userData?.tenant_id

  // Obtener ventas del día en la zona horaria de Argentina (UTC-3)
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
  const arTodayStr = arStartOfDay.toISOString().split('T')[0]

  const [
    pendingOrdersRes,
    totalProductsRes,
    clientsRes,
    recipesRes,
    allVariantsRes,
    activeLotsRes,
    todayOrdersRes,
    todayWasteRes
  ] = await Promise.all([
    supabase.from('orders').select('*').eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('products').select('*').eq('tenant_id', tenantId),
    supabase.from('clients').select('*').eq('tenant_id', tenantId).order('name'),
    supabase.from('recipes').select('finished_product_id').eq('tenant_id', tenantId),
    supabase.from('product_variants').select('*').eq('tenant_id', tenantId),
    supabase.from('production_lots').select('*').eq('tenant_id', tenantId).neq('quantity_remaining', 0),
    supabase.from('orders')
      .select('total_calc')
      .eq('tenant_id', tenantId)
      .gte('created_at', todayIso)
      .or(`scheduled_date.is.null,scheduled_date.lte.${arTodayStr}`),
    supabase.from('stock_movements')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('movement_type', 'waste')
      .gte('created_at', todayIso)
  ])

  const pendingOrders = pendingOrdersRes.data
  const totalProducts = totalProductsRes.data
  const clients = clientsRes.data
  const recipesData = recipesRes.data
  const recipes = recipesData?.map(r => r.finished_product_id) || []
  const allVariants = allVariantsRes.data
  const activeLots = activeLotsRes.data
  const todayOrders = todayOrdersRes.data
  const todayWaste = todayWasteRes.data

  const shiftSales = todayOrders?.reduce((acc, curr) => acc + Number(curr.total_calc || 0), 0) || 0
  const shiftWaste = todayWaste?.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0) || 0

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
       <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">Panel de {tenantName}</h2>
             <p className="text-slate-500 text-sm">Resumen operativo general de tu sucursal</p>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <StatCard title="Pedidos para Hoy" value={pendingOrders?.length.toString() || "0"} icon={<ShoppingCart className="text-orange-500" />} />
         <StatCard title="Productos Cargados" value={totalProducts?.length.toString() || "0"} icon={<Package className="text-blue-500" />} />
         <StatCard title="Ventas del Turno" value={`$ ${shiftSales.toLocaleString('es-AR')}`} icon={<TrendingUp className="text-green-500" />} />
         <StatCard title="Mermas (Desperdicio)" value={`${shiftWaste} kg`} icon={<AlertCircle className="text-red-500" />} />
       </div>

       <div className="space-y-6">
          {/* Pedidos Pendientes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[220px]">
             <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Pedidos Pendientes de Entrega</h3>
             {pendingOrders?.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <ShoppingCart size={40} className="text-slate-200 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">Aún no ingresaron pedidos desde el portal.</p>
                </div>
             ) : (
                <div className="text-slate-500">
                   {/* Se mapearán los pedidos aquí */}
                </div>
             )}
          </div>

          {/* Stock en Tiempo Real por Sabor */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
                <Package size={20} className="text-orange-500"/>
                Stock Físico de Sorrentinos y Pastas
             </h3>
             
             {(() => {
                const finishedProducts = totalProducts?.filter(p => p.type === 'finished') || []
                if (finishedProducts.length === 0) {
                   return <p className="text-slate-400 text-sm text-center py-6">No hay productos terminados cargados en el inventario.</p>
                }
                return (
                   <div className="space-y-4">
                      {finishedProducts.map(prod => {
                         const prodVariants = allVariants?.filter(v => v.product_id === prod.id) || []
                         const prodLots = activeLots?.filter(l => l.product_id === prod.id) || []
                         const totalStock = prodLots.length > 0
                            ? prodLots.reduce((acc, curr) => acc + Number(curr.quantity_remaining || 0), 0)
                            : Number(prod.current_stock || 0)
                         return (
                            <div key={prod.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                               <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 mb-3">
                                  <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                     <Package size={16} className="text-orange-500"/>
                                     {prod.name}
                                  </span>
                                  <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-xl text-xs">
                                     Total: {totalStock} {prod.unit_of_measure}
                                  </span>
                               </div>
                               
                               {prodVariants.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                     {prodVariants.map(v => {
                                        const varLots = activeLots?.filter(l => l.variant_id === v.id) || []
                                        const varStock = varLots.reduce((acc, curr) => acc + Number(curr.quantity_remaining || 0), 0)
                                        return (
                                           <div key={v.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm text-xs" title={v.name}>
                                              <span className="font-bold text-slate-600 truncate pr-2">{v.name.split(' (')[0]}</span>
                                              <span className={`font-mono font-black ${varStock > 0 ? 'text-emerald-600' : varStock < 0 ? 'text-red-500 font-extrabold' : 'text-slate-400'}`}>
                                                 {varStock} {prod.unit_of_measure}
                                              </span>
                                           </div>
                                        )
                                     })}
                                  </div>
                               ) : (
                                  <p className="text-xs text-slate-500 italic">Este producto no posee variantes/sabores.</p>
                               )}
                            </div>
                         )
                      })}
                   </div>
                )
             })()}
          </div>
       </div>

    </div>
  )
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between h-36 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div className="p-3 bg-slate-50 rounded-2xl">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-tight">{title}</p>
        <p className="text-xl md:text-2xl font-black text-slate-900 mt-1 truncate">{value}</p>
      </div>
    </div>
  )
}
