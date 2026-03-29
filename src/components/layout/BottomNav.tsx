'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, BarChart3, ShoppingCart, Menu } from 'lucide-react'

export default function BottomNav() {
   const pathname = usePathname()

   const isRouteActive = (route: string) => {
      if (route === '/dashboard') return pathname === '/dashboard'
      return pathname.startsWith(route)
   }

   const navItems = [
      { href: '/dashboard', label: 'Inicio', icon: Home },
      { href: '/dashboard/produccion', label: 'Elaborar', icon: Package },
      { href: '/dashboard/stock', label: 'Stock', icon: BarChart3 },
      { href: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingCart },
      { href: '/dashboard/menu', label: 'Menú', icon: Menu },
   ]

   return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex items-center justify-around h-16">
            {navItems.map(item => {
               const Icon = item.icon
               const isActive = isRouteActive(item.href)

               return (
                  <Link 
                     key={item.href} 
                     href={item.href}
                     className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                        isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'
                     }`}
                  >
                     <Icon size={22} className={isActive ? 'opacity-100' : 'opacity-80'} strokeWidth={isActive ? 2.5 : 2} />
                     <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                        {item.label}
                     </span>
                  </Link>
               )
            })}
         </div>
      </nav>
   )
}
