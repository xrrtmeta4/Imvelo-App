import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Web Push (VAPID + AES128GCM) helpers, mirroring send-push-notification ---
function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}
function getAudience(endpoint: string): string {
  try { return new URL(endpoint).origin; } catch { return ''; }
}
async function createVapidJwt(audience: string, subject: string, vapidPrivateKey: string, vapidPublicKey: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 43200, sub: subject };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  const privateKey = await crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', x: base64UrlEncode(x), y: base64UrlEncode(y), d: base64UrlEncode(privateKeyBytes) },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(unsignedToken));
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signatureBuffer))}`;
}
async function hkdfExpand(ikm: ArrayBuffer, salt: ArrayBuffer, info: ArrayBuffer, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length);
  return new Uint8Array(bits);
}
async function encryptPayload(payload: string, p256dhKey: string, authKey: string): Promise<{ encrypted: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey('raw', toArrayBuffer(subscriberPublicKeyBytes), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecretBuffer = await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberPublicKey }, localKeyPair.privateKey, 256);
  const authSecret = base64UrlDecode(authKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdfExpand(sharedSecretBuffer, toArrayBuffer(authSecret), toArrayBuffer(new TextEncoder().encode('Content-Encoding: auth\0')), 256);
  const cek = await hkdfExpand(toArrayBuffer(ikm), toArrayBuffer(salt), toArrayBuffer(new TextEncoder().encode('Content-Encoding: aes128gcm\0')), 128);
  const nonce = await hkdfExpand(toArrayBuffer(ikm), toArrayBuffer(salt), toArrayBuffer(new TextEncoder().encode('Content-Encoding: nonce\0')), 96);
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;
  const aesKey = await crypto.subtle.importKey('raw', toArrayBuffer(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(nonce) }, aesKey, paddedPayload);
  return { encrypted: new Uint8Array(encryptedBuffer), salt, publicKey: localPublicKey };
}
function buildAes128gcmBody(encrypted: Uint8Array, salt: Uint8Array, publicKey: Uint8Array): ArrayBuffer {
  const recordSize = 4096;
  const headerLength = 16 + 4 + 1 + publicKey.length;
  const body = new Uint8Array(headerLength + encrypted.length);
  body.set(salt, 0);
  body[16] = (recordSize >> 24) & 0xff;
  body[17] = (recordSize >> 16) & 0xff;
  body[18] = (recordSize >> 8) & 0xff;
  body[19] = recordSize & 0xff;
  body[20] = publicKey.length;
  body.set(publicKey, 21);
  body.set(encrypted, headerLength);
  return toArrayBuffer(body);
}

async function sendWebPush(subscription: { endpoint: string; p256dh_key: string; auth_key: string }, payload: Record<string, unknown>, vapidPublicKey: string, vapidPrivateKey: string): Promise<boolean> {
  try {
    const audience = getAudience(subscription.endpoint);
    if (!audience) return false;
    const jwt = await createVapidJwt(audience, 'mailto:support@imveloapp.com', vapidPrivateKey, vapidPublicKey);
    const payloadStr = JSON.stringify(payload);
    const { encrypted, salt, publicKey } = await encryptPayload(payloadStr, subscription.p256dh_key, subscription.auth_key);
    const body = buildAes128gcmBody(encrypted, salt, publicKey);
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.byteLength.toString(),
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: body,
    });
    return response.ok || response.status === 201;
  } catch (error) {
    console.error('sendWebPush error:', error);
    return false;
  }
}
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

    // Restrict to internal/service-role callers only (cron uses service key)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)');
      return new Response(JSON.stringify({ success: false, error: 'VAPID keys not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Check if we already sent today's notification — check PER USER with a global marker
    const today = new Date().toISOString().split('T')[0];
    const todayStart = today + 'T00:00:00Z';
    const todayEnd = today + 'T23:59:59Z';

    // Check for ANY daily_weather alert created today (global dedup)
    const { count: todayCount } = await supabase
      .from('weather_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('alert_type', 'daily_weather')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    if (todayCount && todayCount > 0) {
      console.log(`Daily notification already sent today (${todayCount} alerts exist), skipping entirely.`);
      return new Response(JSON.stringify({ success: true, message: 'Already sent today', alertsExist: todayCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('No daily alerts found for today, proceeding with weather fetch...');
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

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create ONE alert per user
    const alerts = users.map(user => ({
      user_id: user.id,
      alert_type: 'daily_weather',
      message: dailyMessage,
      severity: climateWarning ? 'warning' : 'info',
      weather_data: weather,
      read: false
    }));

    const { error: insertError } = await supabase.from('weather_alerts').insert(alerts);
    if (insertError) throw insertError;

    // Get push subscriptions and track which users have push
    const { data: pushSubs } = await supabase.from('push_subscriptions').select('*');
    const usersWithPush = new Set(pushSubs?.map(s => s.user_id) || []);

     // Send ONE push notification per device (tag ensures dedup on device).
    // Uses proper VAPID auth + AES128GCM encryption so the push service
    // delivers even when the app is backgrounded/closed.
    let pushSent = 0;
    const failedEndpoints: string[] = [];
    if (pushSubs && pushSubs.length > 0) {
      for (const sub of pushSubs) {
        const ok = await sendWebPush(sub, {
          title: '🌤️ Daily Weather & Farming Tip',
          body: dailyMessage,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `daily-weather-${today}`,
          data: { type: 'weather', weather },
        }, vapidPublicKey, vapidPrivateKey);
        if (ok) {
          pushSent++;
        } else {
          failedEndpoints.push(sub.endpoint);
        }
      }

      // Clean up stale/expired subscriptions so they don't keep being retried
      if (failedEndpoints.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
      }
    }

    // Send ONE SMS only to users WITHOUT push subscriptions
    const smsUsers = users.filter(u => u.phone_number && !usersWithPush.has(u.id));
    const smsMsg = `IMVELO: ${weatherDesc}, H${Math.round(weather.temperatureMax)}C/L${Math.round(weather.temperatureMin)}C.${weather.precipitationProbability > 20 ? ` Rain ${weather.precipitationProbability}%.` : ''} ${farmingTip}`;

    for (const user of smsUsers) {
      await sendSMSNotification(user.phone_number!, smsMsg);
    }

    console.log(`Sent ${alerts.length} daily weather alerts; push to ${pushSent}/${pushSubs?.length || 0} devices`);

    return new Response(
      JSON.stringify({ success: true, message: `Alerts created: ${alerts.length}, push sent: ${pushSent}`, weather, dailyMessage, pushSent, pushTotal: pushSubs?.length || 0 }),
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
