import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// NAMBoard (Eswatini) buying prices — quoted in SZL (Emalangeni) per kg/unit.
const EHIS_URL = 'https://ehis.co.sz/Portal/Info/buyingprice';

// SZL is pegged 1:1 to ZAR. Rates below are units of currency per 1 USD.
const FX_PER_USD: Record<string, number> = {
  USD: 1, SZL: 18.2, ZAR: 18.2, EUR: 0.92, GBP: 0.78,
  KES: 129.5, NGN: 1540, GHS: 15.1, ZMW: 27.2, BWP: 13.7,
  MZN: 63.8, TZS: 2650, UGX: 3750, MWK: 1735, RWF: 1330,
};

const FALLBACK_PRICES = [
  { name: "Cabbage", price: 6.5, unit: "/kg" },
  { name: "Tomato", price: 14.0, unit: "/kg" },
  { name: "Potato", price: 9.0, unit: "/kg" },
  { name: "Onion", price: 11.0, unit: "/kg" },
  { name: "Green Pepper", price: 16.0, unit: "/kg" },
  { name: "Carrot", price: 8.5, unit: "/kg" },
  { name: "Butternut", price: 7.0, unit: "/kg" },
  { name: "Beetroot", price: 9.5, unit: "/kg" },
  { name: "Spinach", price: 12.0, unit: "/kg" },
  { name: "Avocado", price: 9.5, unit: "/kg" },
]; // SZL baseline

interface Item { name: string; price: number; currency: string; change: number; unit: string }

const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
let scrapeCache: { at: number; items: { name: string; price: number; unit: string }[]; date?: string } | null = null;
const SCRAPE_TTL_MS = 60 * 60 * 1000;

function normalizeCurrency(value: unknown) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : 'SZL';
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function scrapeEhis() {
  if (scrapeCache && Date.now() - scrapeCache.at < SCRAPE_TTL_MS) return scrapeCache;

  const res = await fetch(EHIS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImveloApp/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`ehis ${res.status}`);
  const html = await res.text();

  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error('ehis table not found');

  const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const items: { name: string; price: number; unit: string }[] = [];
  let date: string | undefined;

  for (const row of rows) {
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map((c) =>
      decode(c.replace(/<[^>]+>/g, ' '))
    );
    if (cells.length < 3) continue;
    const [name, rawUnit, rawPrice, rawDate] = cells;
    const price = parseFloat((rawPrice || '').replace(/[^\d.]/g, ''));
    if (!name || !isFinite(price) || price <= 0) continue;
    const unit = /kg/i.test(rawUnit || '') ? '/kg' : `/${decode(rawUnit || 'unit').replace(/^P\//i, '')}`;
    if (rawDate && !date) date = rawDate;
    items.push({ name: titleCase(name.toLowerCase()), price, unit });
  }

  if (items.length === 0) throw new Error('ehis parsed 0 rows');
  scrapeCache = { at: Date.now(), items, date };
  return scrapeCache;
}

function convert(priceSzl: number, currency: string) {
  const rate = (FX_PER_USD[currency] ?? FX_PER_USD.SZL) / FX_PER_USD.SZL;
  const value = priceSzl * rate;
  return Number(value.toFixed(value < 1 ? 3 : 2));
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

  let currency = 'SZL';
  try {
    const body = await req.json();
    currency = normalizeCurrency(body?.currency);
  } catch { /* no body */ }

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return ok(cached.payload);

  let items = FALLBACK_PRICES;
  let source = 'baseline';
  let period: string | undefined;
  try {
    const scraped = await scrapeEhis();
    items = scraped.items;
    period = scraped.date;
    source = 'namboard_ehis';
  } catch (e) {
    console.error('EHIS scrape failed:', e instanceof Error ? e.message : e);
  }

  const prices: Item[] = items.map((p) => ({
    name: p.name,
    price: convert(p.price, currency),
    currency,
    change: 0,
    unit: p.unit,
  }));

  const payload = {
    prices,
    updated_at: new Date().toISOString(),
    period,
    source,
    fallback: source !== 'namboard_ehis',
  };
  cache.set(currency, { at: Date.now(), payload });
  return ok(payload);
});
