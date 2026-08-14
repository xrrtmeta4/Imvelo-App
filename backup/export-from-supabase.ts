import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ufoketygwxdlusngppef.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk'
);

const TABLES_TO_EXPORT = [
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

async function exportTable(tableName: string) {
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
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
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

  return { table: tableName, count: allData.length, data: allData };
}

async function exportAll() {
  console.log('Starting full export from Supabase...');
  const results: any = {};

  for (const table of TABLES_TO_EXPORT) {
    try {
      const result = await exportTable(table);
      results[result.table] = result.count;
      console.log(`Exported ${result.table}: ${result.count} rows`);
    } catch (err) {
      console.error(`Failed to export ${table}:`, err);
      results[table] = -1;
    }
  }

  return results;
}

exportAll()
  .then((results) => {
    console.log('Export completed.', results);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  });
