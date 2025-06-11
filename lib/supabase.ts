import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a single supabase client for the entire application
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

// Server-side Supabase client
export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Client singleton to avoid creating too many clients in components
let supabaseClientSingleton: ReturnType<typeof createSupabaseClient>

export const getSupabaseClient = () => {
  if (!supabaseClientSingleton) {
    supabaseClientSingleton = createSupabaseClient()
  }
  return supabaseClientSingleton
}
