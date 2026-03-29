'use client'

import { useState } from 'react'
import { Bluetooth, Wifi, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function PrinterConfigPanel({ tenantId, currentConfig }: { tenantId: string, currentConfig: any }) {
   const [printerName, setPrinterName] = useState(currentConfig?.printer_name || '')
   const [connectionType, setConnectionType] = useState(currentConfig?.connection_type || 'bluetooth')
   const [labelWidth, setLabelWidth] = useState(currentConfig?.label_width_mm || 40)
   const [labelHeight, setLabelHeight] = useState(currentConfig?.label_height_mm || 30)
   const [saving, setSaving] = useState(false)
   const [btStatus, setBtStatus] = useState<string>('')

   const handleSave = async () => {
      setSaving(true)
      const res = await fetch('/api/printer-config', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ tenantId, printerName, connectionType, labelWidth, labelHeight })
      })
      setSaving(false)
      if (res.ok) alert('Configuración de impresora guardada correctamente.')
      else alert('Error al guardar.')
   }

   const scanBluetooth = async () => {
      try {
         const nav = navigator as any;
         if (!nav.bluetooth) {
            setBtStatus('Tu navegador no soporta Web Bluetooth. Usá Google Chrome en desktop o un teléfono celular.')
            return
         }
         setBtStatus('Buscando dispositivos BLE cercanos...')
         
         const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service']
         })
         
         setPrinterName(device.name || 'Impresora BLE Detectada')
         setBtStatus(`✅ Dispositivo encontrado: ${device.name || device.id}`)
      } catch (err: any) {
         if (err.name === 'NotFoundError') {
            setBtStatus('No se seleccionó ningún dispositivo.')
         } else {
            setBtStatus('Error: ' + err.message)
         }
      }
   }

   return (
      <div className="space-y-6">
         <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <p className="text-blue-800 text-sm font-medium leading-relaxed">
               <strong>Impresoras compatibles:</strong> Cualquier impresora térmica de etiquetas con Bluetooth (BLE) o USB. 
               Las más económicas en MercadoLibre son las <strong>Niimbot B21/D11</strong> (~$15.000 ARS) que funcionan BLE, 
               o las <strong>Xprinter XP-236B</strong> para uso profesional por USB. 
               <br/>Para conectar por Bluetooth, usá Chrome en computadora o celular.
            </p>
         </div>

         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Conexión</label>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setConnectionType('bluetooth')} className={`p-4 rounded-xl border-2 flex items-center gap-3 font-bold transition ${connectionType === 'bluetooth' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Bluetooth size={22}/> Bluetooth (BLE)
               </button>
               <button onClick={() => setConnectionType('usb')} className={`p-4 rounded-xl border-2 flex items-center gap-3 font-bold transition ${connectionType === 'usb' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Wifi size={22}/> USB / Red
               </button>
            </div>
         </div>

         {connectionType === 'bluetooth' && (
            <div>
               <button onClick={scanBluetooth} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer">
                  <Bluetooth size={18}/> Buscar Impresora por Bluetooth
               </button>
               {btStatus && (
                  <p className={`mt-3 text-sm font-medium p-3 rounded-lg ${btStatus.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : btStatus.startsWith('Error') || btStatus.startsWith('Tu navegador') ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                     {btStatus}
                  </p>
               )}
            </div>
         )}

         <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Impresora</label>
            <input value={printerName} onChange={e => setPrinterName(e.target.value)} type="text" placeholder="Ej: Niimbot B21" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"/>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Ancho Etiqueta (mm)</label>
               <input value={labelWidth} onChange={e => setLabelWidth(Number(e.target.value))} type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Alto Etiqueta (mm)</label>
               <input value={labelHeight} onChange={e => setLabelHeight(Number(e.target.value))} type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
         </div>

         <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer shadow-lg disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Guardar Configuración</>}
         </button>
      </div>
   )
}
