import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WMO weather codes (Open-Meteo fallback) -> description
const weatherCodeMap: { [key: number]: string } = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain (light)',
  67: 'Freezing rain (heavy)',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers (light)',
  81: 'Rain showers (moderate)',
  82: 'Rain showers (heavy)',
  85: 'Snow showers (light)',
  86: 'Snow showers (heavy)',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail (light)',
  99: 'Thunderstorm with hail (heavy)',
};

// Meteoblue pictocode -> human readable description (matches frontend icon map)
const pictocodeMap: { [key: number]: string } = {
  1: 'Clear sky',
  2: 'Mainly clear',
  3: 'Partly cloudy',
  4: 'Overcast',
  5: 'Foggy',
  6: 'Overcast with rain',
  7: 'Mixed with rain',
  8: 'Showers',
  9: 'Overcast with snow',
  10: 'Mixed with snow',
  11: 'Snow showers',
  12: 'Rain, snow',
  13: 'Sleet',
  14: 'Light rain',
  15: 'Heavy rain',
  16: 'Heavy snow',
  17: 'Thunderstorm',
  18: 'Thunderstorm with hail',
};

function pictoToLabel(code: number): string {
  return pictocodeMap[code] || weatherCodeMap[0] || 'Clear sky';
}

// Average values from multiple sources, ignoring nulls
function averageValues(values: (number | null | undefined)[]): number {
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

// Get the most common weather code (mode) — used by the Open-Meteo path
function getMostCommonWeatherCode(codes: (number | null | undefined)[]): number {
  const validCodes = codes.filter((c): c is number => c != null);
  if (validCodes.length === 0) return 0;
  const frequency: Record<number, number> = {};
  validCodes.forEach((code) => {
    frequency[code] = (frequency[code] || 0) + 1;
  });
  return Number(Object.entries(frequency).sort((a, b) => b[1] - a[1])[0][0]);
}

// ---------------------------------------------------------------------------
// Meteoblue (primary provider). Reads METEOBLUE_API_KEY from Supabase secrets.
// Returns the SAME response shape the frontend expects.
// ---------------------------------------------------------------------------
async function fetchMeteoblue(latitude: number, longitude: number, apiKey: string) {
  const dayUrl = `https://my.meteoblue.com/packages/basic-day?apikey=${apiKey}` +
    `&lat=${latitude}&lon=${longitude}&format=json&forecast_days=7&temperature=C&windspeed=km/h`;
  const curUrl = `https://my.meteoblue.com/packages/current?apikey=${apiKey}` +
    `&lat=${latitude}&lon=${longitude}&format=json&temperature=C&windspeed=km/h`;

  const [dayRes, curRes] = await Promise.all([fetch(dayUrl), fetch(curUrl)]);
  if (!dayRes.ok) throw new Error(`meteoblue day ${dayRes.status}`);
  const day = await dayRes.json();
  const cur = curRes.ok ? await curRes.json() : null;

  const d = day.data_day || {};
  const c = cur?.data_current || {};

  const codeNow = (c.pictocode ?? d.pictocode?.[0] ?? 1) as number;
  const len = Array.isArray(d.time) ? d.time.length : 7;

  const forecast = [];
  for (let i = 0; i < len; i++) {
    const pcode = (d.pictocode?.[i] ?? 1) as number;
    forecast.push({
      date: d.time?.[i] || null,
      max_temp: Math.round(d.temperature_max?.[i] ?? 0),
      min_temp: Math.round(d.temperature_min?.[i] ?? 0),
      precipitation: d.precipitation?.[i] ?? 0,
      precipitation_probability: Math.round(d.precipitation_probability?.[i] ?? 0),
      weather_description: pictoToLabel(pcode),
      weather_code: pcode,
    });
  }

  const avgMax = Math.round(averageValues(d.temperature_max || []));
  const avgMin = Math.round(averageValues(d.temperature_min || []));
  const avgPrecipProb = Math.round(averageValues(d.precipitation_probability || []));
  const totalPrecip = (d.precipitation || []).reduce((a: number, b: number) => a + (b || 0), 0);

  return {
    current: {
      temperature: Math.round(c.temperature ?? d.temperature_mean?.[0] ?? 0),
      feels_like: Math.round(c.felttemperature ?? c.temperature ?? d.temperature_mean?.[0] ?? 0),
      humidity: Math.round(c.relativehumidity ?? d.humidity_mean?.[0] ?? 0),
      weather_description: pictoToLabel(codeNow),
      weather_code: codeNow,
      wind_speed: Math.round(c.windspeed ?? d.windspeed_mean?.[0] ?? 0),
      wind_direction: c.winddirection ?? d.winddirection_mean?.[0] ?? 0,
      precipitation: c.precipitation ?? 0,
      cloud_cover: c.cloudcover ?? 0,
      pressure: c.pressure ?? 0,
      is_day: c.isday ?? 1,
    },
    daily: {
      max_temp: avgMax,
      min_temp: avgMin,
      precipitation: totalPrecip,
      precipitation_probability: avgPrecipProb,
      uv_index: d.uv_index?.[0] ?? 0,
      sunrise: d.sunrise?.[0] ?? null,
      sunset: d.sunset?.[0] ?? null,
      max_wind_speed: Math.round(d.windspeed_max?.[0] ?? d.windspeed_mean?.[0] ?? 0),
    },
    forecast,
    sources_used: { main: true, gfs: false, ecmwf: false, dwd: false, total_sources: 1 },
    accuracy_confidence: 'high',
    provider: 'meteoblue',
  };
}

// ---------------------------------------------------------------------------
// Open-Meteo (fallback). Multi-model aggregation.
// ---------------------------------------------------------------------------
async function fetchOpenMeteo(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,pressure_msl,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&forecast_days=7&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo main API failed');
  return await response.json();
}

async function buildFromOpenMeteo(latitude: number, longitude: number) {
  const main = await fetchOpenMeteo(latitude, longitude);
  if (!main) throw new Error('Weather API failed');

  const weatherCode = main.current?.weather_code ?? 0;
  const weatherDescription = weatherCodeMap[weatherCode] || 'Clear sky';

  const forecast = [];
  const len = main.daily?.time?.length || 7;
  for (let i = 0; i < len; i++) {
    forecast.push({
      date: main.daily.time?.[i] || null,
      max_temp: Math.round(main.daily.temperature_2m_max?.[i] ?? 0),
      min_temp: Math.round(main.daily.temperature_2m_min?.[i] ?? 0),
      precipitation: main.daily.precipitation_sum?.[i] ?? 0,
      precipitation_probability: Math.round(main.daily.precipitation_probability_max?.[i] ?? 0),
      weather_description: weatherCodeMap[main.daily.weather_code?.[i] ?? 0] || 'Clear sky',
      weather_code: main.daily.weather_code?.[i] ?? 0,
    });
  }

  const totalPrecip = (main.daily.precipitation_sum || []).reduce((a: number, b: number) => a + (b || 0), 0);

  return {
    current: {
      temperature: Math.round(main.current?.temperature_2m ?? 0),
      feels_like: Math.round(main.current?.apparent_temperature ?? 0),
      humidity: Math.round(main.current?.relative_humidity_2m ?? 0),
      weather_description: weatherDescription,
      weather_code: weatherCode,
      wind_speed: Math.round(main.current?.wind_speed_10m ?? 0),
      wind_direction: main.current?.wind_direction_10m ?? 0,
      precipitation: main.current?.precipitation ?? 0,
      cloud_cover: main.current?.cloud_cover ?? 0,
      pressure: main.current?.pressure_msl ?? 0,
      is_day: main.current?.is_day ?? 1,
    },
    daily: {
      max_temp: Math.round(main.daily?.temperature_2m_max?.[0] ?? 0),
      min_temp: Math.round(main.daily?.temperature_2m_min?.[0] ?? 0),
      precipitation: totalPrecip,
      precipitation_probability: Math.round(main.daily?.precipitation_probability_max?.[0] ?? 0),
      uv_index: main.daily?.uv_index_max?.[0] ?? 0,
      sunrise: main.daily?.sunrise?.[0] ?? null,
      sunset: main.daily?.sunset?.[0] ?? null,
      max_wind_speed: Math.round(main.daily?.wind_speed_10m_max?.[0] ?? 0),
    },
    forecast,
    sources_used: { main: true, gfs: false, ecmwf: false, dwd: false, total_sources: 1 },
    accuracy_confidence: 'medium',
    provider: 'open-meteo',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, user_id } = await req.json();
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'latitude and longitude required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Fetching weather for:', latitude, longitude);

    const apiKey = Deno.env.get('METEOBLUE_API_KEY');

    let result: any;
    try {
      if (!apiKey) throw new Error('METEOBLUE_API_KEY not configured');
      result = await fetchMeteoblue(latitude, longitude, apiKey);
    } catch (primaryError) {
      console.error('meteoblue failed, falling back to open-meteo:', primaryError);
      result = await buildFromOpenMeteo(latitude, longitude);
    }

    const provider = result.provider || 'unknown';
    const code = result.current?.weather_code ?? 0;
    const avgMaxTemp = result.daily?.max_temp ?? 0;
    const avgMinTemp = result.daily?.min_temp ?? 0;
    const avgDailyPrecip = result.daily?.precipitation ?? 0;
    const avgWindSpeed = result.current?.wind_speed ?? 0;

    // Storm / heavy-rain detection (provider-aware codes)
    const isStorm = provider === 'meteoblue'
      ? [17, 18].includes(code)
      : [95, 96, 99].includes(code);
    const isHeavyRain = provider === 'meteoblue'
      ? [6, 7, 8, 14, 15].includes(code)
      : [65, 82].includes(code);

    // Check for extreme weather conditions and create alerts
    if (user_id) {
      const extremeConditions = [];

      if (isStorm) {
        extremeConditions.push({ type: 'storm', message: 'Storm warning! Protect your crops and livestock.', severity: 'high' });
      }
      if (isHeavyRain || avgDailyPrecip > 50) {
        extremeConditions.push({ type: 'heavy_rain', message: 'Heavy rain expected! Check your planting areas for drainage.', severity: 'medium' });
      }
      if (result.current?.temperature > 35) {
        extremeConditions.push({ type: 'extreme_heat', message: 'Extreme heat warning! Water your crops early morning or evening.', severity: 'high' });
      }
      if (avgMinTemp < 2) {
        extremeConditions.push({ type: 'frost', message: 'Frost warning! Protect sensitive crops from cold temperatures.', severity: 'high' });
      }
      const totalPrecipitation = (result.forecast || []).reduce((a: number, day: any) => a + (day.precipitation || 0), 0);
      if (totalPrecipitation < 5 && avgMaxTemp > 30) {
        extremeConditions.push({ type: 'drought', message: 'Dry conditions ahead! Plan water conservation strategies.', severity: 'high' });
      }
      if (avgWindSpeed > 40 || (result.daily?.max_wind_speed || 0) > 50) {
        extremeConditions.push({ type: 'strong_wind', message: 'Strong winds expected! Secure structures and protect young plants.', severity: 'medium' });
      }
      if ((result.daily?.uv_index || 0) >= 8) {
        extremeConditions.push({ type: 'high_uv', message: 'High UV index today! Take precautions when working outdoors.', severity: 'medium' });
      }

      if (extremeConditions.length > 0) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const condition of extremeConditions) {
          await supabase.from('weather_alerts').insert({
            user_id,
            alert_type: condition.type,
            message: condition.message,
            severity: condition.severity,
            weather_data: result,
          });

          try {
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id,
                title: `⚠️ Weather Alert: ${condition.type.replace('_', ' ').toUpperCase()}`,
                body: condition.message,
                data: { type: 'weather_alert', alert_type: condition.type, severity: condition.severity },
              },
            });
            if (pushError) console.error('Error sending push notification:', pushError);
          } catch (pushErr) {
            console.error('Failed to invoke push notification:', pushErr);
          }
        }
        console.log(`Created ${extremeConditions.length} weather alerts for user ${user_id}`);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-weather:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
