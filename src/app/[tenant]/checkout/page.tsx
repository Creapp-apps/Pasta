'use client'

import { useCart } from '@/components/store/CartProvider'
import { ArrowLeft, CreditCard, Trash2, Wallet, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CheckoutPage() {
  const { items, total, removeItem } = useCart()
  const params = useParams()
  const slug = params?.tenant as string

  // TODO: Create Order via Server Action when clicked
  // For WhatsApp Link mockup format:
  const whatsappMsg = `¡Hola! Quiero hacer un pedido en *${slug}*:%0A${items.map(i => `- ${i.quantity}x ${i.name}`).join('%0A')}%0A%0A*Total: $${total}*`

  return (
     <div className="animate-in fade-in zoom-in-95 duration-400 max-w-2xl mx-auto py-8">
        <Link href={`/${slug}`} className="inline-flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full font-bold mb-8 hover:bg-orange-100 transition shadow-sm">
          <ArrowLeft size={18} /> Volver al menú
        </Link>
        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-8 tracking-tight">Completar Mi Pedido</h1>
        
        <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-slate-200 flex flex-col">
           {items.length === 0 ? (
              <div className="text-center py-12">
                 <div className="text-6xl mb-4 text-slate-200">🛒</div>
                 <p className="text-slate-500 font-medium text-lg">Tu pedido está vacío. <br/>¡Agregá unas ricas pastas para continuar!</p>
              </div>
           ) : (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                   <h3 className="font-bold text-slate-400 text-sm tracking-wider uppercase mb-4">Resumen de Compra</h3>
                   {items.map(item => (
                      <div key={item.id} className="flex justify-between items-center border-b border-slate-200/60 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                         <div>
                            <p className="font-bold text-slate-800 text-lg line-clamp-1">{item.name}</p>
                            <p className="text-sm font-semibold text-orange-600">{item.quantity} x ${item.price}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <p className="font-bold text-slate-900 text-lg">${item.quantity * item.price}</p>
                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 transition cursor-pointer"><Trash2 size={20}/></button>
                         </div>
                      </div>
                   ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 mb-10 px-2">
                   <h3 className="text-2xl font-bold text-slate-800">Total a Pagar</h3>
                   <h3 className="text-4xl font-black text-slate-900">${total}</h3>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 tracking-tight mb-2">Seleccioná tu Medio de Pago</h4>
                  
                  <label className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 transition cursor-pointer bg-white group select-none">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition"><CreditCard size={24}/></div>
                        <div>
                           <span className="block font-bold text-slate-800 text-lg">Pagar con MercadoPago</span>
                           <span className="text-sm text-slate-500 font-medium">Tarjetas y dinero en cuenta</span>
                        </div>
                     </div>
                     <input type="radio" name="payment" className="w-5 h-5 text-orange-500 focus:ring-orange-500" />
                  </label>
                  
                  <label className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 transition cursor-pointer bg-white group select-none">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition"><Wallet size={24}/></div>
                        <div>
                           <span className="block font-bold text-slate-800 text-lg">Efectivo / Transferencia</span>
                           <span className="text-sm text-slate-500 font-medium">Abonás al retirar o al repartidor</span>
                        </div>
                     </div>
                     <input type="radio" name="payment" className="w-5 h-5 text-orange-500 focus:ring-orange-500" defaultChecked />
                  </label>
                </div>

                <div className="pt-10">
                   <a target="_blank" href={`https://wa.me/5491112345678?text=${whatsappMsg}`} className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BE5A] text-white font-extrabold text-lg py-5 rounded-2xl transition cursor-pointer shadow-lg shadow-[#25D366]/30">
                     <MessageCircle size={24} /> Confirmar vía WhatsApp
                   </a>
                   <p className="text-center font-medium text-sm text-slate-400 mt-5 leading-relaxed">Al hacer clic enviaremos tu carrito armado directamente<br/>al canal de atención de la fábrica para el cierre.</p>
                </div>
              </div>
           )}
        </div>
     </div>
  )
}
