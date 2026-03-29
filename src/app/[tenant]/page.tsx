import { createClient } from '@/utils/supabase/server'
import ProductCard from '@/components/store/ProductCard'

export default async function StorefrontPage({ params }: { params: { tenant: string } }) {
  const { tenant: slug } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single()
  
  if (!tenant) return <p>Fábrica no encontrada.</p>

  // Leer productos activos
  const { data: products } = await supabase
     .from('products')
     .select('*')
     .eq('tenant_id', tenant.id)
     .eq('type', 'finished')
     .order('name', { ascending: true })

  return (
     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
        <div className="mb-10 text-center md:text-left">
           <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">Nuestras Especialidades</h1>
           <p className="text-slate-600 mt-3 text-lg">Armá tu pedido de pastas frescas y te avisaremos cuando esté listo para retirar o en camino a tu domicilio.</p>
        </div>
        
        {(!products || products.length === 0) ? (
           <div className="bg-white p-12 lg:p-24 rounded-3xl border border-slate-200 text-center shadow-sm">
             <div className="text-7xl mb-6">🤌</div>
             <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Próximamente</h2>
             <p className="text-slate-500 text-lg max-w-md mx-auto">La fábrica está amasando y preparando su catálogo digital. ¡Volvé a intentarlo en unos días!</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {products.map(p => (
                 <ProductCard key={p.id} product={p} />
              ))}
           </div>
        )}
     </div>
  )
}
