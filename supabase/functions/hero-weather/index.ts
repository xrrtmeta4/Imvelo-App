import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meteoblue pictocode -> human readable + emoji
const pictocodeMap: Record<number, { label: string; emoji: string; condition: string }> = {
  1: { label: 'Clear sky', emoji: '☀️', condition: 'clear' },
  2: { label: 'Mostly clear', emoji: '🌤️', condition: 'partly_cloudy' },
  3: { label: 'Partly cloudy', emoji: '⛅', condition: 'partly_cloudy' },
  4: { label: 'Overcast', emoji: '☁️', condition: 'cloudy' },
  5: { label: 'Fog', emoji: '🌫️', condition: 'fog' },
  6: { label: 'Overcast with rain', emoji: '🌧️', condition: 'rain' },
  7: { label: 'Mixed with rain', emoji: '🌦️', condition: 'rain' },
  8: { label: 'Showers', emoji: '🌦️', condition: 'rain' },
  9: { label: 'Overcast with snow', emoji: '🌨️', condition: 'snow' },
  10: { label: 'Mixed with snow', emoji: '🌨️', condition: 'snow' },
  11: { label: 'Snow showers', emoji: '🌨️', condition: 'snow' },
  12: { label: 'Rain, snow', emoji: '🌨️', condition: 'sleet' },
  13: { label: 'Sleet', emoji: '🌨️', condition: 'sleet' },
  14: { label: 'Light rain', emoji: '🌦️', condition: 'rain' },
  15: { label: 'Heavy rain', emoji: '🌧️', condition: 'rain' },
  16: { label: 'Heavy snow', emoji: '❄️', condition: 'snow' },
  17: { label: 'Storm with rain', emoji: '⛈️', condition: 'thunder' },
  18: { label: 'Storm with snow', emoji: '⛈️', condition: 'thunder' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { latitude, longitude } = await req.json();
    const key = Deno.env.get('METEOBLUE_API_KEY');
    if (!key) throw new Error('METEOBLUE_API_KEY not configured');
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'latitude and longitude required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // basic-day + current — one call each; parallelised.
    const dayUrl = `https://my.meteoblue.com/packages/basic-day?apikey=${key}&lat=${latitude}&lon=${longitude}&format=json&forecast_days=3`;
    const curUrl = `https://my.meteoblue.com/packages/current?apikey=${key}&lat=${latitude}&lon=${longitude}&format=json`;

    const [dayRes, curRes] = await Promise.all([fetch(dayUrl), fetch(curUrl)]);
    if (!dayRes.ok) throw new Error(`meteoblue day ${dayRes.status}`);
    const day = await dayRes.json();
    const cur = curRes.ok ? await curRes.json() : null;

    const d = day.data_day || {};
    const c = cur?.data_current || {};
    const picto = (c.pictocode as number) ?? (d.pictocode?.[0] as number) ?? 1;
    const info = pictocodeMap[picto] || { label: 'Clear', emoji: '☀️', condition: 'clear' };

    const result = {
      temperature: Math.round(c.temperature ?? d.temperature_mean?.[0] ?? 0),
      feels_like: Math.round(c.felttemperature ?? c.temperature ?? 0),
      condition: info.condition,
      description: info.label,
      emoji: info.emoji,
      humidity: Math.round(c.relativehumidity ?? 0),
      wind_speed: Math.round((c.windspeed ?? d.windspeed_mean?.[0] ?? 0) * 3.6), // m/s -> km/h
      precip_probability: d.precipitation_probability?.[0] ?? 0,
      today: {
        max: Math.round(d.temperature_max?.[0] ?? 0),
        min: Math.round(d.temperature_min?.[0] ?? 0),
      },
      timezone: day.metadata?.timezone_abbrevation,
      source: 'meteoblue',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('hero-weather error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});