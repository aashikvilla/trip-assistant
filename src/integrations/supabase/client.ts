import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!

const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYW9jeWNxbW1taWJ0cHlvZ2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NTQ0ODAsImV4cCI6MjA3MjAzMDQ4MH0.hFqc_67bXue5DhYKVPRFrDD66jIS_PR6cJbPss3mrMw";

// Create a custom storage adapter that uses localStorage but adds a prefix
const createCustomStorage = () => {
  const PREFIX = 'vibetrip_';
  
  return {
    getItem: (key: string) => {
      return Promise.resolve(localStorage.getItem(PREFIX + key));
    },
    setItem: (key: string, value: string) => {
      return Promise.resolve(localStorage.setItem(PREFIX + key, value));
    },
    removeItem: (key: string) => {
      return Promise.resolve(localStorage.removeItem(PREFIX + key));
    }
  };
};

// Create the Supabase client with enhanced configuration
export const supabase = createClient<Database>(
  supabaseUrl || "https://zjaocycqmmmibtpyogcr.supabase.co",
  supabaseAnonKey || SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: createCustomStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: process.env.NODE_ENV === 'development',
      storageKey: 'sb-auth-token' // Standard key for better compatibility
    },
    global: {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Client-Info': 'vibetrip/1.0',
      },
    },
  }
);

// Create the Supabase service role client for background operations
export const supabaseService = createClient<Database>(
  supabaseUrl || "https://duunontaayghmblbsjwd.supabase.co",
  supabaseServiceKey,
  {
    global: {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Client-Info': 'vibetrip/1.0',
      },
    },
  }
);

// Listen for auth state changes across tabs
if (typeof window !== 'undefined') {
  // Handle storage events for cross-tab synchronization
  const handleStorageEvent = async (event: StorageEvent) => {
    // Check if the event is from our storage and is related to auth
    if (event.key?.startsWith('sb-') && event.key.includes('auth-token')) {
      try {
        // Only process if the storage actually changed
        if (event.newValue !== event.oldValue) {
          console.log('Auth state changed in another tab, refreshing session...');
          await supabase.auth.getSession();
        }
      } catch (error) {
        console.error('Error handling storage event:', error);
      }
    }
  };

  // Add event listener for storage changes
  window.addEventListener('storage', handleStorageEvent);

  // Cleanup function
  const cleanup = () => {
    window.removeEventListener('storage', handleStorageEvent);
  };

  // Return cleanup function for potential use in components
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }
}