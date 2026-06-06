import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64 URL encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Convert Uint8Array to ArrayBuffer
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// Create JWT for VAPID authentication
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 43200,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(x),
      y: base64UrlEncode(y),
      d: base64UrlEncode(privateKeyBytes),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

  return `${unsignedToken}.${signatureB64}`;
}

function getAudience(endpoint: string): string {
  const url = new URL(endpoint);
  return url.origin;
}

// HKDF expand function
async function hkdfExpand(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: ArrayBuffer,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: info,
    },
    key,
    length
  );
  
  return new Uint8Array(bits);
}

// Encrypt payload using ECDH and AES-GCM (Web Push encryption)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);

  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(subscriberPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64UrlDecode(authKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  
  const ikm = await hkdfExpand(
    sharedSecretBuffer,
    toArrayBuffer(authSecret),
    toArrayBuffer(authInfo),
    256
  );

  const keyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const cek = await hkdfExpand(
    toArrayBuffer(ikm),
    toArrayBuffer(salt),
    toArrayBuffer(keyInfo),
    128
  );

  const nonce = await hkdfExpand(
    toArrayBuffer(ikm),
    toArrayBuffer(salt),
    toArrayBuffer(nonceInfo),
    96
  );

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;

  const aesKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encryptedBuffer),
    salt: salt,
    publicKey: localPublicKey,
  };
}

function buildAes128gcmBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  publicKey: Uint8Array
): ArrayBuffer {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Restrict to internal/service-role callers only
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, title, body: notifBody, data, url } = await req.json();

    console.log(`Sending push notification to user: ${user_id || 'all users'}`);

    let query = supabase.from('push_subscriptions').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: title || 'Imvelo Notification',
      body: notifBody || 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'imvelo-notification',
      data: {
        ...data,
        url: url || '/',
      },
    });

    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const audience = getAudience(subscription.endpoint);
        
        const jwt = await createVapidJwt(
          audience,
          'mailto:support@imveloapp.com',
          vapidPrivateKey,
          vapidPublicKey
        );

        const { encrypted, salt, publicKey } = await encryptPayload(
          payload,
          subscription.p256dh_key,
          subscription.auth_key
        );

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

        if (response.ok || response.status === 201) {
          successCount++;
          console.log(`Successfully sent to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        } else {
          const errorText = await response.text();
          console.error(`Failed (${response.status}): ${errorText}`);
          
          if (response.status === 404 || response.status === 410) {
            failedEndpoints.push(subscription.endpoint);
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error sending to ${subscription.endpoint.substring(0, 50)}...`, errMsg);
      }
    }

    if (failedEndpoints.length > 0) {
      console.log(`Cleaning up ${failedEndpoints.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    console.log(`Successfully sent ${successCount}/${subscriptions.length} push notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedEndpoints.length,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
