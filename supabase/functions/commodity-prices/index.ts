import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FALLBACK_PRICES = [
  { name: "Maize", price: 215.5, currency: "USD", change: 1.8, unit: "/ton" },
  { name: "Wheat", price: 248.3, currency: "USD", change: -0.6, unit: "/ton" },
  { name: "Soybeans", price: 382.4, currency: "USD", change: 2.1, unit: "/ton" },
  { name: "Rice", price: 518.0, currency: "USD", change: 0.3, unit: "/ton" },
  { name: "Sugar", price: 0.224, currency: "USD", change: -1.2, unit: "/lb" },
  { name: "Coffee", price: 4.82, currency: "USD", change: 3.4, unit: "/lb" },
  { name: "Cotton", price: 0.72, currency: "USD", change: -0.4, unit: "/lb" },
  { name: "Cattle", price: 198.5, currency: "USD", change: 0.9, unit: "/cwt" },
  { name: "Palm Oil", price: 892.0, currency: "USD", change: -1.7, unit: "/ton" },
  { name: "Cocoa", price: 8420, currency: "USD", change: 5.2, unit: "/ton" },
];

// In-memory cache per isolate to absorb bursts and reduce AI calls
const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function ok(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let currency = 'USD';
  try {
    const body = await req.json();
    if (body?.currency) currency = body.currency;
  } catch { /* no body, use default */ }

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return ok(cached.payload);
  }

  try {
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) {
      return ok({ prices: FALLBACK_PRICES, updated_at: new Date().toISOString(), fallback: true });
    }

    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash-lite`,
        messages: [
          {
            role: "system",
            content: `You are a commodity market data provider. Return ONLY a valid JSON array of current international agricultural commodity prices as of ${today}. Each object must have: name (string), price (number), currency (always "${currency}"), change (number, percent change from yesterday, can be negative), unit (string like "/ton", "/lb", "/cwt", "/bu"). Include these commodities: Maize, Wheat, Soybeans, Rice, Sugar, Coffee, Cotton, Cattle, Palm Oil, Cocoa, Sunflower Oil, Barley. Use realistic current market prices CONVERTED TO ${currency}. Return ONLY the JSON array, no markdown.`
          },
          { role: "user", content: `Current agricultural commodity prices for ${today} in ${currency}` }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      // Always return 200 with fallback so the client never sees a 4xx/5xx
      // (avoids the global blank-screen handler firing on a non-critical widget).
      console.warn('AI gateway non-OK', response.status);
      const payload = { prices: FALLBACK_PRICES, updated_at: new Date().toISOString(), fallback: true, reason: response.status === 429 ? 'rate_limited' : `ai_${response.status}` };
      cache.set(currency, { at: Date.now(), payload });
      return ok(payload);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '[]';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const prices = JSON.parse(content);
    const payload = { prices, updated_at: new Date().toISOString() };
    cache.set(currency, { at: Date.now(), payload });

    return ok(payload);
  } catch (error) {
    console.error('Error fetching commodity prices:', error);
    return ok({ prices: FALLBACK_PRICES, updated_at: new Date().toISOString(), fallback: true, reason: 'exception' });
  }
});
