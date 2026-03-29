import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import CartProvider, { CartHeaderIcon } from '@/components/store/CartProvider'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode,
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const supabase = await createClient()

  // Buscar si el micro-sitio existe
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tenantData) {
    notFound() // Lanza pantalla 404 nativa de nextjs
  }

  return (
    <CartProvider>
       <div className="min-h-screen bg-orange-50/50 flex flex-col">
          <header className="bg-white sticky top-0 z-40 border-b border-orange-100 shadow-sm">
             <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-orange-500 tracking-wider uppercase">Catálogo Digital</span>
                   <span className="font-black text-2xl text-slate-800 tracking-tight">
                      {tenantData.name}
                   </span>
                </div>
                <CartHeaderIcon />
             </div>
          </header>
          
          <main className="flex-1 max-w-5xl mx-auto w-full p-4 lg:p-8">
            {children}
          </main>
          
          <footer className="bg-slate-900 border-t-4 border-orange-500 text-slate-400 py-12 px-6 flex flex-col items-center gap-2 mt-16">
             <div className="text-white font-bold text-xl">{tenantData.name}</div>
             <p className="text-sm">Venta Directa de Fábrica</p>
             <div className="mt-8 text-xs text-slate-500">
               Potenciado por <strong>SaaS Fábrica de Pastas</strong>
             </div>
          </footer>
       </div>
    </CartProvider>
  )
}
