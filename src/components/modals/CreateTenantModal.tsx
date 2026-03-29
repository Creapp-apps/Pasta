'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createFactoryWorkflow } from '@/app/actions/superAdminActions'

export default function CreateTenantModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    // Llamada segura del servidor (Action)
    const result = await createFactoryWorkflow(formData)
    
    setLoading(false)
    if (result.error) {
       setError(result.error)
    } else {
       setIsOpen(false) // Cierra el modal, el servidor ya refresca los datos automáticamente
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition cursor-pointer shadow-sm"
      >
        <Plus size={20} /> Crear Nueva Fábrica
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Alta de Nueva Fábrica (Tenant)</h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                  <X size={20} />
                </button>
             </div>
             
             <form action={handleSubmit} className="p-6 space-y-4">
                {error && (
                   <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium line-clamp-2">
                      {error}
                   </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial de la Fábrica</label>
                  <input required name="name" type="text" placeholder="Ej: Pastas Roma" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Micro-Sitio Web (Subruta)</label>
                  <div className="flex focus-within:ring-2 focus-within:ring-orange-500 rounded-lg overflow-hidden border border-slate-200">
                     <span className="px-3 py-2 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 font-mono">/</span>
                     <input required name="slug" type="text" placeholder="pastas-roma" className="w-full px-3 py-2 focus:outline-none focus:ring-0 border-0" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Acá ingresarán los clientes de tu fábrica (Ej: app.com/pastas-roma)</p>
                </div>
                
                <h4 className="font-semibold text-slate-800 pt-4 border-t border-slate-100 mt-6">Cuenta de Administrador (Fábrica)</h4>
                <p className="text-xs text-slate-500 mb-2">Este será el primer usuario dueño de esta fábrica. Podrá ingresar con Login.</p>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email del Dueño de la Fábrica</label>
                  <input required name="ownerEmail" type="email" placeholder="dueño@fabrica.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
                  <input required name="ownerPassword" type="text" placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                </div>

                <div className="pt-4 flex justify-end gap-3 mt-8">
                   <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer">
                     Cancelar
                   </button>
                   <button disabled={loading} type="submit" className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-70">
                     {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Registro'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </>
  )
}
