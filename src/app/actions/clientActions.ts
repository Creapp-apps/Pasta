'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function fetchClients() {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return { data: null, error: "No user logged in" }

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return { data: null, error: "No tenant ID found" }

   const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('name', { ascending: true })

   return { data, error: error?.message }
}

export async function createClientAction(clientData: { customer_type: string, name: string, phone_number?: string, address?: string, zone_tag?: string, cuit?: string, latitude?: number, longitude?: number }) {
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return { error: "No user logged in" }

   const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
   if (!userData?.tenant_id) return { error: "No tenant ID found" }

   const { error } = await supabase
      .from('clients')
      .insert({
         tenant_id: userData.tenant_id,
         customer_type: clientData.customer_type,
         name: clientData.name,
         phone_number: clientData.phone_number,
         address: clientData.address,
         zone_tag: clientData.zone_tag,
         cuit: clientData.cuit,
         latitude: clientData.latitude,
         longitude: clientData.longitude
      })
      
   if (error) return { error: error.message }
   
   revalidatePath('/dashboard/clientes')
   revalidatePath('/dashboard/pedidos')
   return { success: true }
}

export async function updateClientAction(id: string, clientData: { customer_type: string, name: string, phone_number?: string, address?: string, zone_tag?: string, cuit?: string, latitude?: number, longitude?: number }) {
   const supabase = await createClient()
   
   const { error } = await supabase
      .from('clients')
      .update({
         customer_type: clientData.customer_type,
         name: clientData.name,
         phone_number: clientData.phone_number,
         address: clientData.address,
         zone_tag: clientData.zone_tag,
         cuit: clientData.cuit,
         latitude: clientData.latitude,
         longitude: clientData.longitude
      })
      .eq('id', id)
      
   if (error) return { error: error.message }
   
   revalidatePath('/dashboard/clientes')
   revalidatePath('/dashboard/pedidos')
   return { success: true }
}

export async function deleteClientAction(id: string) {
   const supabase = await createClient()
   const { error } = await supabase.from('clients').delete().eq('id', id)
   
   if (error) return { error: error.message }
   
   revalidatePath('/dashboard/clientes')
   revalidatePath('/dashboard/pedidos')
   return { success: true }
}
