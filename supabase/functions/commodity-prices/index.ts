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

const FX_RATES: Record<string, number> = {
  USD: 1,
  SZL: 18.2,
  ZAR: 18.2,
  EUR: 0.92,
  GBP: 0.78,
  KES: 129.5,
  NGN: 1540,
  GHS: 15.1,
  ZMW: 27.2,
  BWP: 13.7,
};

// In-memory cache per isolate to keep responses consistent across bursts.
const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeCurrency(value: unknown) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : 'USD';
}

function pricesForCurrency(currency: string) {
  const rate = FX_RATES[currency] ?? 1;
  return FALLBACK_PRICES.map((price) => ({
    ...price,
    currency,
    price: Number((price.price * rate).toFixed(price.price < 1 ? 3 : 2)),
  }));
}

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
    currency = normalizeCurrency(body?.currency);
  } catch { /* no body, use default */ }

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return ok(cached.payload);
  }

  const payload = {
    prices: pricesForCurrency(currency),
    updated_at: new Date().toISOString(),
    source: 'stable_baseline',
  };
  cache.set(currency, { at: Date.now(), payload });
  return ok(payload);
});
