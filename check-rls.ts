import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
let supabaseUrl = ''
let supabaseServiceKey = ''

for (const line of envContent.split('\n')) {
  const [key, ...valueParts] = line.split('=')
  const value = valueParts.join('=').trim()
  if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
    supabaseUrl = value
  } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
    supabaseServiceKey = value
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('--- checking RLS enabled status ---')
  const { data: tables, error: tablesErr } = await supabase.rpc('get_rls_status') 
  // If get_rls_status RPC doesn't exist, we can query pg_tables
  const { data: pgTables, error: pgErr } = await supabase.from('pg_tables' as any).select('*' as any)
  
  console.log('--- Querying pg_policies ---')
  const { data: policies, error: polErr } = await supabase.rpc('inspect_policies' as any)
  
  // Let's do a direct SQL query via a custom RPC or fetch policies using postgres catalog
  // Since we don't have direct sql query RPC, let's select from pg_policies if public
  const { data: directPol, error: directErr } = await supabase
    .from('pg_policies' as any)
    .select('schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check' as any)
  
  console.log('Policies from pg_policies:', directPol)
  if (directErr) {
    console.log('Error reading pg_policies:', directErr.message)
    
    // Let's try running a test update with a user session vs service role
    console.log('Testing update via service role first...')
    const { data: testVar, error: testErr } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1)
      .single()
      
    if (testVar) {
      console.log('Found variant:', testVar.name, 'ID:', testVar.id)
      const { data: updateRes, error: updateErr } = await supabase
        .from('product_variants')
        .update({ price_override: 999 })
        .eq('id', testVar.id)
        .select()
      console.log('Update result (service role):', updateRes, 'Error:', updateErr?.message)
    } else {
      console.log('No variants found in DB')
    }
  }
}

run()
