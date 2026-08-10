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

// WMO weather codes (Open-Meteo) -> label + emoji
const wmoMap: Record<number, { label: string; emoji: string; condition: string }> = {
  0: { label: 'Clear sky', emoji: '☀️', condition: 'clear' },
  1: { label: 'Mostly clear', emoji: '🌤️', condition: 'partly_cloudy' },
  2: { label: 'Partly cloudy', emoji: '⛅', condition: 'partly_cloudy' },
  3: { label: 'Overcast', emoji: '☁️', condition: 'cloudy' },
  45: { label: 'Fog', emoji: '🌫️', condition: 'fog' },
  48: { label: 'Rime fog', emoji: '🌫️', condition: 'fog' },
  51: { label: 'Light drizzle', emoji: '🌦️', condition: 'rain' },
  53: { label: 'Drizzle', emoji: '🌦️', condition: 'rain' },
  55: { label: 'Heavy drizzle', emoji: '🌧️', condition: 'rain' },
  61: { label: 'Light rain', emoji: '🌦️', condition: 'rain' },
  63: { label: 'Rain', emoji: '🌧️', condition: 'rain' },
  65: { label: 'Heavy rain', emoji: '🌧️', condition: 'rain' },
  71: { label: 'Light snow', emoji: '🌨️', condition: 'snow' },
  73: { label: 'Snow', emoji: '🌨️', condition: 'snow' },
  75: { label: 'Heavy snow', emoji: '❄️', condition: 'snow' },
  80: { label: 'Showers', emoji: '🌦️', condition: 'rain' },
  81: { label: 'Showers', emoji: '🌦️', condition: 'rain' },
  82: { label: 'Heavy showers', emoji: '🌧️', condition: 'rain' },
  95: { label: 'Thunderstorm', emoji: '⛈️', condition: 'thunder' },
  96: { label: 'Thunderstorm with hail', emoji: '⛈️', condition: 'thunder' },
  99: { label: 'Thunderstorm with hail', emoji: '⛈️', condition: 'thunder' },
};

// Short-lived per-isolate cache to smooth out provider rate limits.
const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function openMeteo(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&forecast_days=3&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = await res.json();
  const c = j.current || {};
  const d = j.daily || {};
  const code = (c.weather_code ?? d.weather_code?.[0] ?? 0) as number;
  const info = wmoMap[code] || { label: 'Clear', emoji: '☀️', condition: 'clear' };
  return {
    temperature: Math.round(c.temperature_2m ?? 0),
    feels_like: Math.round(c.apparent_temperature ?? c.temperature_2m ?? 0),
    condition: info.condition,
    description: info.label,
    emoji: info.emoji,
    humidity: Math.round(c.relative_humidity_2m ?? 0),
    wind_speed: Math.round(c.wind_speed_10m ?? 0),
    precip_probability: d.precipitation_probability_max?.[0] ?? 0,
    today: {
      max: Math.round(d.temperature_2m_max?.[0] ?? 0),
      min: Math.round(d.temperature_2m_min?.[0] ?? 0),
    },
    timezone: j.timezone_abbreviation,
    source: 'open-meteo',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { latitude, longitude } = await req.json();
    const key = Deno.env.get('METEOBLUE_API_KEY');
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'latitude and longitude required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(hit.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: unknown;
    try {
      if (!key) throw new Error('METEOBLUE_API_KEY not configured');
      result = await meteoblue(key, latitude, longitude);
    } catch (primaryError) {
      console.error('meteoblue failed, falling back to open-meteo:', primaryError);
      result = await openMeteo(latitude, longitude);
    }

    cache.set(cacheKey, { at: Date.now(), payload: result });
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

async function meteoblue(key: string, latitude: number, longitude: number) {
  {

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

    return result;
  }
}