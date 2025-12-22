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

interface ClimateIssue {
  title: string;
  description: string;
  severity: string;
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

// Check for climate issues based on weather patterns
function checkClimateIssues(weather: WeatherData): ClimateIssue | null {
  const currentMonth = new Date().getMonth() + 1;
  
  // Drought conditions (low humidity, no precipitation, high temp)
  if (weather.humidity < 30 && weather.precipitation === 0 && weather.temperature > 30) {
    return {
      title: 'Drought Warning',
      description: `Low humidity (${weather.humidity}%) and no rainfall detected. Implement water conservation measures.`,
      severity: 'high'
    };
  }
  
  // Heat wave conditions
  if (currentMonth >= 10 || currentMonth <= 3) { // Summer season
    if (weather.temperature > 35) {
      return {
        title: 'Heat Wave Advisory',
        description: `Extreme temperatures (${weather.temperature}°C) may indicate climate stress. Protect crops and livestock.`,
        severity: 'high'
      };
    }
  }
  
  // Flooding risk
  if (weather.precipitation > 30) {
    return {
      title: 'Flood Risk Alert',
      description: `Heavy precipitation (${weather.precipitation}mm) may cause flooding. Move livestock to higher ground.`,
      severity: 'critical'
    };
  }
  
  // Frost advisory
  if (currentMonth >= 5 && currentMonth <= 8 && weather.temperature < 10) {
    return {
      title: 'Frost Advisory',
      description: `Cold conditions (${weather.temperature}°C) during winter. Protect sensitive crops and provide shelter for animals.`,
      severity: 'medium'
    };
  }
  
  return null;
}

async function sendWebPush(endpoint: string, payload: any): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });
    return response.ok || response.status === 201;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

// Send SMS for users without internet (backup notification)
async function sendSMSNotification(phone: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending SMS to ${phone}: ${message.substring(0, 50)}...`);
    
    // Format phone for Eswatini
    let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('268')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+268' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+268' + formattedPhone;
      }
    }

    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message.substring(0, 160), // SMS character limit
        key: 'textbelt', // Free tier - 1 SMS/day. For production, use paid key.
      }),
    });

    const result = await response.json();
    console.log('SMS result:', result);
    return result.success === true;
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
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

    // Check for climate issues
    const climateIssue = checkClimateIssues(weather);
    
    // Get all users with their phone numbers for SMS backup
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, phone_number');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Get users with push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id');
    
    const usersWithPush = new Set(subscriptions?.map(s => s.user_id) || []);

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

    // Add climate issue alerts if detected
    const climateAlerts = climateIssue ? users?.map(user => ({
      user_id: user.id,
      alert_type: 'climate_issue',
      message: `${climateIssue.title}: ${climateIssue.description}`,
      severity: climateIssue.severity,
      weather_data: weather,
      read: false
    })) || [] : [];

    const allAlerts = [...alerts, ...climateAlerts];

    if (allAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from('weather_alerts')
        .insert(allAlerts);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
        throw insertError;
      }
    }

    // Send push notifications to subscribed users
    const { data: pushSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (!subError && pushSubs && pushSubs.length > 0) {
      console.log(`Sending push notifications to ${pushSubs.length} devices`);
      
      for (const sub of pushSubs) {
        const weatherPayload = {
          title: alert.hasAlert ? 'Weather Alert' : 'Weather Update',
          body: alert.message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'weather-update',
          data: { type: 'weather', weather }
        };
        
        await sendWebPush(sub.endpoint, weatherPayload);

        // Send climate issue push if detected
        if (climateIssue) {
          const climatePayload = {
            title: climateIssue.title,
            body: climateIssue.description,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'climate-issue',
            data: { type: 'climate', issue: climateIssue }
          };
          
          await sendWebPush(sub.endpoint, climatePayload);
        }
      }
    }

    // SMS backup for users without push subscriptions (only for critical alerts)
    if (alert.hasAlert && alert.severity === 'critical') {
      const usersNeedingSMS = users?.filter(u => 
        u.phone_number && !usersWithPush.has(u.id)
      ) || [];
      
      console.log(`Sending SMS to ${usersNeedingSMS.length} users without push`);
      
      for (const user of usersNeedingSMS) {
        const smsMessage = `FarmAssist Alert: ${alert.message.replace(/[^\w\s.,!?°%]/g, '')}`;
        await sendSMSNotification(user.phone_number, smsMessage);
      }
    }

    console.log(`Successfully sent ${allAlerts.length} weather notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${allAlerts.length} weather notifications`,
        weather: weather,
        alert: alert,
        climateIssue: climateIssue
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
