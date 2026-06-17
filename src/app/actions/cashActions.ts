'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getActiveCashSessionAction() {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      const { data: activeSession, error } = await supabase
         .from('cash_sessions')
         .select('*')
         .eq('tenant_id', userData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()

      if (error) throw new Error(error.message)
      return { success: true, session: activeSession }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function openCashSessionAction(startingCash: number) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      // Check if there is already an open session
      const { data: existing } = await supabase
         .from('cash_sessions')
         .select('id')
         .eq('tenant_id', userData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()

      if (existing) {
         return { error: "Ya hay una caja abierta para esta fábrica." }
      }

      const { data: session, error } = await supabase
         .from('cash_sessions')
         .insert({
            tenant_id: userData.tenant_id,
            starting_cash: startingCash,
            status: 'open',
            opened_by: user.id
         })
         .select()
         .single()

      if (error) throw new Error(error.message)

      revalidatePath('/dashboard/pedidos')
      return { success: true, session }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function closeCashSessionAction(
   actualCash: number,
   actualTransfer: number,
   actualMp: number,
   notes: string
) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      // Find the open session
      const { data: activeSession, error: findErr } = await supabase
         .from('cash_sessions')
         .select('*')
         .eq('tenant_id', userData.tenant_id)
         .eq('status', 'open')
         .maybeSingle()

      if (findErr || !activeSession) {
         return { error: "No se encontró ninguna caja abierta." }
      }

      // Query all orders delivered during this session linked to it
      const { data: sessionOrders, error: ordersErr } = await supabase
         .from('orders')
         .select('total_calc, payment_method')
         .eq('cash_session_id', activeSession.id)
         .eq('status', 'delivered')

      if (ordersErr) throw new Error(ordersErr.message)

      // Calculate expected sales by payment method
      let expectedCash = 0
      let expectedTransfer = 0
      let expectedMp = 0

      for (const o of sessionOrders || []) {
         const val = Number(o.total_calc || 0)
         if (o.payment_method === 'cash') {
            expectedCash += val
         } else if (o.payment_method === 'transfer') {
            expectedTransfer += val
         } else {
            expectedMp += val
         }
      }

      // Expected total cash in drawer = starting_cash + expectedCash sales
      const totalExpectedDrawerCash = Number(activeSession.starting_cash) + expectedCash
      
      // Difference on cash only counted vs expected drawer cash
      const difference = actualCash - totalExpectedDrawerCash

      const { data: closedSession, error: updateErr } = await supabase
         .from('cash_sessions')
         .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: user.id,
            expected_cash: expectedCash,
            expected_transfer: expectedTransfer,
            expected_mp: expectedMp,
            actual_cash: actualCash,
            actual_transfer: actualTransfer,
            actual_mp: actualMp,
            difference: difference,
            notes: notes
         })
         .eq('id', activeSession.id)
         .select()
         .single()

      if (updateErr) throw new Error(updateErr.message)

      revalidatePath('/dashboard/pedidos')
      return { success: true, session: closedSession }
   } catch (error: any) {
      return { error: error.message }
   }
}

export async function getTodayDetailedMetricsAction({
   filterType = 'day',
   startDateStr,
   endDateStr
}: {
   filterType?: 'day' | 'month' | 'custom'
   startDateStr?: string
   endDateStr?: string
} = {}) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: "Sesión expirada" }

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) return { error: "Inquilino no encontrado" }

      const tenantId = userData.tenant_id

      let startDateIso: string
      let endDateIso: string
      const now = new Date()

      if (filterType === 'month') {
         const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
         const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
         startDateIso = startOfMonth.toISOString()
         endDateIso = endOfMonth.toISOString()
      } else if (filterType === 'custom' && startDateStr && endDateStr) {
         const sParts = startDateStr.split('-')
         const start = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]), 0, 0, 0, 0)
         const eParts = endDateStr.split('-')
         const end = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]), 23, 59, 59, 999)
         startDateIso = start.toISOString()
         endDateIso = end.toISOString()
      } else {
         // filterType === 'day'
         const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
         const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
         startDateIso = startOfDay.toISOString()
         endDateIso = endOfDay.toISOString()
      }

      // 1. Obtener la sesión de caja activa
      const { data: activeSession } = await supabase
         .from('cash_sessions')
         .select('*')
         .eq('tenant_id', tenantId)
         .eq('status', 'open')
         .maybeSingle()

      // 2. Obtener pedidos
      let ordersQuery = supabase
         .from('orders')
         .select(`
            id,
            total_calc,
            payment_method,
            status,
            created_at,
            order_items (
               id,
               product_id,
               variant_id,
               quantity,
               unit_price,
               subtotal
            )
         `)
         .eq('tenant_id', tenantId)

      // Si es filtro diario y hay sesión activa, traemos los de esa sesión.
      // En caso contrario, filtramos por el rango de fechas.
      if (filterType === 'day' && activeSession) {
         ordersQuery = ordersQuery.eq('cash_session_id', activeSession.id)
      } else {
         ordersQuery = ordersQuery
            .gte('created_at', startDateIso)
            .lte('created_at', endDateIso)
      }

      const { data: orders, error: ordersErr } = await ordersQuery
      if (ordersErr) throw new Error(ordersErr.message)

      // 3. Obtener nombres de productos y variantes
      const { data: products } = await supabase
         .from('products')
         .select('id, name, type')
         .eq('tenant_id', tenantId)

      const { data: variants } = await supabase
         .from('product_variants')
         .select('id, name, product_id')
         .eq('tenant_id', tenantId)

      // 4. Obtener mermas en el rango de fechas
      const { data: mermas, error: mermasErr } = await supabase
         .from('stock_movements')
         .select('id, product_id, quantity, created_at')
         .eq('tenant_id', tenantId)
         .eq('movement_type', 'waste')
         .gte('created_at', startDateIso)
         .lte('created_at', endDateIso)

      if (mermasErr) throw new Error(mermasErr.message)

      return {
         success: true,
         activeSession,
         orders: orders || [],
         products: products || [],
         variants: variants || [],
         mermas: mermas || []
      }
   } catch (error: any) {
      return { error: error.message }
   }
}

