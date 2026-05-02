import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchHistoricalClimate(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`
    );
    if (!response.ok) return null;
    const data = await response.json();

    const monthlyData: Record<number, { temps: number[], precip: number[], wind: number[] }> = {};
    if (data.daily?.time) {
      data.daily.time.forEach((date: string, i: number) => {
        const month = new Date(date).getMonth();
        if (!monthlyData[month]) monthlyData[month] = { temps: [], precip: [], wind: [] };
        const avgTemp = (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2;
        monthlyData[month].temps.push(avgTemp);
        monthlyData[month].precip.push(data.daily.precipitation_sum[i] || 0);
        monthlyData[month].wind.push(data.daily.windspeed_10m_max?.[i] || 0);
      });
    }

    const monthlyAverages: Record<number, any> = {};
    for (const month in monthlyData) {
      const d = monthlyData[month];
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      monthlyAverages[month] = {
        avgTemp: avg(d.temps),
        avgPrecip: avg(d.precip) * 30,
        avgWind: avg(d.wind),
        tempStdDev: Math.sqrt(d.temps.reduce((s, v) => s + Math.pow(v - avg(d.temps), 2), 0) / d.temps.length),
      };
    }
    return monthlyAverages;
  } catch (error) {
    console.error("Historical data fetch error:", error);
    return null;
  }
}

async function fetchSeasonalForecast(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max,et0_fao_evapotranspiration&hourly=soil_moisture_0_to_7cm&forecast_days=16&timezone=auto`
    );
    if (!response.ok) return null;
    return (await response.json()).daily;
  } catch (error) {
    console.error("Seasonal forecast error:", error);
    return null;
  }
}

