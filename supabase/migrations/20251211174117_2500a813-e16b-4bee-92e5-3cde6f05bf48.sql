-- Allow service role to insert weather alerts (for edge function)
CREATE POLICY "Service role can insert alerts"
ON public.weather_alerts
FOR INSERT
WITH CHECK (true);