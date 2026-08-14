import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

let supabase: ReturnType<typeof createClient>;
let pgPool: Pool;
let usePostgres = false;

export function initDatabases() {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ufoketygwxdlusngppef.supabase.co';
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk';
  const databaseUrl = (import.meta as any).env?.VITE_DATABASE_URL as string | undefined;

  supabase = createClient(supabaseUrl, supabaseKey);
  if (databaseUrl) {
    pgPool = new Pool({ connectionString: databaseUrl });
  }

  return { supabase, pgPool };
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function ensureDatabase() {
  if (usePostgres) return pgPool;

  const healthy = await checkSupabaseHealth();
  if (!healthy && pgPool) {
    usePostgres = true;
    console.warn('Supabase unavailable. Falling back to PostgreSQL backup.');
  }

  return usePostgres ? pgPool : supabase;
}

export function getDb() {
  return ensureDatabase();
}

export function isUsingPostgres() {
  return usePostgres;
}
