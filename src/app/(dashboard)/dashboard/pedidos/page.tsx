import { createClient } from '@/utils/supabase/server'
import { PackageOpen, ArrowRight, Truck } from 'lucide-react'
import Link from 'next/link'

const formatARS = (amount: number) => {
   return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

export default async function PedidosPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return <div className="p-8">Sesión expirada</div>

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return <div className="p-8">Error de inquilino</div>

   const { data: orders } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .eq('tenant_id', userData.tenant_id)
      .order('created_at', { ascending: false })

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <PackageOpen className="text-orange-500" size={28} /> Pedidos y Ventas
               </h2>
               <p className="text-slate-500 text-sm mt-1">Acá caen todos los pedidos facturados, listos para enviar.</p>
            </div>
            <Link href="/dashboard/pedidos/nuevo" className="w-full md:w-auto flex justify-center items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg transition">
               NUEVO PEDIDO <ArrowRight size={18}/>
            </Link>
         </div>

         {(!orders || orders.length === 0) ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center">
               <Truck className="mx-auto text-slate-300 mb-4" size={48} />
               <h3 className="text-xl font-bold text-slate-700">Sin pedidos activos</h3>
               <p className="text-slate-500 mt-2 max-w-sm mx-auto">Cuando cobres y descuentes tu primer pedido desde el Punto de Venta, aparecerá acá.</p>
            </div>
         ) : (
            <>
            {/* Vista Mobile (Tarjetas) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
               {orders.map(o => (
                  <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                     <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-mono font-bold text-slate-800">#{o.id.substring(0,8)}</span>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{o.status}</span>
                     </div>
                     <div>
                        <p className="font-semibold text-slate-700 text-lg">{o.clients?.name || 'Consumidor Final'}</p>
                        <p className="text-slate-500 text-sm mt-1 border-t border-slate-50 pt-2 flex justify-between">
                           <span>{o.payment_method === 'cash' ? '💵 Efectivo' : o.payment_method === 'transfer' ? '🏦 Transf.' : '📲 MP'}</span>
                           <span className="font-black text-slate-800 text-lg">{formatARS(o.total_calc)}</span>
                        </p>
                     </div>
                  </div>
               ))}
            </div>

            {/* Vista Desktop (Tabla) */}
            <div className="hidden md:block bg-white border text-center border-slate-200 rounded-2xl overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                     <tr className="text-sm font-bold text-slate-500 p-4">
                        <td className="p-4">ID Pedido</td>
                        <td className="p-4">Cliente</td>
                        <td className="p-4">Estado</td>
                        <td className="p-4">Método Pago</td>
                        <td className="p-4 text-right">Total $</td>
                     </tr>
                  </thead>
                  <tbody>
                     {orders.map(o => (
                        <tr key={o.id} className="border-b border-slate-100 hover:bg-orange-50/50 transition">
                           <td className="p-4 font-mono font-bold text-slate-800">#{o.id.substring(0,8)}</td>
                           <td className="p-4 font-semibold text-slate-700">{o.clients?.name || 'Consumidor Final'}</td>
                           <td className="p-4">
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{o.status}</span>
                           </td>
                           <td className="p-4 text-slate-500 text-sm font-medium">{o.payment_method === 'cash' ? 'Efectivo' : o.payment_method === 'transfer' ? 'Transferencia' : 'Mercado Pago'}</td>
                           <td className="p-4 text-right font-black text-slate-800 text-lg">{formatARS(o.total_calc)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            </>
         )}
      </div>
   )
}
