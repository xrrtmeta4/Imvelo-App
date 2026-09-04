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
    const { latitude, longitude, name, crop, radius_m } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'latitude and longitude are required numbers' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_KEY;
    const API_KEY = GEMINI_KEY || LOVABLE_KEY;
    const AI_URL = USE_LOVABLE
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const MODEL = USE_LOVABLE ? 'google/gemini-2.5-flash' : 'gemini-2.5-flash';

    if (!API_KEY) throw new Error('AI key is not configured');

    // Weather + soil signals around the marked zone (free, no key needed)
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,windspeed_10m_max,et0_fao_evapotranspiration&hourly=soil_moisture_0_to_1cm&past_days=7&forecast_days=7&timezone=auto`;
    const wxResp = await fetch(wxUrl);
    const wx = wxResp.ok ? await wxResp.json() : null;

    const daily = wx?.daily ?? {};
    const rain7 = (daily.precipitation_sum ?? []).slice(0, 7).reduce((a: number, b: number) => a + (b || 0), 0);
    const rainNext7 = (daily.precipitation_sum ?? []).slice(7).reduce((a: number, b: number) => a + (b || 0), 0);
    const humidity = (daily.relative_humidity_2m_mean ?? []).slice(-7);
    const tmax = (daily.temperature_2m_max ?? []).slice(-7);
    const soil = (wx?.hourly?.soil_moisture_0_to_1cm ?? []).slice(-24);
    const soilAvg = soil.length ? soil.reduce((a: number, b: number) => a + (b || 0), 0) / soil.length : null;

    const prompt = `Zone: ${name || 'Unnamed field section'}
Crop: ${crop || 'mixed/unknown'}
Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} | monitored radius: ${radius_m || 100} m
Past 7-day rainfall: ${rain7.toFixed(1)} mm | Next 7-day rainfall: ${rainNext7.toFixed(1)} mm
Recent daily max temps (C): ${tmax.join(', ')}
Recent mean humidity (%): ${humidity.join(', ')}
Topsoil moisture (m3/m3, 24h avg): ${soilAvg !== null ? soilAvg.toFixed(3) : 'unavailable'}

Assess this specific farm section for a smallholder farmer in southern Africa.`;

    const systemPrompt = `You are Chloe, Imvelo's remote-sensing agronomist. You interpret satellite-era field conditions from weather, soil-moisture and seasonal signals for a marked field section.
Return STRICT JSON only, no markdown:
{
  "vegetation_health": { "index": 0-100, "label": "poor|fair|good|excellent", "summary": "1-2 sentences" },
  "moisture_status": { "level": "dry|adequate|wet", "summary": "1 sentence" },
  "pest_risk": { "score": 0-100, "level": "low|moderate|high|severe", "likely_pests": [{"name":"","risk":"low|moderate|high","why":"","scouting_tip":""}] },
  "disease_risk": { "score": 0-100, "level": "low|moderate|high|severe", "notes": "" },
  "stress_flags": ["short flag strings"],
  "actions": [{"priority":"now|this week|watch","action":"","reason":""}],
  "next_check_days": 1-14
}
Be practical, use inputs available locally, and never invent satellite pixel values you do not have.`;

    const aiResp = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error('AI error', aiResp.status, text);
      return new Response(JSON.stringify({ error: `AI ${aiResp.status}`, detail: text }), {
        status: aiResp.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? '';
    let report: any;
    try {
      report = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      report = { vegetation_health: { index: 50, label: 'fair', summary: raw.slice(0, 400) }, actions: [] };
    }

    report.observed = {
      rain_past_7d_mm: Number(rain7.toFixed(1)),
      rain_next_7d_mm: Number(rainNext7.toFixed(1)),
      soil_moisture: soilAvg !== null ? Number(soilAvg.toFixed(3)) : null,
      max_temp_c: tmax.length ? Math.max(...tmax) : null,
    };
    report.generated_at = new Date().toISOString();

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('satellite-monitor error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
