import { createClient } from '@/utils/supabase/server'
import { PackageOpen, ArrowRight, Truck } from 'lucide-react'
import Link from 'next/link'
import OrdersList from '@/components/orders/OrdersList'

export default async function PedidosPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return <div className="p-8">Sesión expirada</div>

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return <div className="p-8">Error de inquilino</div>

   const [ordersRes, productsRes, variantsRes, repartidoresRes, activeSessionRes] = await Promise.all([
      supabase
         .from('orders')
         .select('*, clients(name, address, phone_number), order_items(id, quantity, unit_price, products(name), product_variants(name))')
         .eq('tenant_id', userData.tenant_id)
         .order('created_at', { ascending: false }),
      supabase
         .from('products')
         .select('*')
         .eq('tenant_id', userData.tenant_id),
      supabase
         .from('product_variants')
         .select('*')
         .eq('tenant_id', userData.tenant_id),
      supabase
         .from('users')
         .select('id, full_name')
         .eq('tenant_id', userData.tenant_id)
         .eq('role', 'repartidor'),
      supabase
         .from('cash_sessions')
         .select('*')
         .eq('tenant_id', userData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()
   ])

   const orders = ordersRes.data
   const products = productsRes.data
   const variants = variantsRes.data
   const repartidores = repartidoresRes.data
   const activeSession = activeSessionRes.data

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
            <OrdersList 
               orders={orders} 
               products={products || []} 
               variants={variants || []} 
               repartidores={repartidores || []} 
               activeSession={activeSession}
            />
         )}
      </div>
   )
}
