import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Weather code descriptions
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

// Fetch Open-Meteo main API (uses ECMWF + GFS blend by default)
async function fetchOpenMeteo(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,pressure_msl,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&forecast_days=7&timezone=auto`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo main API failed');
  return await response.json();
}

// Fetch Open-Meteo GFS model (American model - good for global coverage)
async function fetchOpenMeteoGFS(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/gfs?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=auto`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo GFS API failed');
  return await response.json();
}

// Fetch Open-Meteo ECMWF model (European model - very accurate)
async function fetchOpenMeteoECMWF(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/ecmwf?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=7&timezone=auto`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo ECMWF API failed');
  return await response.json();
}

// Fetch Open-Meteo ICON model (German DWD model - good for precision)
async function fetchOpenMeteoDWD(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/dwd-icon?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=auto`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo DWD API failed');
  return await response.json();
}

// Average values from multiple sources, ignoring nulls
function averageValues(values: (number | null | undefined)[]): number {
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

// Get the most common weather code (mode)
function getMostCommonWeatherCode(codes: (number | null | undefined)[]): number {
  const validCodes = codes.filter((c): c is number => c != null);
  if (validCodes.length === 0) return 0;
  
  const frequency: Record<number, number> = {};
  validCodes.forEach(code => {
    frequency[code] = (frequency[code] || 0) + 1;
  });
  
  return Number(Object.entries(frequency).sort((a, b) => b[1] - a[1])[0][0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, user_id } = await req.json();
    console.log('Fetching weather from multiple APIs for:', latitude, longitude);

    // Fetch from multiple weather models in parallel for better accuracy
    const [mainData, gfsData, ecmwfData, dwdData] = await Promise.allSettled([
      fetchOpenMeteo(latitude, longitude),
      fetchOpenMeteoGFS(latitude, longitude),
      fetchOpenMeteoECMWF(latitude, longitude),
      fetchOpenMeteoDWD(latitude, longitude)
    ]);

    // Extract successful results
    const main = mainData.status === 'fulfilled' ? mainData.value : null;
    const gfs = gfsData.status === 'fulfilled' ? gfsData.value : null;
    const ecmwf = ecmwfData.status === 'fulfilled' ? ecmwfData.value : null;
    const dwd = dwdData.status === 'fulfilled' ? dwdData.value : null;

    // Log which APIs succeeded
    console.log('API results:', {
      main: mainData.status,
      gfs: gfsData.status,
      ecmwf: ecmwfData.status,
      dwd: dwdData.status
    });

    // If main API fails, we need at least one backup
    if (!main && !gfs && !ecmwf && !dwd) {
      throw new Error('All weather APIs failed');
    }

    // Use main data as primary, supplement with averages from other models
    const primaryData = main || gfs || ecmwf || dwd;

    // Aggregate current weather from multiple sources for accuracy
    const currentTemperatures = [
      main?.current?.temperature_2m,
      gfs?.current?.temperature_2m,
      ecmwf?.current?.temperature_2m,
      dwd?.current?.temperature_2m
    ];
    
    const currentHumidity = [
      main?.current?.relative_humidity_2m,
      gfs?.current?.relative_humidity_2m,
      ecmwf?.current?.relative_humidity_2m,
      dwd?.current?.relative_humidity_2m
    ];

    const currentFeelsLike = [
      main?.current?.apparent_temperature,
      gfs?.current?.apparent_temperature,
      ecmwf?.current?.apparent_temperature,
      dwd?.current?.apparent_temperature
    ];

    const currentWindSpeed = [
      main?.current?.wind_speed_10m,
      gfs?.current?.wind_speed_10m,
      ecmwf?.current?.wind_speed_10m,
      dwd?.current?.wind_speed_10m
    ];

    const currentPrecipitation = [
      main?.current?.precipitation,
      gfs?.current?.precipitation,
      ecmwf?.current?.precipitation,
      dwd?.current?.precipitation
    ];

    const weatherCodes = [
      main?.current?.weather_code,
      gfs?.current?.weather_code,
      ecmwf?.current?.weather_code,
      dwd?.current?.weather_code
    ];

    // Aggregate daily forecasts
    const dailyMaxTemps = [
      main?.daily?.temperature_2m_max?.[0],
      gfs?.daily?.temperature_2m_max?.[0],
      ecmwf?.daily?.temperature_2m_max?.[0],
      dwd?.daily?.temperature_2m_max?.[0]
    ];

    const dailyMinTemps = [
      main?.daily?.temperature_2m_min?.[0],
      gfs?.daily?.temperature_2m_min?.[0],
      ecmwf?.daily?.temperature_2m_min?.[0],
      dwd?.daily?.temperature_2m_min?.[0]
    ];

    const dailyPrecipitation = [
      main?.daily?.precipitation_sum?.[0],
      gfs?.daily?.precipitation_sum?.[0],
      ecmwf?.daily?.precipitation_sum?.[0],
      dwd?.daily?.precipitation_sum?.[0]
    ];

    const dailyPrecipProb = [
      main?.daily?.precipitation_probability_max?.[0],
      gfs?.daily?.precipitation_probability_max?.[0],
      dwd?.daily?.precipitation_probability_max?.[0]
    ];

    // Calculate aggregated values
    const avgTemperature = Math.round(averageValues(currentTemperatures));
    const avgHumidity = Math.round(averageValues(currentHumidity));
    const avgFeelsLike = Math.round(averageValues(currentFeelsLike));
    const avgWindSpeed = Math.round(averageValues(currentWindSpeed));
    const avgPrecipitation = averageValues(currentPrecipitation);
    const weatherCode = getMostCommonWeatherCode(weatherCodes);
    const avgMaxTemp = Math.round(averageValues(dailyMaxTemps));
    const avgMinTemp = Math.round(averageValues(dailyMinTemps));
    const avgDailyPrecip = averageValues(dailyPrecipitation);
    const avgPrecipProb = Math.round(averageValues(dailyPrecipProb));

    const weatherDescription = weatherCodeMap[weatherCode] || 'Clear sky';

    // Build 7-day forecast from aggregated data
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const dayMaxTemps = [
        main?.daily?.temperature_2m_max?.[i],
        gfs?.daily?.temperature_2m_max?.[i],
        ecmwf?.daily?.temperature_2m_max?.[i],
        dwd?.daily?.temperature_2m_max?.[i]
      ];
      const dayMinTemps = [
        main?.daily?.temperature_2m_min?.[i],
        gfs?.daily?.temperature_2m_min?.[i],
        ecmwf?.daily?.temperature_2m_min?.[i],
        dwd?.daily?.temperature_2m_min?.[i]
      ];
      const dayPrecip = [
        main?.daily?.precipitation_sum?.[i],
        gfs?.daily?.precipitation_sum?.[i],
        ecmwf?.daily?.precipitation_sum?.[i],
        dwd?.daily?.precipitation_sum?.[i]
      ];
      const dayPrecipProb = [
        main?.daily?.precipitation_probability_max?.[i],
        gfs?.daily?.precipitation_probability_max?.[i],
        dwd?.daily?.precipitation_probability_max?.[i]
      ];

      forecast.push({
        max_temp: Math.round(averageValues(dayMaxTemps)),
        min_temp: Math.round(averageValues(dayMinTemps)),
        precipitation: averageValues(dayPrecip),
        precipitation_probability: Math.round(averageValues(dayPrecipProb)),
        date: main?.daily?.time?.[i] || primaryData?.daily?.time?.[i]
      });
    }

    const result = {
      current: {
        temperature: avgTemperature,
        feels_like: avgFeelsLike,
        humidity: avgHumidity,
        weather_description: weatherDescription,
        wind_speed: avgWindSpeed,
        wind_direction: main?.current?.wind_direction_10m || 0,
        precipitation: avgPrecipitation,
        weather_code: weatherCode,
        cloud_cover: main?.current?.cloud_cover || 0,
        pressure: main?.current?.pressure_msl || 0,
        is_day: main?.current?.is_day || 1
      },
      daily: {
        max_temp: avgMaxTemp,
        min_temp: avgMinTemp,
        precipitation: avgDailyPrecip,
        precipitation_probability: avgPrecipProb,
        uv_index: main?.daily?.uv_index_max?.[0] || 0,
        sunrise: main?.daily?.sunrise?.[0] || null,
        sunset: main?.daily?.sunset?.[0] || null,
        max_wind_speed: main?.daily?.wind_speed_10m_max?.[0] || 0
      },
      forecast,
      sources_used: {
        main: mainData.status === 'fulfilled',
        gfs: gfsData.status === 'fulfilled',
        ecmwf: ecmwfData.status === 'fulfilled',
        dwd: dwdData.status === 'fulfilled',
        total_sources: [main, gfs, ecmwf, dwd].filter(Boolean).length
      },
      accuracy_confidence: [main, gfs, ecmwf, dwd].filter(Boolean).length >= 3 ? 'high' : 
                          [main, gfs, ecmwf, dwd].filter(Boolean).length >= 2 ? 'medium' : 'low'
    };

    console.log(`Weather aggregated from ${result.sources_used.total_sources} sources, confidence: ${result.accuracy_confidence}`);

    // Check for extreme weather conditions and create alerts
    if (user_id) {
      const extremeConditions = [];
      
      // Check for storms (thunderstorms, heavy rain)
      if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
        extremeConditions.push({
          type: 'storm',
          message: 'Storm warning! Protect your crops and livestock.',
          severity: 'high'
        });
      }
      
      // Check for heavy rain
      if (weatherCode === 65 || weatherCode === 82 || avgDailyPrecip > 50) {
        extremeConditions.push({
          type: 'heavy_rain',
          message: 'Heavy rain expected! Check your planting areas for drainage.',
          severity: 'medium'
        });
      }
      
      // Check for extreme heat (potential drought conditions)
      if (avgTemperature > 35) {
        extremeConditions.push({
          type: 'extreme_heat',
          message: 'Extreme heat warning! Water your crops early morning or evening.',
          severity: 'high'
        });
      }

      // Check for frost conditions
      if (avgMinTemp < 2) {
        extremeConditions.push({
          type: 'frost',
          message: 'Frost warning! Protect sensitive crops from cold temperatures.',
          severity: 'high'
        });
      }
      
      // Check for drought conditions (no rain and high temp)
      const totalPrecipitation = forecast.reduce((a, day) => a + (day.precipitation || 0), 0);
      if (totalPrecipitation < 5 && avgMaxTemp > 30) {
        extremeConditions.push({
          type: 'drought',
          message: 'Dry conditions ahead! Plan water conservation strategies.',
          severity: 'high'
        });
      }
      
      // Check for strong winds
      if (avgWindSpeed > 40 || (main?.daily?.wind_speed_10m_max?.[0] || 0) > 50) {
        extremeConditions.push({
          type: 'strong_wind',
          message: 'Strong winds expected! Secure structures and protect young plants.',
          severity: 'medium'
        });
      }

      // Check for high UV
      if ((main?.daily?.uv_index_max?.[0] || 0) >= 8) {
        extremeConditions.push({
          type: 'high_uv',
          message: 'High UV index today! Take precautions when working outdoors.',
          severity: 'medium'
        });
      }

      // Create alerts for extreme conditions and send push notifications
      if (extremeConditions.length > 0) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const condition of extremeConditions) {
          // Insert alert into database
          await supabase.from('weather_alerts').insert({
            user_id,
            alert_type: condition.type,
            message: condition.message,
            severity: condition.severity,
            weather_data: result
          });

          // Send push notification for this alert
          try {
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id,
                title: `⚠️ Weather Alert: ${condition.type.replace('_', ' ').toUpperCase()}`,
                body: condition.message,
                data: {
                  type: 'weather_alert',
                  alert_type: condition.type,
                  severity: condition.severity
                }
              }
            });

            if (pushError) {
              console.error('Error sending push notification:', pushError);
            } else {
              console.log(`Push notification sent for ${condition.type} alert`);
            }
          } catch (pushErr) {
            console.error('Failed to invoke push notification:', pushErr);
          }
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
