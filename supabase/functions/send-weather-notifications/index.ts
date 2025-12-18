import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  precipitation: number;
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown conditions";
}

function checkForAlerts(weather: WeatherData): { hasAlert: boolean; message: string; severity: string } {
  // Check for extreme conditions
  if (weather.weatherCode >= 95) {
    return {
      hasAlert: true,
      message: `⚠️ STORM ALERT: ${getWeatherDescription(weather.weatherCode)}. Take shelter and protect livestock.`,
      severity: "critical"
    };
  }
  
  if (weather.weatherCode >= 80 || weather.precipitation > 20) {
    return {
      hasAlert: true,
      message: `🌧️ Heavy rain expected (${weather.precipitation}mm). Prepare drainage and cover crops.`,
      severity: "high"
    };
  }
  
  if (weather.temperature > 35) {
    return {
      hasAlert: true,
      message: `🔥 Extreme heat alert: ${weather.temperature}°C. Water crops early morning, provide shade for livestock.`,
      severity: "high"
    };
  }
  
  if (weather.temperature < 5) {
    return {
      hasAlert: true,
      message: `❄️ Frost warning: ${weather.temperature}°C. Cover sensitive crops and protect seedlings.`,
      severity: "high"
    };
  }
  
  if (weather.windSpeed > 50) {
    return {
      hasAlert: true,
      message: `💨 Strong wind warning: ${weather.windSpeed} km/h. Secure structures and young plants.`,
      severity: "medium"
    };
  }

  // Regular hourly update
  return {
    hasAlert: false,
    message: `Weather Update: ${getWeatherDescription(weather.weatherCode)}, ${weather.temperature}°C, Humidity: ${weather.humidity}%`,
    severity: "info"
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching weather data for Eswatini...');

    // Fetch weather for Mbabane (default location for Eswatini)
    const weatherResponse = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-26.3167&longitude=31.1333&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=Africa/Johannesburg'
    );

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    const weather: WeatherData = {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      precipitation: current.precipitation || 0
    };

    console.log('Current weather:', weather);

    const alert = checkForAlerts(weather);

    // Get all users who have weather notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Sending weather notifications to ${users?.length || 0} users`);

    // Create weather alerts for all users
    const alerts = users?.map(user => ({
      user_id: user.id,
      alert_type: alert.hasAlert ? 'weather_warning' : 'weather_update',
      message: alert.message,
      severity: alert.severity,
      weather_data: weather,
      read: false
    })) || [];

    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('weather_alerts')
        .insert(alerts);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully sent ${alerts.length} weather notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${alerts.length} weather notifications`,
        weather: weather,
        alert: alert
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-weather-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
