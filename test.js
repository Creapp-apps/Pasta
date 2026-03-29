import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('No env vars found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log("Login user...")
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'facu@example.com', // Just guessing the email or we can just try without auth if policies are public
    password: 'password'
  })
  
  if (authErr) {
     console.log("No pudimos logear pero intentamos insert... capaz falla por RLS")
  }

  console.log("Intentando insertar variante falsa...")
  const { data, error } = await supabase.from('product_variants').insert({
    tenant_id: '00000000-0000-0000-0000-000000000000',
    product_id: '00000000-0000-0000-0000-000000000000',
    name: 'test variant'
  })

  console.log("DATA:", data)
  console.log("ERROR:", error)
}

test()
