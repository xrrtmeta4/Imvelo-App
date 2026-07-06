
do $$
begin
  perform cron.unschedule('dispatch-early-warnings-job');
exception when others then null;
end $$;

select cron.schedule(
  'dispatch-early-warnings-job',
  '0 */3 * * *',
  $$
  select net.http_post(
    url:='https://ufoketygwxdlusngppef.supabase.co/functions/v1/dispatch-early-warnings',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmb2tldHlnd3hkbHVzbmdwcGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDQ1NDcsImV4cCI6MjA3ODE4MDU0N30.-v1kRHz4TsPPFCfUQ224rV4-t7Lq3jQ8T_g-WzFpYtk"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
