import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  precipitation: number;
  precipitationProbability: number;
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown conditions";
}

function getFarmingTip(weather: WeatherData): string {
  if (weather.weatherCode >= 95) return "Secure structures, postpone spraying, shelter livestock.";
  if (weather.weatherCode >= 80 || weather.precipitation > 20) return "Hold off fertilizer to avoid runoff. Check drainage.";
  if (weather.precipitationProbability > 60) return "Skip irrigation today. Good day for transplanting.";
  if (weather.temperatureMax > 35) return "Water crops before 8am. Apply mulch. Shade livestock.";
  if (weather.temperatureMax > 30) return "Monitor for heat stress. Irrigate morning or evening.";
  if (weather.temperatureMin < 5) return "Cover crops with frost cloth. Warm bedding for livestock.";
  if (weather.windSpeed > 40) return "Stake tall crops. Delay spraying until winds calm.";
  if (weather.humidity < 30 && weather.precipitation === 0) return "Dry conditions — use drip irrigation, monitor fire risk.";
  if (weather.weatherCode <= 2 && weather.temperatureMax >= 20 && weather.temperatureMax <= 30) return "Great day for planting, weeding, or spraying.";
  return "Check crops regularly. Keep farm records updated.";
}

function getClimateWarning(weather: WeatherData): string | null {
  if (weather.humidity < 30 && weather.precipitation === 0 && weather.temperatureMax > 30) return `⚠️ Drought Warning: Low humidity (${weather.humidity}%) and no rain.`;
  if (weather.temperatureMax > 35) return `⚠️ Heat Wave: Extreme ${weather.temperatureMax}°C — protect crops & livestock.`;
  if (weather.precipitation > 30) return `⚠️ Flood Risk: Heavy rain (${weather.precipitation}mm) expected.`;
  if (weather.temperatureMin < 5) return `⚠️ Frost Advisory: ${weather.temperatureMin}°C overnight — protect sensitive crops.`;
  return null;
}

async function sendSMSNotification(phone: string, message: string): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');
    if (!apiKey || !username) return false;

    let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('268')) formattedPhone = '+' + formattedPhone;
      else if (formattedPhone.startsWith('0')) formattedPhone = '+268' + formattedPhone.substring(1);
      else formattedPhone = '+268' + formattedPhone;
    }

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'apiKey': apiKey, 'Accept': 'application/json' },
      body: new URLSearchParams({ username, to: formattedPhone, message: message.substring(0, 160), from: 'IMVELO LTD' }).toString(),
    });
    const result = await response.json();
    return result.SMSMessageData?.Recipients?.[0]?.status === 'Success';
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
}

async function sendWebPush(endpoint: string, payload: any): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
      body: JSON.stringify(payload),
    });
    return response.ok || response.status === 201;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we already sent today's notification (prevent duplicates)
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAlerts } = await supabase
      .from('weather_alerts')
      .select('id')
      .eq('alert_type', 'daily_weather')
      .gte('created_at', today + 'T00:00:00Z')
      .limit(1);

    if (existingAlerts && existingAlerts.length > 0) {
      console.log('Daily notification already sent today, skipping.');
      return new Response(JSON.stringify({ success: true, message: 'Already sent today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching daily weather forecast...');
    const weatherResponse = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-26.3167&longitude=31.1333&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max&timezone=Africa/Johannesburg&forecast_days=1'
    );

    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const daily = weatherData.daily;

    const weather: WeatherData = {
      temperature: current.temperature_2m,
      temperatureMax: daily.temperature_2m_max[0],
      temperatureMin: daily.temperature_2m_min[0],
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: daily.weather_code[0],
      precipitation: daily.precipitation_sum[0] || 0,
      precipitationProbability: daily.precipitation_probability_max[0] || 0,
    };

    const weatherDesc = getWeatherDescription(weather.weatherCode);
    const farmingTip = getFarmingTip(weather);
    const climateWarning = getClimateWarning(weather);

    // Build ONE combined daily message
    let dailyMessage = `☀️ Today: ${weatherDesc}, High ${Math.round(weather.temperatureMax)}°C / Low ${Math.round(weather.temperatureMin)}°C.`;
    if (weather.precipitationProbability > 0) dailyMessage += ` Rain: ${weather.precipitationProbability}%.`;
    if (climateWarning) dailyMessage += ` ${climateWarning}`;
    dailyMessage += ` 🌾 ${farmingTip}`;

    // Get all users
    const { data: users, error: usersError } = await supabase.from('profiles').select('id, phone_number');
    if (usersError) throw usersError;

    // Create ONE alert per user (combined weather + climate warning)
    const alerts = users?.map(user => ({
      user_id: user.id,
      alert_type: 'daily_weather',
      message: dailyMessage,
      severity: climateWarning ? 'warning' : 'info',
      weather_data: weather,
      read: false
    })) || [];

    if (alerts.length > 0) {
      const { error: insertError } = await supabase.from('weather_alerts').insert(alerts);
      if (insertError) throw insertError;
    }

    // Get push subscriptions
    const { data: pushSubs } = await supabase.from('push_subscriptions').select('*');
    const usersWithPush = new Set(pushSubs?.map(s => s.user_id) || []);

    // Send ONE push notification per device
    if (pushSubs && pushSubs.length > 0) {
      for (const sub of pushSubs) {
        await sendWebPush(sub.endpoint, {
          title: '🌤️ Daily Weather & Farming Tip',
          body: dailyMessage,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'daily-weather',
          data: { type: 'weather', weather }
        });
      }
    }

    // Send ONE SMS only to users WITHOUT push subscriptions
    const smsUsers = users?.filter(u => u.phone_number && !usersWithPush.has(u.id)) || [];
    const smsMsg = `IMVELO: ${weatherDesc}, H${Math.round(weather.temperatureMax)}C/L${Math.round(weather.temperatureMin)}C.${weather.precipitationProbability > 20 ? ` Rain ${weather.precipitationProbability}%.` : ''} ${farmingTip}`;
    
    for (const user of smsUsers) {
      await sendSMSNotification(user.phone_number, smsMsg);
    }

    console.log(`Sent ${alerts.length} daily weather notifications (1 per user)`);

    return new Response(
      JSON.stringify({ success: true, message: `Sent ${alerts.length} notifications`, weather, dailyMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
