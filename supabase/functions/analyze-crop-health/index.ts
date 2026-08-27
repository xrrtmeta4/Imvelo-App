 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };

  const sevenDaysAgoISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  };

  // Collapse the daily ERA5 arrays into a compact summary the LLM can reason over.
  const summarizeEra5 = (daily: Record<string, any[] | null>, crop: string, planted: string | null) => {
    const n = (daily?.time?.length ?? 0);
    if (n === 0) return null;
    const last = (k: string) => daily[k]?.[n - 1];
    const sum = (k: string) => daily[k]?.reduce((a: number, v: number) => a + (v ?? 0), 0) ?? 0;
    const avg = (k: string, dec = 1) => {
      const s = sum(k);
      return +(s / n).toFixed(dec);
    };
    return {
      period: `${daily.time?.[0]} → ${daily.time?.[n - 1]}`,
      crop,
      plantingDate: planted ?? 'unknown',
      totalPrecip_mm: +sum('precipitation_sum').toFixed(1),
      totalET0_mm: +sum('et0_fao_evapotranspiration').toFixed(1),
      meanMaxTemp_C: avg('temperature_2m_max', 1),
      meanMinTemp_C: avg('temperature_2m_min', 1),
      meanShortwaveRadiation_MJ: avg('shortwave_radiation_sum', 0),
      meanSoilMoisture_pct: +((avg('soil_moisture_0_to_7cm', 4) * 100)).toFixed(1),
      waterBalance_mm: +((sum('precipitation_sum') - sum('et0_fao_evapotranspiration')).toFixed(1)),
    };
  };

  serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
    try {
      const { imageUrl, cropType, plantingDate, expectedGrowthStage, latitude, longitude } = await req.json();
      const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
     const GEMINI_KEY = Deno.env.get('Gemini');
     const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
     const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
     const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
     const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';

      if (!LOVABLE_API_KEY) {
        throw new Error('Gemini API key is not configured');
      }

      console.log("Analyzing crop health for:", cropType, "planted:", plantingDate);

      // Fetch ERA5 reanalysis (Copernicus CDS) weather context for the farm location
      // over the 7 days preceding the image. Open-Meteo serves ERA5-Single-Levels
      // variables (precipitation, evapotranspiration, soil moisture, temperature,
      // radiation) without requiring an API key — mirrors the cdsapi ERA5 request.
      let weatherContext: any = null;
      if (latitude != null && longitude != null) {
        try {
          const era5Url = new URL('https://archive-api.open-meteo.com/v1/era5');
          era5Url.searchParams.set('latitude', String(latitude));
          era5Url.searchParams.set('longitude', String(longitude));
          era5Url.searchParams.set('start_date', sevenDaysAgoISO());
          era5Url.searchParams.set('end_date', new Date().toISOString().slice(0, 10));
          era5Url.searchParams.set('daily', [
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'et0_fao_evapotranspiration',
            'shortwave_radiation_sum',
            'soil_moisture_0_to_7cm',
          ].join(','));
          era5Url.searchParams.set('timezone', 'auto');
          const wresp = await fetch(era5Url.toString());
          if (wresp.ok) {
            const wjson = await wresp.json();
            weatherContext = summarizeEra5(wjson.daily, cropType, plantingDate || null);
            console.log('ERA5 context for crop-health:', weatherContext);
          }
        } catch (e) {
          console.warn('ERA5 fetch failed (non-fatal):', e);
        }
      }

      const systemPrompt = `You are an expert agricultural scientist specializing in crop phenotyping and precision agriculture.
 Analyze crop images to detect:
 1. Current growth stage (seedling, vegetative, flowering, fruiting, maturity)
 2. Nutrient deficiencies (nitrogen, phosphorus, potassium, iron, magnesium, etc.)
 3. Water stress indicators (wilting, leaf curl, color changes)
 4. Early disease onset before visible symptoms (discoloration patterns, texture changes)
 5. Pest damage indicators
 6. Overall crop vigor score (1-100)
 
 Compare observed growth stage with expected stage based on planting date.
 Provide actionable recommendations for each issue detected.
 
 Respond in JSON format with this structure:
 {
   "currentGrowthStage": "string",
   "expectedGrowthStage": "string", 
   "growthDeviation": "on_track" | "ahead" | "delayed" | "stunted",
   "vigorScore": number (1-100),
   "stressIndicators": [
     {
       "type": "nutrient" | "water" | "disease" | "pest",
       "severity": "low" | "medium" | "high" | "critical",
       "name": "string",
       "description": "string",
       "affectedArea": "percentage estimate",
       "recommendation": "string"
     }
   ],
   "nutrientStatus": {
     "nitrogen": "deficient" | "adequate" | "excess",
     "phosphorus": "deficient" | "adequate" | "excess",
     "potassium": "deficient" | "adequate" | "excess",
     "micronutrients": "deficient" | "adequate" | "excess"
   },
   "waterStatus": "severe_stress" | "moderate_stress" | "mild_stress" | "optimal" | "overwatered",
   "overallHealth": "critical" | "poor" | "fair" | "good" | "excellent",
   "priorityActions": ["string"],
   "estimatedYieldImpact": "percentage change estimate",
   "confidence": number (1-100)
 }`;
 
      const userPrompt = `Analyze this crop image for phenotype-level health assessment:
 - Crop type: ${cropType || 'Unknown'}
 - Planting date: ${plantingDate || 'Unknown'}
 - Expected growth stage: ${expectedGrowthStage || 'Unknown'}
 - Location: ${latitude != null && longitude != null ? `${latitude}, ${longitude}` : 'not provided'}

${weatherContext
        ? `## ERA5 reanalysis weather context (last 7 days at this location, Copernicus CDS)
 - Period: ${weatherContext.period}
 - Total precipitation: ${weatherContext.totalPrecip_mm} mm
 - Reference crop ET0 (evapotranspiration): ${weatherContext.totalET0_mm} mm
 - Water balance (precip − ET0): ${weatherContext.waterBalance_mm} mm
 - Mean daily max temp: ${weatherContext.meanMaxTemp_C} °C / min: ${weatherContext.meanMinTemp_C} °C
 - Mean short-wave radiation: ${weatherContext.meanShortwaveRadiation_MJ} MJ/m²/day
 - Mean top-soil moisture (0–7cm): ${weatherContext.meanSoilMoisture_pct}%

Use the ERA5 water balance to disambiguate observed stress:
 - A negative water balance (precip < ET0) plus wilting leaves → drought stress, NOT a pest/disease issue.
 - Adequate/surplus rainfall with localized chlorosis → nutrient deficiency (leaching from excess rain).
 - Adequate water with high radiation and heat → heat/water demand stress.
Ground any watering recommendation in the ERA5 numbers above.`
        : '## No weather context available (location not provided).'}
`}
 
 Image URL: ${imageUrl}
 
 Provide a comprehensive analysis detecting any sub-visible stress, nutrient deficiencies, water stress, or early disease onset. Flag any deviations from expected growth curves.`;
 
     const response = await fetch(AI_URL, {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: `${AI_MODEL_PREFIX}gemini-2.5-pro`,
         messages: [
           { role: "system", content: systemPrompt },
           { 
             role: "user", 
             content: [
               { type: "text", text: userPrompt },
               { type: "image_url", image_url: { url: imageUrl } }
             ]
           }
         ],
         max_tokens: 2000,
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI analysis failed: ${response.status}`);
     }
 
     const aiResponse = await response.json();
     const content = aiResponse.choices?.[0]?.message?.content;
 
     // Parse JSON from response
     let analysis;
     try {
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         analysis = JSON.parse(jsonMatch[0]);
       } else {
         throw new Error("No JSON found in response");
       }
     } catch (parseError) {
       console.error("Failed to parse AI response:", content);
       analysis = {
         currentGrowthStage: "Unable to determine",
         vigorScore: 50,
         stressIndicators: [],
         overallHealth: "unknown",
         priorityActions: ["Please try with a clearer image"],
         confidence: 0
       };
     }
 
     console.log("Crop health analysis complete:", analysis.overallHealth);
 
     return new Response(JSON.stringify(analysis), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("analyze-crop-health error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });