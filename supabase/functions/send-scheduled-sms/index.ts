import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  current: {
    temperature: number;
    weather_description: string;
    humidity: number;
    wind_speed: number;
  };
  daily: {
    max_temp: number;
    min_temp: number;
    precipitation_probability: number;
  };
}

// Farming tips based on conditions
const farmingTips = [
  "🌱 Tip: Rotate your crops each season to maintain soil health and reduce pest buildup.",
  "💧 Tip: Water deeply but less frequently to encourage deep root growth.",
  "🌿 Tip: Add organic mulch around plants to retain moisture and suppress weeds.",
  "🐛 Tip: Inspect crops regularly for pests. Early detection prevents major infestations.",
  "🌾 Tip: Test your soil pH annually for optimal nutrient availability.",
  "🌻 Tip: Plant companion crops to naturally deter pests and improve yields.",
  "🌍 Tip: Practice conservation tillage to reduce soil erosion.",
  "🥬 Tip: Harvest vegetables in the morning when they're most hydrated.",
];

// Planting guides based on month (Eswatini growing calendar)
function getPlantingGuide(): string {
  const month = new Date().getMonth();
  const guides: { [key: number]: string } = {
    0: "🌽 January: Good time for late maize planting. Monitor rainfall and irrigate if needed.",
    1: "🥜 February: Plant groundnuts and beans. Continue weeding maize fields.",
    2: "🌾 March: Harvest early maize. Prepare fields for winter crops.",
    3: "🥬 April: Plant winter vegetables like cabbage, spinach, and onions.",
    4: "🧅 May: Continue planting winter crops. Apply fertilizer to growing vegetables.",
    5: "🌿 June: Monitor winter crops for frost damage. Harvest mature vegetables.",
    6: "🥕 July: Maintain winter crops. Plan for spring planting season.",
    7: "🌱 August: Prepare seedbeds. Start nursery for tomatoes and peppers.",
    8: "🌻 September: Begin spring planting. Plant early maize if rain arrives.",
    9: "🌽 October: Main maize planting season. Plant beans and groundnuts.",
    10: "🥒 November: Plant summer vegetables. Monitor and control pests.",
    11: "🍅 December: Continue summer planting. Water regularly during dry spells.",
  };
  return guides[month] || "🌱 Check local conditions for planting recommendations.";
}

async function sendSMS(phone: string, message: string, apiKey: string): Promise<boolean> {
  try {
    // Format phone number for Eswatini (+268)
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

    console.log(`Sending SMS to ${formattedPhone}`);
    
    const response = await fetch('https://api.televite.com/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        sender_id: 'Imvelo',
      }),
    });

    const result = await response.json();
    console.log(`SMS result for ${formattedPhone}:`, result);
    return response.ok && (result.success || result.status === 'sent' || result.id);
  } catch (error) {
    console.error(`SMS error for ${phone}:`, error);
    return false;
  }
}

async function getWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`;
    
    const response = await fetch(weatherUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const weatherCodeMap: { [key: number]: string } = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Moderate rain',
      65: 'Heavy rain', 80: 'Rain showers', 95: 'Thunderstorm',
    };

    return {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        weather_description: weatherCodeMap[data.current.weather_code] || 'Clear',
        humidity: data.current.relative_humidity_2m,
        wind_speed: data.current.wind_speed_10m,
      },
      daily: {
        max_temp: Math.round(data.daily.temperature_2m_max[0]),
        min_temp: Math.round(data.daily.temperature_2m_min[0]),
        precipitation_probability: data.daily.precipitation_probability_max[0],
      },
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TELEVITE_API_KEY');
    if (!apiKey) {
      console.error('TELEVITE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with phone numbers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, location')
      .not('phone_number', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users with phone numbers found');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${profiles.length} users with phone numbers`);

    // Get weather for Eswatini (default location)
    const weather = await getWeatherData(-26.3054, 31.1367);
    
    const today = new Date();
    const hour = today.getHours();
    
    let sentCount = 0;
    let failedCount = 0;

    for (const profile of profiles) {
      if (!profile.phone_number) continue;

      let message = '';
      
      // Morning weather update (6-7 AM)
      if (hour >= 6 && hour < 8) {
        if (weather) {
          message = `🌅 Good morning ${profile.full_name?.split(' ')[0] || 'Farmer'}!\n\n`;
          message += `Today's Weather:\n`;
          message += `🌡️ ${weather.current.temperature}°C (${weather.daily.min_temp}°-${weather.daily.max_temp}°)\n`;
          message += `☁️ ${weather.current.weather_description}\n`;
          if (weather.daily.precipitation_probability > 30) {
            message += `🌧️ ${weather.daily.precipitation_probability}% chance of rain\n`;
          }
          message += `\n${getPlantingGuide()}\n`;
          message += `\nDial *384*51139# for more tips.\n- Imvelo 🌱`;
        }
      }
      // Midday farming tip (12-1 PM)
      else if (hour >= 12 && hour < 14) {
        const randomTip = farmingTips[Math.floor(Math.random() * farmingTips.length)];
        message = `🌾 Farming Tip of the Day\n\n${randomTip}\n\nDial *384*51139# for more help.\n- Imvelo 🌱`;
      }
      // Evening weather summary (5-6 PM)
      else if (hour >= 17 && hour < 19) {
        if (weather) {
          message = `🌆 Evening Update ${profile.full_name?.split(' ')[0] || 'Farmer'}!\n\n`;
          message += `Current: ${weather.current.temperature}°C, ${weather.current.weather_description}\n`;
          if (weather.daily.precipitation_probability > 50) {
            message += `⚠️ Rain expected - protect sensitive crops!\n`;
          }
          if (weather.current.temperature > 30) {
            message += `🌡️ Hot day - ensure adequate irrigation tomorrow morning.\n`;
          }
          message += `\nDial *384*51139# for farming help.\n- Imvelo 🌱`;
        }
      }

      if (message) {
        const success = await sendSMS(profile.phone_number, message, apiKey);
        if (success) {
          sentCount++;
        } else {
          failedCount++;
        }
        
        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`SMS notifications sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        total: profiles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-scheduled-sms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
