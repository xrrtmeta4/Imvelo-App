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

function getFarmingTip(weather: WeatherData): string {
  const currentMonth = new Date().getMonth() + 1;

  // Storm/heavy rain tips
  if (weather.weatherCode >= 95) {
    return "🌾 Tip: Secure loose structures, postpone spraying, and ensure livestock have shelter. Avoid working in open fields.";
  }
  if (weather.weatherCode >= 80 || weather.precipitation > 20) {
    return "🌾 Tip: Hold off on fertilizer application to avoid runoff. Check drainage channels and harvest any ripe produce before heavy rain.";
  }
  if (weather.precipitationProbability > 60) {
    return "🌾 Tip: Good day to skip irrigation and save water. Consider planting or transplanting seedlings to benefit from natural rainfall.";
  }

  // Heat tips
  if (weather.temperatureMax > 35) {
    return "🌾 Tip: Water crops early morning before 8am. Apply mulch to retain soil moisture. Provide shade and extra water for livestock.";
  }
  if (weather.temperatureMax > 30) {
    return "🌾 Tip: Monitor crops for heat stress signs like wilting. Irrigate in early morning or evening to reduce evaporation losses.";
  }

  // Frost/cold tips
  if (weather.temperatureMin < 5) {
    return "🌾 Tip: Cover sensitive crops with frost cloth overnight. Move potted plants indoors. Ensure livestock have warm, dry bedding.";
  }
  if (weather.temperatureMin < 10 && (currentMonth >= 5 && currentMonth <= 8)) {
    return "🌾 Tip: Cold season care — protect young seedlings, reduce watering frequency, and prepare compost for spring planting.";
  }

  // Wind tips
  if (weather.windSpeed > 40) {
    return "🌾 Tip: Strong winds ahead — stake tall crops, secure greenhouse covers, and delay any pesticide spraying until winds calm.";
  }

  // Dry conditions
  if (weather.humidity < 30 && weather.precipitation === 0) {
    return "🌾 Tip: Dry conditions persist — use drip irrigation to conserve water, apply organic mulch, and monitor for fire risk in dry grass.";
  }

  // Clear/good weather tips
  if (weather.weatherCode <= 2 && weather.temperatureMax >= 20 && weather.temperatureMax <= 30) {
    return "🌾 Tip: Great conditions for field work! Ideal day for planting, weeding, or applying pesticides. Check soil moisture before irrigating.";
  }

  // Cloudy/overcast
  if (weather.weatherCode === 3) {
    return "🌾 Tip: Overcast skies reduce evaporation — good day for transplanting seedlings. Monitor for fungal diseases in humid conditions.";
  }

  // Light rain
  if (weather.weatherCode >= 51 && weather.weatherCode <= 55) {
    return "🌾 Tip: Light drizzle is ideal for newly planted crops. Avoid walking on wet clay soil to prevent compaction.";
  }

  // Default seasonal tips
  if (currentMonth >= 9 && currentMonth <= 11) {
    return "🌾 Tip: Spring planting season — prepare seedbeds, test soil pH, and plan crop rotation for the upcoming growing season.";
  }
  if (currentMonth >= 12 || currentMonth <= 2) {
    return "🌾 Tip: Peak growing season — maintain regular weeding, scout for pests weekly, and ensure consistent irrigation schedules.";
  }
  if (currentMonth >= 3 && currentMonth <= 5) {
    return "🌾 Tip: Harvest season approaching — check crop maturity signs, prepare storage facilities, and plan post-harvest processing.";
  }

  return "🌾 Tip: Regularly check your crops and livestock. Keep farm records updated for better planning and decision making.";
}

function checkClimateIssues(weather: WeatherData): ClimateIssue | null {
  const currentMonth = new Date().getMonth() + 1;

  if (weather.humidity < 30 && weather.precipitation === 0 && weather.temperatureMax > 30) {
    return {
      title: 'Drought Warning',
      description: `Low humidity (${weather.humidity}%) and no rainfall detected. Implement water conservation measures.`,
      severity: 'high'
    };
  }

  if (currentMonth >= 10 || currentMonth <= 3) {
    if (weather.temperatureMax > 35) {
      return {
        title: 'Heat Wave Advisory',
        description: `Extreme temperatures (${weather.temperatureMax}°C) may cause crop stress. Protect crops and livestock.`,
        severity: 'high'
      };
    }
  }

  if (weather.precipitation > 30) {
    return {
      title: 'Flood Risk Alert',
      description: `Heavy precipitation (${weather.precipitation}mm) may cause flooding. Move livestock to higher ground.`,
      severity: 'critical'
    };
  }

  if (currentMonth >= 5 && currentMonth <= 8 && weather.temperatureMin < 5) {
    return {
      title: 'Frost Advisory',
      description: `Cold conditions (${weather.temperatureMin}°C overnight). Protect sensitive crops and provide shelter for animals.`,
      severity: 'medium'
    };
  }

  return null;
}

