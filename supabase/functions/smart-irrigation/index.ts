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
    const { latitude, longitude, crops, soilType } = await req.json();
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
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

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-3-flash-preview`,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
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
