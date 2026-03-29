import { createClient } from '@/utils/supabase/server'
import { Settings, Printer } from 'lucide-react'
import PrinterConfigPanel from '@/components/config/PrinterConfigPanel'

export default async function ConfiguracionPage() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single()
   
   if (!userData?.tenant_id) return <p className="p-8">Acceso denegado</p>

   const { data: printerConfig } = await supabase
      .from('printer_config')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .single()

   return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-3xl">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
               <Settings className="text-orange-500" size={28} /> Configuración
            </h2>
            <p className="text-slate-500 text-sm mt-1">Ajustes de impresora, etiquetas y sistema.</p>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-3">
               <Printer className="text-orange-500" size={22}/> Impresora de Etiquetas
            </h3>
            <PrinterConfigPanel tenantId={userData.tenant_id} currentConfig={printerConfig} />
         </div>
      </div>
   )
}
