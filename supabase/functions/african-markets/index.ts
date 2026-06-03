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
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { user_currency, user_country } = await req.json();
    const currency = user_currency || 'USD';
    const country = user_country || 'General';

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash`,
        messages: [
          {
            role: "system",
            content: `You are an African agricultural market intelligence expert. Return ONLY valid JSON with this exact structure:
{
  "high_demand_products": [
    {
      "product": "string (crop/product name)",
      "demand_level": "Very High" | "High" | "Moderate",
      "price_range_min": number,
      "price_range_max": number,
      "currency": "${currency}",
      "unit": "string (per ton, per kg, etc.)",
      "top_markets": ["market1", "market2", "market3"],
      "season": "string (peak season)",
      "notes": "string (brief market insight)"
    }
  ],
  "markets": [
    {
      "name": "string (market name)",
      "location": "string (city, country)",
      "type": "Wholesale" | "Retail" | "Export Hub" | "Regional",
      "specialization": "string (what they mainly trade)",
      "contact_phone": "string (real phone with country code if possible)",
      "contact_email": "string (email if available, or empty)",
      "operating_hours": "string",
      "website": "string (if available, or empty)"
    }
  ]
}

Include 12-15 high-demand products across categories: grains, vegetables, fruits, cash crops, livestock products.
Include 10-12 major African markets covering: West Africa (Lagos, Accra, Abidjan), East Africa (Nairobi, Dar es Salaam, Addis Ababa), Southern Africa (Johannesburg, Lusaka), North Africa (Cairo).
Prices MUST be in ${currency}. Use realistic current market prices converted to ${currency}.
Focus on products relevant to ${country} if specified, but include pan-African demand.
Return ONLY the JSON, no markdown.`
          },
          { role: "user", content: `African agricultural market intelligence for a farmer in ${country}, prices in ${currency}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const marketData = JSON.parse(content);

    return new Response(
      JSON.stringify({ ...marketData, currency, updated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching African market data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
