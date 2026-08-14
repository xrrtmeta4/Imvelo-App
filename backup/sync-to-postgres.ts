import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ufoketygwxdlusngppef.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk'
);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TABLES_TO_SYNC = [
  'profiles',
  'premium_subscriptions',
  'pest_reports',
  'marketplace_listings',
  'messages',
  'weather_alerts',
  'push_subscriptions',
  'ussd_sessions',
  'ussd_crop_reports',
  'farm_activities',
  'ledger_entries',
  'budget_limits',
  'pesticide_schedules',
  'crop_reminders',
  'livestock',
  'crop_rotations',
  'harvests',
  'price_alerts',
  'farm_inventory',
  'climate_observations',
  'climate_research_exports',
  'knowledge_nodes',
  'knowledge_edges',
  'knowledge_contributions',
  'usage_counters',
];

async function syncTable(tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { table: tableName, synced: 0 };
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const columns = Object.keys(data[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    const updateColumns = columns
      .filter((col) => col !== 'id')
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const stmt = `INSERT INTO public.${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateColumns}`;

    for (const row of data) {
      const values = columns.map((col) => {
        const value = (row as any)[col];
        if (value instanceof Date) return value.toISOString();
        return value;
      });
      await client.query(stmt, values);
    }

    await client.query('COMMIT');
    return { table: tableName, synced: data.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function fullSync() {
  console.log('Starting full sync from Supabase to PostgreSQL backup...');
  const results: Record<string, number> = {};

  for (const table of TABLES_TO_SYNC) {
    try {
      const result = await syncTable(table);
      results[result.table] = result.synced;
      console.log(`Synced ${result.table}: ${result.synced} rows`);
    } catch (err) {
      console.error(`Failed to sync ${table}:`, err);
      results[table] = -1;
    }
  }

  await pgPool.query(
    `INSERT INTO public.backup_sync_state (id, last_synced_at, last_supabase_snapshot_at)
     VALUES ('global', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET last_synced_at = NOW(), last_supabase_snapshot_at = NOW()`
  );

  console.log('Full sync completed.', results);
  return results;
}

async function checkSupabaseHealth() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

fullSync()
  .then(() => pgPool.end())
  .catch((err) => {
    console.error('Sync failed:', err);
    pgPool.end().catch(() => {});
    process.exit(1);
  });
