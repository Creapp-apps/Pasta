'use client'

import { useState } from 'react'
import { Save, Loader2, Image as ImageIcon } from 'lucide-react'
import { quickUpdateTenantLogoAction } from '@/app/actions/quickActions'

export default function TenantConfigPanel({ tenantData }: { tenantData: any }) {
   const [name, setName] = useState(tenantData?.name || '')
   const [logoUrl, setLogoUrl] = useState(tenantData?.logo_url || '')
   const [saving, setSaving] = useState(false)

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name) return alert("El nombre es requerido")
      setSaving(true)

      const res = await quickUpdateTenantLogoAction({ name, logoUrl })
      setSaving(false)

      if (res.error) {
         alert("Error actualizando: " + res.error)
      } else {
         alert("Identidad de la fábrica actualizada correctamente.")
         window.location.reload()
      }
   }

   return (
      <form onSubmit={handleSave} className="space-y-4">
         <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial de la Fábrica *</label>
            <input 
               type="text" 
               required
               value={name} 
               onChange={e => setName(e.target.value)} 
               placeholder="Ej. Casa de Pastas Rosti"
               className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
            />
         </div>

         <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">URL de Logotipo (Imagen)</label>
            <div className="flex gap-2">
               <input 
                  type="url" 
                  value={logoUrl} 
                  onChange={e => setLogoUrl(e.target.value)} 
                  placeholder="https://example.com/logo.png"
                  className="flex-1 w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800"
               />
               {logoUrl && (
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                     <img src={logoUrl} alt="Preview" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
               )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
               <ImageIcon size={12}/> Copiá el enlace de tu logotipo para mostrarlo en el sistema y en el catálogo digital.
            </p>
         </div>

         <button 
            type="submit" 
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition disabled:opacity-50"
         >
            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
            Guardar Cambios
         </button>
      </form>
   )
}
