import { Activity, Factory, TrendingUp, Users, Plus, AlertCircle, ShoppingCart, Package } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import CreateTenantModal from '@/components/modals/CreateTenantModal'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: superAdmin } = await supabase.from('super_admins').select('*').eq('id', user?.id).single()

  const isSuperAdmin = !!superAdmin

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

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard title="Fábricas Activas" value={tenants?.length.toString() || "0"} icon={<Factory className="text-blue-500" />} />
           <StatCard title="Ingresos Recurrentes" value="$ 0 USD" icon={<TrendingUp className="text-green-500" />} />
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
  const { data: userData } = await supabase.from('users').select('*, tenants(name)').eq('id', user?.id).single()
  const tenantName = userData?.tenants?.name || "Fábrica"
  const tenantId = userData?.tenant_id

  const { data: pendingOrders } = await supabase.from('orders').select('*').eq('tenant_id', tenantId).eq('status', 'pending')
  const { data: totalProducts } = await supabase.from('products').select('*').eq('tenant_id', tenantId)

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
       <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">Panel de {tenantName}</h2>
             <p className="text-slate-500 text-sm">Resumen operativo general de tu sucursal</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard title="Pedidos para Hoy" value={pendingOrders?.length.toString() || "0"} icon={<ShoppingCart className="text-orange-500" />} />
         <StatCard title="Productos Cargados" value={totalProducts?.length.toString() || "0"} icon={<Package className="text-blue-500" />} />
         <StatCard title="Ventas del Turno" value="$ 0 USD" icon={<TrendingUp className="text-green-500" />} />
         <StatCard title="Mermas (Desperdicio)" value="0 kg" icon={<AlertCircle className="text-red-500" />} />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[300px]">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Últimos Pedidos B2C Ingresados</h3>
            {pendingOrders?.length === 0 ? (
               <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                 <ShoppingCart size={48} className="text-slate-200 mb-4" />
                 <p className="text-slate-500 font-medium">Aún no ingresaron pedidos desde el portal.</p>
               </div>
            ) : (
               <div className="text-slate-500">
                  {/* Se mapearán los pedidos aquí */}
               </div>
            )}
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Accesos Rápidos</h3>
            <div className="space-y-3">
               <Link href="/dashboard/products" className="block w-full text-center px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl transition cursor-pointer">
                  Depósito (Pastas e Insumos)
               </Link>
               <Link href="/dashboard/recipes" className="block w-full text-center px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer shadow-md">
                  Cargar Recetas (BOM)
               </Link>
               <Link href="/dashboard/logistics" className="block w-full text-center px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed text-slate-600 font-bold rounded-xl transition cursor-pointer">
                  Despachos y Entregas
               </Link>
            </div>
         </div>
       </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition">
      <div className="p-4 bg-slate-50 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
