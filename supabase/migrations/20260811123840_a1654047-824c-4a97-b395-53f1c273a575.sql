CREATE POLICY "Users can delete their own weather alerts"
ON public.weather_alerts FOR DELETE TO authenticated
USING (auth.uid() = user_id);
GRANT DELETE ON public.weather_alerts TO authenticated;