import { createClient } from '@/utils/supabase/server'
import ProductionPanel from '@/components/production/ProductionPanel'

export default async function ProductionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single()

  // Buscar Recetas Activas en la fábrica
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, base_yield,
      products!recipes_finished_product_id_fkey(id, name, unit_of_measure)
    `)
    .eq('tenant_id', userData.tenant_id)

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-200 gap-4">
         <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Terminal de Producción</h2>
            <p className="text-slate-500 text-lg font-medium">Marcá qué producto elaboraste para actualizar el almacén y sumar puntos.</p>
         </div>
      </div>

      <ProductionPanel recipes={recipes || []} userData={userData} />
    </div>
  )
}