async function fetchCurrentConditions(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode,soil_moisture_0_to_7cm&timezone=auto`
    );
    if (!response.ok) return null;
    return (await response.json()).current;
  } catch (error) {
    console.error("Current conditions error:", error);
    return null;
  }
}

function calculateExtremeEventProbabilities(lat: number, lon: number, historicalData: any): any {
  const currentMonth = new Date().getMonth();
  const isWetSeason = currentMonth >= 9 || currentMonth <= 3;
  const isDrySeason = currentMonth >= 4 && currentMonth <= 8;
  // Adjust for latitude (equatorial vs subtropical)
  const isEquatorial = Math.abs(lat) < 10;
  const isSahel = lat > 10 && lat < 20;

  return {
    drought: {
      probability: isSahel ? 0.45 : isDrySeason ? 0.35 : 0.15,
      severity: isSahel ? "high" : isDrySeason ? "moderate" : "low",
      period: "Next 3 months"
    },
    flood: {
      probability: isEquatorial ? 0.30 : isWetSeason ? 0.25 : 0.05,
      severity: isEquatorial && isWetSeason ? "high" : isWetSeason ? "moderate" : "low",
      period: "Next 3 months"
    },
    heatwave: {
      probability: currentMonth >= 10 || currentMonth <= 2 ? 0.40 : 0.10,
      severity: currentMonth >= 11 && currentMonth <= 1 ? "high" : "moderate",
      period: "Next 3 months"
    },
    frost: {
      probability: currentMonth >= 5 && currentMonth <= 8 && Math.abs(lat) > 20 ? 0.30 : 0.02,
      severity: currentMonth >= 6 && currentMonth <= 7 ? "high" : "low",
      period: "Next 3 months"
    },
    locust: {
      probability: (isSahel || (lat > -5 && lat < 15 && lon > 30 && lon < 55)) ? 0.15 : 0.01,
      severity: "catastrophic",
      period: "Next 3 months"
    }
  };
}

async function harvestClimateData(lat: number, lon: number, currentConditions: any, forecastData: any, region: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Store current observation
    if (currentConditions) {
      await supabase.from('climate_observations').insert({
        latitude: lat,
        longitude: lon,
        temperature: currentConditions.temperature_2m,
        humidity: currentConditions.relative_humidity_2m,
        rainfall_mm: currentConditions.precipitation,
        wind_speed_kmh: currentConditions.wind_speed_10m,
        soil_moisture: currentConditions.soil_moisture_0_to_7cm,
        weather_code: currentConditions.weathercode,
        observation_source: 'weather_api',
        region: region,
        observed_at: new Date().toISOString(),
      });
    }

    // Store forecast data points for trend analysis
    if (forecastData?.time) {
      const forecasts = forecastData.time.slice(0, 5).map((date: string, i: number) => ({
        latitude: lat,
        longitude: lon,
        temperature: (forecastData.temperature_2m_max[i] + forecastData.temperature_2m_min[i]) / 2,
        rainfall_mm: forecastData.precipitation_sum[i],
        wind_speed_kmh: forecastData.windspeed_10m_max?.[i],
        observation_source: 'weather_api',
        region: region,
        observed_at: date + 'T12:00:00Z',
        notes: 'forecast_data',
      }));
      await supabase.from('climate_observations').insert(forecasts);
    }

    console.log(`Harvested climate data for ${region} (${lat}, ${lon})`);
  } catch (err) {
    console.error('Climate data harvest error (non-fatal):', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, crops } = await req.json();
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : AI_URL;
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) throw new Error('Gemini API key is not configured');

    const lat = latitude || -26.3054;
    const lon = longitude || 31.1367;
    console.log("Analyzing climate risk for:", lat, lon);

    // Fetch all data in parallel
    const [historicalData, forecastData, currentConditions] = await Promise.all([
      fetchHistoricalClimate(lat, lon),
      fetchSeasonalForecast(lat, lon),
      fetchCurrentConditions(lat, lon),
    ]);

    const extremeEvents = calculateExtremeEventProbabilities(lat, lon, historicalData);

    // Determine region name for data harvesting
    const regionGuess = lat < -15 ? 'Southern Africa' : lat < 0 ? 'East Africa' : lat < 15 ? 'West/Central Africa' : 'North Africa/Sahel';

    // Harvest data for future research (non-blocking)
    harvestClimateData(lat, lon, currentConditions, forecastData, regionGuess);

    // Query knowledge graph for crop-specific context
    let knowledgeContext = '';
    try {
      const graphResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/knowledge-graph-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ crop: crops?.[0], region: regionGuess }),
        }
      );
      if (graphResponse.ok) {
        const gd = await graphResponse.json();
        if (gd.context?.trim()) knowledgeContext = gd.context;
      }
    } catch (e) {
      console.error('Knowledge graph query failed (non-fatal):', e);
    }

    const systemPrompt = `You are an expert agricultural climate scientist specializing in climate risk assessment for African farming regions.
Analyze climate data and provide actionable farming recommendations.
${knowledgeContext ? `\nAGRONOMIC KNOWLEDGE GRAPH DATA:\n${knowledgeContext}\nUse this verified local data to refine crop-specific recommendations.\n` : ''}
Current real-time conditions: ${JSON.stringify(currentConditions)}

Respond in JSON format:
{
  "overallRiskLevel": "low" | "moderate" | "high" | "critical",
  "riskScore": number (0-100),
  "shortTermOutlook": {
    "period": "Next 2 weeks",
    "conditions": "description",
    "farmingOpportunities": ["list"],
    "risks": ["list"]
  },
  "midTermOutlook": {
    "period": "Next 1-3 months",
    "conditions": "description",
    "yieldProjection": "percentage vs normal",
    "risks": ["list"]
  },
  "longTermOutlook": {
    "period": "Next season",
    "climateTrends": ["list"],
    "suitabilityChanges": ["crops becoming more/less suitable"]
  },
  "cropRecommendations": [
    {
      "crop": "name",
      "suitability": "high" | "medium" | "low",
      "optimalPlantingWindow": "dates",
      "riskFactors": ["list"],
      "adaptations": ["list"]
    }
  ],
  "adaptiveActions": [
    {
      "priority": "immediate" | "short_term" | "seasonal",
      "action": "description",
      "reason": "why",
      "expectedBenefit": "description"
    }
  ],
  "scenarioProjections": [
    {
      "scenario": "name",
      "probability": "percentage",
      "yieldImpact": "percentage",
      "recommendedResponse": "action"
    }
  ],
  "researchInsights": {
    "dataQuality": "assessment of available data",
    "uncertaintyFactors": ["list"],
    "recommendedMonitoring": ["what to track going forward"]
  }
}`;

    const userPrompt = `Analyze climate risk for a farm at coordinates ${lat}, ${lon} (${regionGuess}):

Current crops: ${crops?.join(', ') || 'Mixed farming'}

Current real-time weather: Temperature: ${currentConditions?.temperature_2m}°C, Humidity: ${currentConditions?.relative_humidity_2m}%, Wind: ${currentConditions?.wind_speed_10m} km/h, Soil Moisture: ${currentConditions?.soil_moisture_0_to_7cm}

16-day forecast data: ${JSON.stringify(forecastData)}

Extreme event probabilities: ${JSON.stringify(extremeEvents)}

Historical monthly averages (10 years): ${JSON.stringify(historicalData)}

Provide comprehensive climate risk analysis with scenario-based yield projections, adaptive recommendations, and research insights for long-term climate monitoring.`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash`,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
    } catch (parseError) {
      console.error("Parse error:", content);
      analysis = {
        overallRiskLevel: "moderate",
        riskScore: 50,
        shortTermOutlook: { period: "Next 2 weeks", conditions: "Normal conditions expected" },
        adaptiveActions: []
      };
    }

    analysis.extremeEventProbabilities = extremeEvents;
    analysis.forecastDays = forecastData?.time?.length || 0;
    analysis.currentConditions = currentConditions;
    analysis.dataHarvested = true;
    analysis.knowledgeGraphUsed = !!knowledgeContext;

    console.log("Climate risk analysis complete:", analysis.overallRiskLevel);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("climate-risk-analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
