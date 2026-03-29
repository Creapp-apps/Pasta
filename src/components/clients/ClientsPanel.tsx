'use client'

import { useState } from 'react'
import { Plus, Search, MapPin, Phone, Building2, User, Pencil, Trash2, X, Save, Loader2, Building, Map, Navigation } from 'lucide-react'
import { createClientAction, updateClientAction, deleteClientAction } from '@/app/actions/clientActions'

export default function ClientsPanel({ initialClients }: { initialClients: any[] }) {
   const [clients, setClients] = useState(initialClients || [])
   const [searchQuery, setSearchQuery] = useState('')
   
   // Form state
   const [isFormOpen, setIsFormOpen] = useState(false)
   const [editingClient, setEditingClient] = useState<any>(null)
   const [saving, setSaving] = useState(false)
   
   // Form fields
   const [customerType, setCustomerType] = useState('b2c')
   const [name, setName] = useState('')
   const [phone, setPhone] = useState('')
   const [address, setAddress] = useState('')
   const [cuit, setCuit] = useState('')
   const [lat, setLat] = useState<number | null>(null)
   const [lon, setLon] = useState<number | null>(null)
   const [gettingGPS, setGettingGPS] = useState(false)

   const filteredClients = clients.filter((c: any) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.phone_number && c.phone_number.includes(searchQuery))
   )

   const openForm = (client: any = null) => {
      setEditingClient(client)
      if (client) {
         setCustomerType(client.customer_type || 'b2c')
         setName(client.name || '')
         setPhone(client.phone_number || '')
         setAddress(client.address || '')
         setCuit(client.cuit || '')
         setLat(client.latitude || null)
         setLon(client.longitude || null)
      } else {
         setCustomerType('b2c')
         setName('')
         setPhone('')
         setAddress('')
         setCuit('')
         setLat(null)
         setLon(null)
      }
      setIsFormOpen(true)
   }

   const saveClient = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name) return alert("El nombre es requerido")
      setSaving(true)

      let finalLat = lat
      let finalLon = lon

      // Si hay dirección y es nueva o cambió Y NO TENEMOS GPS, geocodificamos gratis con Nominatim (OSM)
      if (address && (!editingClient || editingClient.address !== address) && (!finalLat || !finalLon)) {
         try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            const data = await res.json()
            if (data && data.length > 0) {
               finalLat = parseFloat(data[0].lat)
               finalLon = parseFloat(data[0].lon)
            }
         } catch (error) {
            console.error("Error geocodificando la dirección:", error)
         }
      }

      const payload = { 
         customer_type: customerType, 
         name, 
         phone_number: phone, 
         address, 
         cuit, 
         latitude: finalLat !== null ? finalLat : undefined, 
         longitude: finalLon !== null ? finalLon : undefined 
      }

      if (editingClient) {
         const res = await updateClientAction(editingClient.id, payload)
         if (res.error) alert(res.error)
         else {
            setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...payload } : c))
            setIsFormOpen(false)
         }
      } else {
         const res = await createClientAction(payload)
         if (res.error) alert(res.error)
         else {
            // Recargar para traer el ID real (idealmente con router.refresh pero actualizamos state local para rapidez)
            window.location.reload()
         }
      }
      setSaving(false)
   }

   const deleteClient = async (c: any) => {
      if (!confirm(`¿Eliminar cliente ${c.name}? Las órdenes atadas a él quedarán sin cliente asignado (anónimas).`)) return
      const res = await deleteClientAction(c.id)
      if (res.error) alert(res.error)
      else setClients(clients.filter(x => x.id !== c.id))
   }

   const handleDetectLocation = () => {
      if (!navigator.geolocation) return alert('Geolocalización no soportada en este navegador.')
      setGettingGPS(true)
      navigator.geolocation.getCurrentPosition(async (pos) => {
         const crd = pos.coords
         setLat(crd.latitude)
         setLon(crd.longitude)
         
         // Reverse geocoding gratis para popular el input text
         try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${crd.latitude}&lon=${crd.longitude}`)
            const data = await res.json()
            if (data && data.display_name) {
               // Limpiamos un poco el display name si es muy largo, nos quedamos con las primeras palabras
               const shortAddr = data.display_name.split(',').slice(0, 3).join(', ')
               setAddress(shortAddr)
            }
         } catch (e) { console.error('Error reverse geocoding', e) }
         setGettingGPS(false)
      }, () => {
         alert('Error al acceder al GPS. Revisá los permisos del navegador.')
         setGettingGPS(false)
      })
   }

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Directorio de Clientes</h1>
            <button onClick={() => openForm()} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition w-full md:w-auto justify-center">
               <Plus size={20}/> Nuevo Cliente
            </button>
         </div>

         {/* Buscador */}
         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input 
               type="text" 
               placeholder="Buscar cliente por nombre o teléfono..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
         </div>

         {/* Editor / Formulario Móvil y Desktop */}
         {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-slate-900/40 backdrop-blur-sm">
               <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h2 className="font-bold text-xl text-slate-800">
                        {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                     </h2>
                     <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
                        <X size={20}/>
                     </button>
                  </div>
                  
                  <form onSubmit={saveClient} className="p-6 space-y-5">
                     <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setCustomerType('b2c')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition ${customerType === 'b2c' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                           <User size={16}/> Minorista
                        </button>
                        <button type="button" onClick={() => setCustomerType('b2b')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition ${customerType === 'b2b' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                           <Building2 size={16}/> Mayorista
                        </button>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre / Razón Social *</label>
                        <input value={name} onChange={e => setName(e.target.value)} required type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" placeholder="Ej. El Almacen de Don Pepe"/>
                     </div>

                     <div className="grid grid-cols-1 gap-5">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                           <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" placeholder="Ej. +54 9 11 1234 5678"/>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dirección de Entrega</label>
                        <div className="flex gap-2">
                           <input value={address} onChange={e => { setAddress(e.target.value); setLat(null); setLon(null); }} type="text" className="flex-1 w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" placeholder="Ej. Av. Corrientes 1234"/>
                           <button type="button" onClick={handleDetectLocation} disabled={gettingGPS} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 rounded-xl font-bold transition flex items-center gap-2 border border-slate-200 disabled:opacity-50" title="Obtener mi Ubicación Actual">
                              {gettingGPS ? <Loader2 size={20} className="animate-spin text-orange-500"/> : <Navigation size={20} className={lat && lon ? "text-emerald-500" : "text-blue-500"}/>}
                           </button>
                        </div>
                        {lat && lon && <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1"><MapPin size={12}/> Coordenadas fijadas correctamente.</p>}
                     </div>

                     {customerType === 'b2b' && (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                           <label className="block text-sm font-bold text-slate-700 mb-1 text-purple-700 flex items-center gap-2">
                              <Building size={16}/> CUIT (Opcional)
                           </label>
                           <input value={cuit} onChange={e => setCuit(e.target.value)} type="text" className="w-full px-4 py-3 border border-purple-200 bg-purple-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900" placeholder="Ej. 30-12345678-9"/>
                        </div>
                     )}

                     <div className="pt-4">
                        <button type="submit" disabled={saving} className="w-full py-4 bg-orange-500 hover:bg-orange-600 flex justify-center items-center gap-2 text-white font-bold rounded-xl transition shadow-lg shadow-orange-500/30 disabled:opacity-50">
                           {saving ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20}/> Guardar Cliente</>}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Lista Mobile Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredClients.length === 0 && <p className="text-slate-500 py-8 text-center bg-white rounded-2xl border border-slate-200">No hay clientes con ese criterio.</p>}
            {filteredClients.map((c: any) => (
               <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${c.customer_type === 'b2b' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {c.customer_type === 'b2b' ? 'Mayorista' : 'Minorista'}
                           </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{c.name}</h3>
                     </div>
                     <div className="flex gap-1">
                        <button onClick={() => openForm(c)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"><Pencil size={18}/></button>
                        <button onClick={() => deleteClient(c)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                     </div>
                  </div>

                  {(c.phone_number || c.address || (c.customer_type === 'b2b' && c.cuit)) && (
                     <div className="bg-slate-50 rounded-xl p-3 space-y-2 mt-2">
                        {c.phone_number && (
                           <a href={`https://wa.me/${c.phone_number.replace(/\D/g,'')}`} target="_blank" className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition">
                              <Phone size={14} className="text-slate-400"/> {c.phone_number}
                           </a>
                        )}
                        {c.address && (
                           <div className="flex items-start justify-between gap-2 text-sm text-slate-600">
                              <span className="flex items-start gap-2"><MapPin size={14} className="text-slate-400 mt-0.5 shrink-0"/> {c.address}</span>
                              {c.latitude && c.longitude && (
                                 <a href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`} target="_blank" className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition shrink-0">
                                    <Map size={12}/> Mapa
                                 </a>
                              )}
                           </div>
                        )}
                        {c.customer_type === 'b2b' && c.cuit && (
                           <div className="flex items-start gap-2 text-sm text-purple-700 font-mono font-medium">
                              <Building size={14} className="text-purple-400 mt-0.5 shrink-0"/> CUIT: {c.cuit}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            ))}
         </div>

         {/* Lista Desktop Table */}
         <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase font-bold text-slate-500">
                     <th className="py-4 px-6">Cliente</th>
                     <th className="py-4 px-6">Contacto</th>
                     <th className="py-4 px-6">Dirección</th>
                     <th className="py-4 px-6">Tipo</th>
                     <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredClients.length === 0 && (
                     <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay clientes registrados.</td></tr>
                  )}
                  {filteredClients.map((c: any) => (
                     <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition group">
                        <td className="py-4 px-6">
                           <div className="font-bold text-slate-800">{c.name}</div>
                           {c.customer_type === 'b2b' && c.cuit && <div className="text-xs text-purple-600 font-mono mt-0.5">CUIT: {c.cuit}</div>}
                        </td>
                        <td className="py-4 px-6">
                           {c.phone_number ? (
                              <div className="flex items-center gap-2 text-slate-600 text-sm">
                                 <Phone size={14} className="text-slate-400"/> {c.phone_number}
                              </div>
                           ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td className="py-4 px-6 max-w-xs text-sm text-slate-600">
                           {c.address ? (
                              <div className="space-y-2">
                                 <div className="flex items-start gap-2 truncate" title={c.address}>
                                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0"/> <span className="truncate">{c.address}</span>
                                 </div>
                                 {c.latitude && c.longitude && (
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition">
                                       <Map size={12}/> Ver en Mapa
                                    </a>
                                 )}
                              </div>
                           ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-4 px-6">
                           <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${c.customer_type === 'b2b' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {c.customer_type === 'b2b' ? 'Mayorista' : 'Minorista'}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => openForm(c)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg shadow-sm transition"><Pencil size={18}/></button>
                              <button onClick={() => deleteClient(c)} className="p-2 text-red-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 rounded-lg shadow-sm transition"><Trash2 size={18}/></button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   )
}
