import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Wheat, UtensilsCrossed, Users, Truck, Printer, Factory, CreditCard, Settings, Home, LogOut, CheckCircle2, BarChart3 } from 'lucide-react'

export default async function MobileMenuPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return null

   const { data: superAdmin } = await supabase.from('super_admins').select('*').eq('id', user.id).single()
   const isSuperAdmin = !!superAdmin

   return (
      <div className="pb-24 animate-in fade-in duration-300">
         <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">Menú Principal</h2>

         <div className="space-y-4">
            {isSuperAdmin ? (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-xs uppercase tracking-wider">
                     Sistema Maestro
                  </div>
                  <Link href="/dashboard/tenants" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                     <Factory size={24} className="text-slate-400" />
                     <span className="font-semibold text-slate-700 text-lg">Gestión de Fábricas</span>
                  </Link>
                  <Link href="/dashboard/billing" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                     <CreditCard size={24} className="text-slate-400" />
                     <span className="font-semibold text-slate-700 text-lg">Suscripciones</span>
                  </Link>
                  <Link href="/dashboard/settings" className="flex items-center gap-4 p-4 active:bg-orange-50 transition">
                     <Settings size={24} className="text-slate-400" />
                     <span className="font-semibold text-slate-700 text-lg">Configuración Global</span>
                  </Link>
               </div>
            ) : (
               <>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-xs uppercase tracking-wider">
                        Administración
                     </div>
                     <Link href="/dashboard/productos" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <UtensilsCrossed size={24} className="text-orange-500 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Stock (Productos)</span>
                     </Link>
                     <Link href="/dashboard/insumos" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <Wheat size={24} className="text-amber-600 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Insumos</span>
                     </Link>
                     <Link href="/dashboard/clientes" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <Users size={24} className="text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Clientes</span>
                     </Link>
                     <Link href="/dashboard/pedidos?tab=delivered" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Pedidos Entregados</span>
                     </Link>
                     <Link href="/dashboard" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <BarChart3 size={24} className="text-purple-500 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Métricas</span>
                     </Link>
                     <Link href="/dashboard/logistics" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <Truck size={24} className="text-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700 text-lg">Repartos</span>
                     </Link>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-xs uppercase tracking-wider">
                        Sistema
                     </div>
                     <Link href="/dashboard/configuracion" className="flex items-center gap-4 p-4 border-b border-slate-100 active:bg-orange-50 transition">
                        <Printer size={24} className="text-slate-550" />
                        <span className="font-semibold text-slate-700 text-lg">Configuración</span>
                     </Link>
                     
                     <form action="/auth/signout" method="post" className="w-full">
                        <button className="w-full flex items-center gap-4 p-4 text-left active:bg-red-50 transition text-red-500">
                           <LogOut size={24} />
                           <span className="font-bold text-lg">Cerrar Sesión</span>
                        </button>
                     </form>
                  </div>
               </>
            )}
         </div>
      </div>
   )
}
