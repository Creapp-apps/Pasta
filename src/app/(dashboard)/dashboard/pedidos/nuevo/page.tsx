import { createClient } from '@/utils/supabase/server'
import NewOrderPOS from '@/components/orders/NewOrderPOS'

export default async function NuevoPedidoPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return <div className="p-8">Sesión expirada</div>

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return <div className="p-8">Error de inquilino</div>

   const [productsRes, variantsRes, clientsRes, lotsRes] = await Promise.all([
      supabase.from('products').select('*').eq('tenant_id', userData.tenant_id).eq('type', 'finished'),
      supabase.from('product_variants').select('*').eq('tenant_id', userData.tenant_id),
      supabase.from('clients').select('*').eq('tenant_id', userData.tenant_id),
      supabase.from('production_lots').select('*').eq('tenant_id', userData.tenant_id).gt('quantity_remaining', 0)
   ])

   return (
      <div className="animate-in fade-in zoom-in-95 duration-500 pb-20">
         <NewOrderPOS 
            products={productsRes.data || []}
            variants={variantsRes.data || []}
            clients={clientsRes.data || []}
            activeLots={lotsRes.data || []}
         />
      </div>
   )
}
