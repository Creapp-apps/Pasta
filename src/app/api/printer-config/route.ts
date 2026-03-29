import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
   try {
      const supabase = await createClient()
      const body = await req.json()
      const { tenantId, printerName, connectionType, labelWidth, labelHeight } = body

      // Upsert: actualizar si existe, insertar si no
      const { data: existing } = await supabase.from('printer_config').select('id').eq('tenant_id', tenantId).single()

      if (existing) {
         await supabase.from('printer_config').update({
            printer_name: printerName,
            connection_type: connectionType,
            label_width_mm: labelWidth,
            label_height_mm: labelHeight
         }).eq('tenant_id', tenantId)
      } else {
         await supabase.from('printer_config').insert({
            tenant_id: tenantId,
            printer_name: printerName,
            connection_type: connectionType,
            label_width_mm: labelWidth,
            label_height_mm: labelHeight
         })
      }

      return NextResponse.json({ success: true })
   } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
   }
}
