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
    const { latitude, longitude, crops, soilType, quantum = false } = await req.json();
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';

    if (!LOVABLE_API_KEY) throw new Error('Gemini API key is not configured');

    // Fetch weather data from Open-Meteo (free, no API key needed)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,windspeed_10m_max&past_days=7&forecast_days=7&timezone=auto`;
    
    const weatherResp = await fetch(weatherUrl);
    if (!weatherResp.ok) throw new Error("Failed to fetch weather data");
    const weatherData = await weatherResp.json();

    console.log("Weather data fetched for irrigation analysis");

    const systemPrompt = `You are an expert agricultural irrigation advisor and hydrologist. Analyze rainfall patterns, evapotranspiration data, and weather forecasts to provide precise irrigation recommendations.

Given weather data including past 7 days and next 7 days forecast, analyze:
1. Recent rainfall totals and patterns
2. Evapotranspiration rates (ET0)
3. Soil moisture estimation based on rain vs ET0
4. Upcoming rain probability and amounts
5. Temperature and wind effects on water needs

Respond in JSON:
{
  "soilMoistureEstimate": "dry" | "low" | "adequate" | "wet" | "saturated",
  "waterDeficit_mm": number,
  "irrigationNeeded": boolean,
  "urgency": "none" | "low" | "moderate" | "high" | "critical",
  "recommendedWater_mm": number,
  "bestIrrigationTime": "string (e.g. 'Early morning, 5-7 AM')",
  "rainfallSummary": {
    "past7Days_mm": number,
    "next7Days_mm": number,
    "nextRainDate": "string or null",
    "pattern": "string description"
  },
  "weeklySchedule": [
    {
      "day": "string",
      "action": "irrigate" | "skip" | "reduce" | "monitor",
      "amount_mm": number,
      "reason": "string"
    }
  ],
  "cropSpecificAdvice": [
    {
      "crop": "string",
      "waterNeed_mm_per_week": number,
      "currentStatus": "under-watered" | "adequate" | "over-watered",
      "recommendation": "string"
    }
  ],
  "waterSavingTips": ["string"],
  "alerts": ["string"],
  "efficiency": {
    "currentScore": number,
    "potentialSavings_percent": number,
    "method": "string recommendation"
  }
}`;

    const userPrompt = `Analyze irrigation needs based on this data:

Location: ${latitude}, ${longitude}
Crops: ${(crops || ['General crops']).join(', ')}
Soil type: ${soilType || 'Unknown (assume loam)'}

Weather Data (past 7 days + next 7 days forecast):
${JSON.stringify(weatherData.daily, null, 2)}

Provide a complete irrigation plan with daily schedule, water deficit analysis, and crop-specific advice.`;

    const callModel = async (model: string) => {
      const r = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `${AI_MODEL_PREFIX}${model}`,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2500,
        }),
      });
      if (!r.ok) throw new Error(`${model}: ${r.status}`);
      const j = await r.json();
      const c = j.choices?.[0]?.message?.content || '';
      const m = c.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    };

    let analysis: any;
    let quantumMeta: any = null;
    try {
      if (quantum) {
        const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
        const results = await Promise.allSettled(models.map(callModel));
        const ok = results
          .map((r, i) => ({ r, m: models[i] }))
          .filter(x => x.r.status === 'fulfilled' && (x.r as any).value)
          .map(x => ({ model: x.m, value: (x.r as PromiseFulfilledResult<any>).value }));
        if (ok.length === 0) throw new Error('all models failed');
        // Pick the most complete result (has weeklySchedule with items)
        ok.sort((a, b) =>
          (b.value.weeklySchedule?.length || 0) - (a.value.weeklySchedule?.length || 0) ||
          Object.keys(b.value).length - Object.keys(a.value).length
        );
        analysis = ok[0].value;
        // Average water recommendation across models
        const waters = ok.map(x => Number(x.value.recommendedWater_mm)).filter(n => !isNaN(n));
        if (waters.length) analysis.recommendedWater_mm = Math.round(waters.reduce((a, b) => a + b, 0) / waters.length);
        quantumMeta = {
          enabled: true,
          modelsResponded: ok.map(x => x.model),
          consensusFrom: ok.length,
        };
      } else {
        analysis = await callModel('gemini-3-flash-preview').catch(() => callModel('gemini-2.5-flash'));
      }
      if (!analysis) throw new Error('No JSON found');
    } catch (e) {
      console.error('Analysis error:', e);
      analysis = {
        soilMoistureEstimate: "unknown",
        irrigationNeeded: true,
        urgency: "moderate",
        recommendedWater_mm: 25,
        rainfallSummary: { past7Days_mm: 0, next7Days_mm: 0, pattern: "Unable to analyze" },
        weeklySchedule: [],
        cropSpecificAdvice: [],
        waterSavingTips: ["Please try again for accurate analysis"],
        alerts: ["Analysis incomplete - please refresh"],
        efficiency: { currentScore: 50, potentialSavings_percent: 0, method: "Unknown" }
      };
    }

    // Attach raw weather data for charts
    analysis.weatherData = weatherData.daily;
    if (quantumMeta) analysis.quantum = quantumMeta;

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("smart-irrigation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
