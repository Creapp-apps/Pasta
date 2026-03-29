import { createClient } from '@/utils/supabase/server'
import { Package } from 'lucide-react'
import LotProductionPanel from '@/components/production/LotProductionPanel'
import RecentLotsList from '@/components/production/RecentLotsList'

export default async function ProduccionPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single()
   
   if (!userData?.tenant_id) return <p className="p-8">Acceso denegado</p>

   // Productos terminados
   const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('type', 'finished')
      .order('name')

   // Variantes
   const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('tenant_id', userData.tenant_id)

   // Últimos lotes producidos
   const { data: recentLots } = await supabase
      .from('production_lots')
      .select('*, products(name), product_variants(name)')
      .eq('tenant_id', userData.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
               <Package className="text-orange-500" size={28} /> Terminal de Producción
            </h2>
            <p className="text-slate-500 text-sm mt-1">Registrá un lote. El sistema descuenta los insumos automáticamente y genera el código de lote.</p>
         </div>

         <LotProductionPanel products={products || []} variants={variants || []} userData={userData} />

         {/* Historial interactivo */}
         <RecentLotsList recentLots={recentLots || []} />
      </div>
   )
}
