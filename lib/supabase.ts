import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!
)

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('id')
      .limit(1)
    
    return { success: !error, error }
  } catch (err) {
    return { success: false, error: err }
  }
}
