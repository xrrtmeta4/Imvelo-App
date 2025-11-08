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
    const { latitude, longitude } = await req.json();
    console.log('Fetching weather for:', latitude, longitude);

    // Using Open-Meteo free weather API (no API key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    
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
        weather_description: weatherDescription,
        wind_speed: data.current.wind_speed_10m,
        weather_code: weatherCode
      },
      daily: {
        max_temp: Math.round(data.daily.temperature_2m_max[0]),
        min_temp: Math.round(data.daily.temperature_2m_min[0]),
        precipitation: data.daily.precipitation_sum[0]
      }
    };

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
