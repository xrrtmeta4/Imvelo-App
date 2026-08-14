import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ufoketygwxdlusngppef.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk'
);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TABLES_TO_MIGRATE = [
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

async function migrateTable(tableName: string) {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    allData = allData.concat(data);
    if (data.length < pageSize) {
      break;
    }
    page++;
  }

  if (allData.length === 0) {
    return { table: tableName, migrated: 0 };
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const columns = Object.keys(allData[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = columns.join(', ');
    const updateColumns = columns
      .filter((col) => col !== 'id')
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const stmt = `INSERT INTO public.${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateColumns}`;

    for (const row of allData) {
      const values = columns.map((col) => {
        const value = (row as any)[col];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value ?? null;
      });
      await client.query(stmt, values);
    }

    await client.query('COMMIT');
    return { table: tableName, migrated: allData.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function migrateAll() {
  console.log('Starting full migration from Supabase to PostgreSQL...');
  const results: Record<string, number> = {};

  for (const table of TABLES_TO_MIGRATE) {
    try {
      const result = await migrateTable(table);
      results[result.table] = result.migrated;
      console.log(`Migrated ${result.table}: ${result.migrated} rows`);
    } catch (err) {
      console.error(`Failed to migrate ${table}:`, err);
      results[table] = -1;
    }
  }

  await pgPool.query(
    `INSERT INTO public.backup_sync_state (id, last_synced_at, last_supabase_snapshot_at)
     VALUES ('global', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET last_synced_at = NOW(), last_supabase_snapshot_at = NOW()`
  );

  console.log('Migration completed.', results);
  return results;
}

migrateAll()
  .then(() => pgPool.end())
  .catch((err) => {
    console.error('Migration failed:', err);
    pgPool.end().catch(() => {});
    process.exit(1);
  });
