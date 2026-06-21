'use client'

import { useState } from 'react'
import { Save, Loader2, Image as ImageIcon, Plus, Trash2, Users } from 'lucide-react'
import { quickUpdateTenantLogoAction } from '@/app/actions/quickActions'

export default function TenantConfigPanel({ tenantData }: { tenantData: any }) {
   const [name, setName] = useState(tenantData?.name || '')
   const [logoUrl, setLogoUrl] = useState(tenantData?.logo_url || '')
   const [saving, setSaving] = useState(false)

   const [contacts, setContacts] = useState<{ name: string; phone: string }[]>(() => {
      const dbContacts = tenantData?.whatsapp_contacts
      if (Array.isArray(dbContacts) && dbContacts.length > 0) {
         return dbContacts
      }
      // Default contact as requested by the user
      return [{ name: 'Contacto por Defecto', phone: '1123446948' }]
   })

   const [newContactName, setNewContactName] = useState('')
   const [newContactPhone, setNewContactPhone] = useState('')

   const handleAddContact = () => {
      if (!newContactName.trim() || !newContactPhone.trim()) {
         return alert("Completá el nombre y teléfono del contacto.")
      }
      
      // Clean phone number (leave digits only)
      const cleanedPhone = newContactPhone.replace(/\D/g, '')
      if (cleanedPhone.length < 8) {
         return alert("El número de teléfono parece inválido. Ingresá al menos 8 números.")
      }

      setContacts([...contacts, { name: newContactName.trim(), phone: cleanedPhone }])
      setNewContactName('')
      setNewContactPhone('')
   }

   const handleRemoveContact = (index: number) => {
      setContacts(contacts.filter((_, i) => i !== index))
   }

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name) return alert("El nombre es requerido")
      setSaving(true)

      const res = await quickUpdateTenantLogoAction({ 
         name, 
         logoUrl, 
         whatsappContacts: contacts 
      })
      setSaving(false)

      if (res.error) {
         alert("Error actualizando: " + res.error)
      } else {
         alert("Configuración de la fábrica actualizada correctamente.")
         window.location.reload()
      }
   }

   return (
      <form onSubmit={handleSave} className="space-y-6">
         <div className="space-y-4">
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
         </div>

         {/* Configuración de Contactos de WhatsApp */}
         <div className="border-t border-slate-100 pt-6">
            <h4 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
               <Users className="text-orange-500" size={20}/> Destinatarios de Reportes (WhatsApp)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
               Agregá las personas a quienes se les enviará el reporte de stock. Los números telefónicos deben incluir el código de área (ej: 1123446948).
            </p>

            {/* List of Contacts */}
            <div className="space-y-2 mb-4">
               {contacts.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No hay contactos agregados.</p>
               ) : (
                  contacts.map((contact, index) => (
                     <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800 text-sm">{contact.name}</span>
                           <span className="text-xs text-slate-500 font-mono">{contact.phone}</span>
                        </div>
                        <button
                           type="button"
                           onClick={() => handleRemoveContact(index)}
                           className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                           title="Eliminar contacto"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  ))
               )}
            </div>

            {/* Add New Contact Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
               <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Contacto</label>
                  <input
                     type="text"
                     placeholder="Ej. Juan (Encargado)"
                     value={newContactName}
                     onChange={e => setNewContactName(e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Celular (con código de área)</label>
                  <div className="flex gap-2">
                     <input
                        type="text"
                        placeholder="Ej. 1123446948"
                        value={newContactPhone}
                        onChange={e => setNewContactPhone(e.target.value)}
                        className="flex-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800"
                     />
                     <button
                        type="button"
                        onClick={handleAddContact}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer"
                     >
                        <Plus size={14}/> Agregar
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
               type="submit" 
               disabled={saving}
               className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
            >
               {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
               Guardar Cambios
            </button>
         </div>
      </form>
   )
}
