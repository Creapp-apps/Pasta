'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (product: any, qty: number) => void
  removeItem: (id: string) => void
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (product: any, qty: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
         return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: qty }]
    })
  }

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}

export function CartHeaderIcon() {
  const { items, total } = useCart()
  const params = useParams()
  const slugs = params?.tenant as string
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <Link href={`/${slugs}/checkout`} className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 transition text-orange-700 px-4 py-2 rounded-full font-bold shadow-sm">
      <ShoppingBag size={18} />
      <span>{itemCount > 0 ? `${itemCount} - $${total}` : 'Mi Pedido'}</span>
    </Link>
  )
}
