select cron.unschedule('daily-weather-6am') where exists (select 1 from cron.job where jobname = 'daily-weather-6am');
select cron.schedule(
  'daily-weather-6am',
  '0 4 * * *',
  $$
  select net.http_post(
    url:='https://ufoketygwxdlusngppef.supabase.co/functions/v1/send-weather-notifications',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk"}'::jsonb,
    body:='{"scheduled":true}'::jsonb
  );
  $$
);