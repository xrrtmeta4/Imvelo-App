import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let currency = 'USD';
    try {
      const body = await req.json();
      if (body?.currency) currency = body.currency;
    } catch { /* no body, use default */ }

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '[]';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const prices = JSON.parse(content);

    return new Response(
      JSON.stringify({ prices, updated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching commodity prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
