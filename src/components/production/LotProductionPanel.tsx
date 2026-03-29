'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Printer, Tag } from 'lucide-react'
import { produceLot } from '@/app/actions/lotProductionActions'

export default function LotProductionPanel({ products, variants, userData }: { products: any[], variants: any[], userData: any }) {
   const [selProduct, setSelProduct] = useState<string>('')
   const [selVariant, setSelVariant] = useState<string>('')
   const [qty, setQty] = useState('')
   const [loading, setLoading] = useState(false)
   const [result, setResult] = useState<any>(null)

   const productVariants = variants.filter((v: any) => v.product_id === selProduct)

   const handleProduce = async () => {
      if (!selProduct || !qty || Number(qty) <= 0) return alert("Seleccioná un producto y cantidad")
      setLoading(true)
      const res = await produceLot({
         productId: selProduct,
         variantId: selVariant || null,
         quantity: Number(qty)
      })
      setLoading(false)
      if (res.error) return alert(res.error)
      setResult(res)
      setSelProduct(''); setSelVariant(''); setQty('')
      setTimeout(() => setResult(null), 10000)
   }

   const printLabel = () => {
      if (!result) return
      const productName = products.find((p: any) => p.id === selProduct)?.name || result.lotCode
      const variantName = selVariant ? variants.find((v: any) => v.id === selVariant)?.name : ''
      
      const labelHtml = `
         <html><head><style>
            @page { size: 40mm 30mm; margin: 2mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; text-align: center; }
            .lot { font-size: 14px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
            .name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .date { font-size: 9px; color: #555; }
         </style></head><body>
            <div class="lot">${result.lotCode}</div>
            <div class="name">${productName}${variantName ? ' - ' + variantName : ''}</div>
            <div class="date">Elab: ${new Date().toLocaleDateString('es-AR')}</div>
         </body></html>
      `
      const printWindow = window.open('', '_blank', 'width=300,height=200')
      if (printWindow) {
         printWindow.document.write(labelHtml)
         printWindow.document.close()
         printWindow.print()
      }
   }

   return (
      <div className="space-y-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué producto fabricaste?</label>
               <select value={selProduct} onChange={e => { setSelProduct(e.target.value); setSelVariant('') }} className="w-full px-4 py-4 border border-slate-200 rounded-xl bg-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">-- Elegir producto --</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.unit_of_measure})</option>)}
               </select>
            </div>

            {productVariants.length > 0 && (
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">¿Qué variante / sabor?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                     {productVariants.map((v: any) => (
                        <button key={v.id} onClick={() => setSelVariant(v.id)} className={`p-4 rounded-xl border-2 text-left transition font-bold ${selVariant === v.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                           {v.name}
                           {v.price_override && <span className="block text-sm text-orange-600 mt-1">${v.price_override}</span>}
                        </button>
                     ))}
                  </div>
               </div>
            )}

            {selProduct && (
               <div className="flex items-end gap-4 bg-slate-900 p-6 rounded-2xl">
                  <div className="flex-1">
                     <label className="block text-sm font-bold text-slate-300 mb-2">Cantidad Producida</label>
                     <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" step="0.5" placeholder="0" className="w-full px-4 py-4 bg-slate-800 text-white text-3xl font-black text-center rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"/>
                  </div>
                  <button onClick={handleProduce} disabled={loading || !qty} className="px-8 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-orange-500/20 active:scale-95">
                     {loading ? <Loader2 className="animate-spin" size={24}/> : 'PRODUCIR'}
                  </button>
               </div>
            )}
         </div>

         {result && (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-2xl animate-in fade-in zoom-in flex items-center justify-between shadow-lg">
               <div className="flex items-center gap-4">
                  <CheckCircle2 size={36} className="text-emerald-500" strokeWidth={3}/>
                  <div>
                     <h4 className="font-black text-emerald-800 text-xl">¡Lote {result.lotCode} Registrado!</h4>
                     <p className="text-emerald-700 font-medium">Insumos descontados. +{result.points} XP</p>
                  </div>
               </div>
               <button onClick={printLabel} className="flex items-center gap-2 bg-white border-2 border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold px-6 py-3 rounded-xl transition cursor-pointer">
                  <Printer size={20}/> Imprimir Etiqueta
               </button>
            </div>
         )}
      </div>
   )
}
