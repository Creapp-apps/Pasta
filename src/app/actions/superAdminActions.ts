'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFactoryWorkflow(formData: FormData) {
  try {
     // 1. Autorización de Super Admin actual
     const publicSupabase = await createServerClient()
     const { data: { user }, error: authError } = await publicSupabase.auth.getUser()
     if (authError || !user) throw new Error("Acceso denegado. Iniciá sesión.")
     
     const { data: superAdmin } = await publicSupabase.from('super_admins').select('id').eq('id', user.id).single()
     if (!superAdmin) throw new Error("Seguridad: No tenés permisos de Súper Admin.")

     // Capturar datos del form
     const name = formData.get('name') as string
     const slug = formData.get('slug') as string
     const ownerEmail = formData.get('ownerEmail') as string
     const ownerPassword = formData.get('ownerPassword') as string
     
     // 2. Insertar en tabla de Fábricas (Tenants)
     // Usamos adminSupabase para saltarnos la traba de RLS (Reglas de Seguridad) que bloquea subidas desde el cliente normal
     const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Llave poderosa que definimos antes
     )

     const { data: newTenant, error: tenantError } = await adminSupabase
       .from('tenants')
       .insert({ name, slug })
       .select()
       .single()
       
     if (tenantError) throw new Error("Error creando fábrica. Asegurate de que el Micro-Sitio (slug) no exista ya: " + tenantError.message)

     // 3. Crear el Auth del usuario usando la llave maestra
     
     const { data: newAuthUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true // Confirmación forzada
     })
     
     if (createUserError) {
        // Hacemos rollback del Tenant para no dejar la base de datos "sucia"
        await publicSupabase.from('tenants').delete().eq('id', newTenant.id)
        throw new Error("Error creando la bóveda de cuenta: " + createUserError.message)
     }

     // 4. Vincular ese nuevo usuario a nuestra tabla 'users' asignándole su ID de fábrica y Rango
     const { error: customUserError } = await adminSupabase
       .from('users')
       .insert({
         id: newAuthUser.user.id,
         tenant_id: newTenant.id,
         role: 'admin',
         email: ownerEmail,
         full_name: 'Administrador ' + name
       })
       
     if (customUserError) {
        throw new Error("Error estableciendo el rol del dueño: " + customUserError.message)
     }

     // Recargar la UI
     revalidatePath('/dashboard', 'layout')
     return { success: true }
  } catch (err: any) {
     return { error: err.message || "Ocurrió un error misterioso procesando el alta." }
  }
}
