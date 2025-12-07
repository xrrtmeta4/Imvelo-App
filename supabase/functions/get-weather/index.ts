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

    // Map weather codes to descriptions
    const weatherCodeMap: { [key: number]: string } = {
      0: 'Lizulu lelikhanya', // Clear sky
      1: 'Lingizimu likhanya', // Mainly clear
      2: 'Incenye limafu', // Partly cloudy
      3: 'Limafu', // Overcast
      45: 'Linkungu', // Fog
      48: 'Linkungu limakhaza', // Depositing rime fog
      51: 'Imvula encane', // Light drizzle
      61: 'Imvula', // Light rain
      63: 'Imvula enkulu', // Moderate rain
      65: 'Imvula enamandla', // Heavy rain
      80: 'Kufika imvula', // Rain showers
      95: 'Sikhukhula', // Thunderstorm
      96: 'Sikhukhula nesichotho', // Thunderstorm with hail
    };

    const weatherCode = data.current.weather_code;
    const weatherDescription = weatherCodeMap[weatherCode] || 'Lingizimu likhanya';

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
          message: 'Sikhukhula! Vikela timbali takho.',
          severity: 'high'
        });
      }
      
      // Check for heavy rain
      if (weatherCode === 65 || data.daily.precipitation_sum[0] > 50) {
        extremeConditions.push({
          type: 'heavy_rain',
          message: 'Imvula enamandla! Hlola tindzawo tekumila.',
          severity: 'medium'
        });
      }
      
      // Check for extreme heat (potential drought conditions)
      if (data.current.temperature_2m > 35) {
        extremeConditions.push({
          type: 'extreme_heat',
          message: 'Kushisa kakhulu! Ncipheta timbali takho.',
          severity: 'high'
        });
      }
      
      // Check for drought conditions (no rain and high temp)
      const totalPrecipitation = data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0);
      if (totalPrecipitation < 5 && data.daily.temperature_2m_max[0] > 30) {
        extremeConditions.push({
          type: 'drought',
          message: 'Kumisile! Hlela tindlela tekuncipheta.',
          severity: 'high'
        });
      }
      
      // Check for strong winds
      if (data.current.wind_speed_10m > 40) {
        extremeConditions.push({
          type: 'strong_wind',
          message: 'Umoya lomkhulu! Vikela timbali takho.',
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
