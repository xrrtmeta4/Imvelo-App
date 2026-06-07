// Re-export the auto-generated Supabase client.
// Hardcoded fallbacks for URL + publishable key guarantee the client
// initializes even if Vite env injection fails for some reason
// (publishable/anon keys are safe to ship in client code).
import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ufoketygwxdlusngppef.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
