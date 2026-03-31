import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Database } from './types'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

// Create the Supabase client with enhanced configuration
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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

// Server-only fallback used by legacy services during migration.
export const supabaseService = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: { persistSession: false },
  },
);
