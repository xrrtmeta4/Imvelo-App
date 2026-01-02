import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, user_id } = await req.json();
    console.log('Fetching weather for:', latitude, longitude);

    // Using Open-Meteo free weather API with extended parameters for better accuracy
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max&hourly=temperature_2m,precipitation_probability&forecast_days=7&timezone=auto`;
    
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const data = await response.json();
    console.log('Weather data received:', data);

    // Map weather codes to descriptions in English
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
      71: 'Light snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Rain showers',
      81: 'Moderate showers',
      82: 'Heavy showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Severe thunderstorm',
    };

    const weatherCode = data.current.weather_code;
    const weatherDescription = weatherCodeMap[weatherCode] || 'Lizulu lelikhanya';

    const result = {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feels_like: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        weather_description: weatherDescription,
        wind_speed: data.current.wind_speed_10m,
        wind_direction: data.current.wind_direction_10m,
        precipitation: data.current.precipitation,
        weather_code: weatherCode
      },
      daily: {
        max_temp: Math.round(data.daily.temperature_2m_max[0]),
        min_temp: Math.round(data.daily.temperature_2m_min[0]),
        precipitation: data.daily.precipitation_sum[0],
        precipitation_probability: data.daily.precipitation_probability_max[0],
        uv_index: data.daily.uv_index_max[0]
      },
      forecast: data.daily.temperature_2m_max.slice(0, 7).map((maxTemp: number, i: number) => ({
        max_temp: Math.round(maxTemp),
        min_temp: Math.round(data.daily.temperature_2m_min[i]),
        precipitation: data.daily.precipitation_sum[i],
        precipitation_probability: data.daily.precipitation_probability_max[i]
      }))
    };

    // Check for extreme weather conditions and create alerts
    if (user_id) {
      const extremeConditions = [];
      
      // Check for storms (thunderstorms, heavy rain)
      if (weatherCode === 95 || weatherCode === 96) {
        extremeConditions.push({
          type: 'storm',
          message: 'Storm warning! Protect your crops and livestock.',
          severity: 'high'
        });
      }
      
      // Check for heavy rain
      if (weatherCode === 65 || data.daily.precipitation_sum[0] > 50) {
        extremeConditions.push({
          type: 'heavy_rain',
          message: 'Heavy rain expected! Check your planting areas for drainage.',
          severity: 'medium'
        });
      }
      
      // Check for extreme heat (potential drought conditions)
      if (data.current.temperature_2m > 35) {
        extremeConditions.push({
          type: 'extreme_heat',
          message: 'Extreme heat warning! Water your crops early morning or evening.',
          severity: 'high'
        });
      }
      
      // Check for drought conditions (no rain and high temp)
      const totalPrecipitation = data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0);
      if (totalPrecipitation < 5 && data.daily.temperature_2m_max[0] > 30) {
        extremeConditions.push({
          type: 'drought',
          message: 'Dry conditions ahead! Plan water conservation strategies.',
          severity: 'high'
        });
      }
      
      // Check for strong winds
      if (data.current.wind_speed_10m > 40) {
        extremeConditions.push({
          type: 'strong_wind',
          message: 'Strong winds expected! Secure structures and protect young plants.',
          severity: 'medium'
        });
      }

      // Create alerts for extreme conditions
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
            weather_data: result
          });
        }
        
        console.log(`Created ${extremeConditions.length} weather alerts for user ${user_id}`);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-weather:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
