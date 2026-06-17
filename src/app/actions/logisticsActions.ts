'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDeliveryRoute(formData: FormData) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Acceso denegado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica vinculada")
      const repartidorId = formData.get('repartidorId') as string
      const orderIdsJSON = formData.get('orderIds') as string
      const orderIds = JSON.parse(orderIdsJSON || '[]')
      
      if (!repartidorId || orderIds.length === 0) throw new Error("Error: Faltan repartidores o pedidos.")

      // Check active cash session before creating delivery route
      const { data: activeSession } = await supabase
         .from('cash_sessions')
         .select('id')
         .eq('tenant_id', userData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()

      if (!activeSession) {
         throw new Error("No hay ninguna caja abierta. Abrí la caja antes de iniciar el reparto.")
      }

      // 1. Crear el viaje base
      const { data: delivery, error: deliveryErr } = await supabase.from('deliveries').insert({
         tenant_id: userData.tenant_id,
         repartidor_id: repartidorId,
         route_date: new Date().toISOString().split('T')[0],
         status: 'active'
      }).select().single()

      if (deliveryErr) throw new Error("Error base de datos: " + deliveryErr.message)

      // 2. Trazar las paradas
      const stopsToInsert = orderIds.map((orderId: string, index: number) => ({
         delivery_id: delivery.id,
         order_id: orderId,
         stop_order_index: index + 1,
         status: 'pending'
      }))

      await supabase.from('delivery_stops').insert(stopsToInsert)

      // 3. Cambiar el estado de los pedidos B2C a 'on_route'
      await supabase.from('orders').update({ status: 'on_route' }).in('id', orderIds)

      revalidatePath('/dashboard/logistics', 'layout')
      
      return { success: true }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function markStopDelivered(stopId: string, orderId: string) {
   try {
      const supabase = await createClient()

      // Fetch order's tenant_id to find active session
      const { data: orderData } = await supabase.from('orders').select('tenant_id').eq('id', orderId).single()
      if (!orderData?.tenant_id) throw new Error("Pedido no encontrado")

      const { data: activeSession } = await supabase
         .from('cash_sessions')
         .select('id')
         .eq('tenant_id', orderData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()

      if (!activeSession) {
         throw new Error("No hay ninguna caja abierta. Debe abrir la caja para poder marcar la entrega.")
      }

      const orderUpdate: any = {
         status: 'delivered',
         delivered_at: new Date().toISOString(),
         cash_session_id: activeSession.id
      }
      
      await supabase.from('delivery_stops').update({ status: 'delivered', completed_at: new Date().toISOString() }).eq('id', stopId)
      await supabase.from('orders').update(orderUpdate).eq('id', orderId)

      revalidatePath('/dashboard/logistics/my-route')
      revalidatePath('/dashboard/pedidos')
      
      return { success: true }
   } catch (error: any) {
      return { error: error.message }
   }
}
