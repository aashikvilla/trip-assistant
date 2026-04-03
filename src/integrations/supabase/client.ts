import { createBrowserClient } from "@supabase/ssr";
import { Database } from './types'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Create the Supabase client with enhanced configuration
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Client-Info': 'vibetrip/1.0',
      },
    },
  }
);