async function sendSMSNotification(phone: string, message: string): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');

    if (!apiKey || !username) {
      console.error('Africa\'s Talking credentials not configured');
      return false;
    }

    console.log(`Sending SMS to ${phone}: ${message.substring(0, 50)}...`);

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

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: username,
        to: formattedPhone,
        message: message.substring(0, 160),
        from: 'IMVELO LTD',
      }).toString(),
    });

    const result = await response.json();
    console.log('SMS result:', result);

    const recipients = result.SMSMessageData?.Recipients || [];
    return recipients.length > 0 && recipients[0].status === 'Success';
  } catch (error) {
    console.error('SMS error:', error);
    return false;
  }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching daily weather forecast for Eswatini...');

    // Fetch today's forecast with daily data (high/low, precipitation probability)
    const weatherResponse = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-26.3167&longitude=31.1333&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max&timezone=Africa/Johannesburg&forecast_days=1'
    );

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

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

    console.log('Today\'s weather:', weather);

    // Build the daily notification message with real weather + farming tip
    const weatherDesc = getWeatherDescription(weather.weatherCode);
    const farmingTip = getFarmingTip(weather);

    const dailyMessage = `☀️ Today's Forecast: ${weatherDesc}, High ${Math.round(weather.temperatureMax)}°C / Low ${Math.round(weather.temperatureMin)}°C. ${weather.precipitationProbability > 0 ? `Rain chance: ${weather.precipitationProbability}%. ` : ''}${farmingTip}`;

    const climateIssue = checkClimateIssues(weather);

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, phone_number');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id');

    const usersWithPush = new Set(subscriptions?.map(s => s.user_id) || []);

    console.log(`Sending daily weather to ${users?.length || 0} users`);

    // Create daily weather alert for all users
    const alerts = users?.map(user => ({
      user_id: user.id,
      alert_type: 'daily_weather',
      message: dailyMessage,
      severity: 'info',
      weather_data: weather,
      read: false
    })) || [];

    // Add climate issue alerts if detected
    const climateAlerts = climateIssue ? users?.map(user => ({
      user_id: user.id,
      alert_type: 'climate_issue',
      message: `⚠️ ${climateIssue.title}: ${climateIssue.description}`,
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

    // Send push notifications
    const { data: pushSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (!subError && pushSubs && pushSubs.length > 0) {
      console.log(`Sending push notifications to ${pushSubs.length} devices`);

      for (const sub of pushSubs) {
        const weatherPayload = {
          title: '🌤️ Daily Weather & Farming Tip',
          body: dailyMessage,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'daily-weather',
          data: { type: 'weather', weather }
        };

        await sendWebPush(sub.endpoint, weatherPayload);

        if (climateIssue) {
          const climatePayload = {
            title: `⚠️ ${climateIssue.title}`,
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

    // SMS for all users with phone numbers (daily summary, not just critical)
    const usersWithPhone = users?.filter(u => u.phone_number) || [];
    if (usersWithPhone.length > 0) {
      // Build SMS-friendly message (160 char limit)
      const smsWeather = `IMVELO: ${weatherDesc}, H${Math.round(weather.temperatureMax)}C/L${Math.round(weather.temperatureMin)}C.${weather.precipitationProbability > 20 ? ` Rain ${weather.precipitationProbability}%.` : ''} ${farmingTip.replace('🌾 Tip: ', '')}`;

      // Only send SMS to users without push (avoid double notifications)
      const smsUsers = usersWithPhone.filter(u => !usersWithPush.has(u.id));
      console.log(`Sending daily SMS to ${smsUsers.length} users without push`);

      for (const user of smsUsers) {
        await sendSMSNotification(user.phone_number, smsWeather);
      }
    }

    console.log(`Successfully sent ${allAlerts.length} daily weather notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${allAlerts.length} daily weather notifications with farming tips`,
        weather,
        dailyMessage,
        climateIssue
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
