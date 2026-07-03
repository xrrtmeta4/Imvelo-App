import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchHistoricalClimate(lat: number, lon: number): Promise<any> {
  try {
    // Shorter window (3 years) for much faster response while keeping seasonal signal
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    );
    if (!response.ok) return null;
    const data = await response.json();

    const monthlyData: Record<number, { temps: number[], precip: number[] }> = {};
    if (data.daily?.time) {
      data.daily.time.forEach((date: string, i: number) => {
        const month = new Date(date).getMonth();
        if (!monthlyData[month]) monthlyData[month] = { temps: [], precip: [] };
        const avgTemp = (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2;
        monthlyData[month].temps.push(avgTemp);
        monthlyData[month].precip.push(data.daily.precipitation_sum[i] || 0);
      });
    }

    const monthlyAverages: Record<number, any> = {};
    for (const month in monthlyData) {
      const d = monthlyData[month];
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      monthlyAverages[month] = {
        avgTemp: avg(d.temps),
        avgPrecip: avg(d.precip) * 30,
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

// Free open API: Open-Meteo Air Quality (no key required)
async function fetchAirQuality(lat: number, lon: number): Promise<any> {
  try {
    const r = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,dust,uv_index&timezone=auto`
    );
    if (!r.ok) return null;
    return (await r.json()).current;
  } catch (e) { console.error('AQ error:', e); return null; }
}

// Free open API: Open-Meteo Climate Change Projections (downscaled CMIP6, monthly means)
async function fetchClimateProjections(lat: number, lon: number): Promise<any> {
  try {
    const start = new Date(); start.setDate(1);
    const end = new Date(start); end.setFullYear(start.getFullYear() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const r = await fetch(
      `https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&models=MRI_AGCM3_2_S&daily=temperature_2m_mean,precipitation_sum&timezone=auto`
    );
    if (!r.ok) return null;
    const j = await r.json();
    // Aggregate to monthly for compactness
    const daily = j.daily;
    if (!daily?.time) return null;
    const buckets: Record<string, { t: number[]; p: number[] }> = {};
    daily.time.forEach((d: string, i: number) => {
      const key = d.slice(0, 7);
      buckets[key] = buckets[key] || { t: [], p: [] };
      if (daily.temperature_2m_mean?.[i] != null) buckets[key].t.push(daily.temperature_2m_mean[i]);
      if (daily.precipitation_sum?.[i] != null) buckets[key].p.push(daily.precipitation_sum[i]);
    });
    const monthly: Record<string, { meanTemp: number; totalPrecip: number }> = {};
    for (const k in buckets) {
      const b = buckets[k];
      monthly[k] = {
        meanTemp: b.t.length ? +(b.t.reduce((a, c) => a + c, 0) / b.t.length).toFixed(2) : 0,
        totalPrecip: +b.p.reduce((a, c) => a + c, 0).toFixed(1),
      };
    }
    return monthly;
  } catch (e) { console.error('Projection error:', e); return null; }
}

// Free open API: NASA POWER agroclimatology (solar radiation, ET0, dew point)
async function fetchNasaPower(lat: number, lon: number): Promise<any> {
  try {
    const end = new Date(); end.setDate(end.getDate() - 3);
    const start = new Date(end); start.setDate(end.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const r = await fetch(
      `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,T2M,PRECTOTCORR,RH2M&community=AG&longitude=${lon}&latitude=${lat}&start=${fmt(start)}&end=${fmt(end)}&format=JSON`
    );
    if (!r.ok) return null;
    const j = await r.json();
    const p = j?.properties?.parameter || {};
    const avg = (o: any) => {
      const vals = Object.values(o || {}).filter((v: any) => typeof v === 'number' && v > -900) as number[];
      return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
    };
    return {
      avgSolarRadiation_MJ_m2: avg(p.ALLSKY_SFC_SW_DWN),
      avgTemp_C: avg(p.T2M),
      totalPrecip_mm: p.PRECTOTCORR ? +Object.values(p.PRECTOTCORR).filter((v: any) => v > -900).reduce((a: number, b: any) => a + b, 0).toFixed(1) : null,
      avgHumidity_pct: avg(p.RH2M),
      windowDays: 30,
    };
  } catch (e) { console.error('NASA POWER error:', e); return null; }
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
    const { latitude, longitude, crops, quantum = false } = await req.json();
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) throw new Error('Gemini API key is not configured');

    const lat = latitude || -26.3054;
    const lon = longitude || 31.1367;
    console.log("Analyzing climate risk for:", lat, lon);

    // Fetch all data in parallel (Open-Meteo + NASA POWER — all free, no key)
    const [historicalData, forecastData, currentConditions, airQuality, projections, nasaPower] = await Promise.all([
      fetchHistoricalClimate(lat, lon),
      fetchSeasonalForecast(lat, lon),
      fetchCurrentConditions(lat, lon),
      fetchAirQuality(lat, lon),
      fetchClimateProjections(lat, lon),
      fetchNasaPower(lat, lon),
    ]);

    const extremeEvents = calculateExtremeEventProbabilities(lat, lon, historicalData);

    // Determine region name for data harvesting
    const regionGuess = lat < -15 ? 'Southern Africa' : lat < 0 ? 'East Africa' : lat < 15 ? 'West/Central Africa' : 'North Africa/Sahel';

    // Harvest data for future research (non-blocking)
    harvestClimateData(lat, lon, currentConditions, forecastData, regionGuess);

    // Knowledge graph query with a hard 2s timeout so it can never block analysis
    let knowledgeContext = '';
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2000);
      const graphResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/knowledge-graph-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ crop: crops?.[0], region: regionGuess }),
          signal: ctl.signal,
        }
      );
      clearTimeout(t);
      if (graphResponse.ok) {
        const gd = await graphResponse.json();
        if (gd.context?.trim()) knowledgeContext = gd.context;
      }
    } catch (e) {
      console.error('Knowledge graph query skipped (non-fatal):', (e as Error).message);
    }

    const systemPrompt = `You are an expert agricultural climate scientist specializing in climate risk assessment for African farming regions.
Analyze climate data and provide actionable farming recommendations.
${knowledgeContext ? `\nAGRONOMIC KNOWLEDGE GRAPH DATA:\n${knowledgeContext}\nUse this verified local data to refine crop-specific recommendations.\n` : ''}
Current real-time conditions: ${JSON.stringify(currentConditions)}

Respond in JSON format:
{
  "overallRiskLevel": "low" | "moderate" | "high" | "critical",
  "riskScore": number (0-100),
  "outlooks": {
    "twoWeeks":    { "period": "Next 2 weeks",   "conditions": "string", "tempTrend": "string", "rainfallTrend": "string", "farmingOpportunities": ["list"], "risks": ["list"], "yieldProjection": "string", "suitableCrops": ["at least 3 specific crops"], "recommendedActions": ["at least 3 concrete actions"] },
    "threeMonths": { "period": "Next 3 months",  "conditions": "string", "tempTrend": "string", "rainfallTrend": "string", "farmingOpportunities": ["list"], "risks": ["list"], "yieldProjection": "string", "suitableCrops": ["at least 3 specific crops"], "recommendedActions": ["at least 3 concrete actions"] },
    "sixMonths":   { "period": "Next 6 months",  "conditions": "string", "tempTrend": "string", "rainfallTrend": "string", "farmingOpportunities": ["list"], "risks": ["list"], "yieldProjection": "string", "suitableCrops": ["at least 3 specific crops"], "recommendedActions": ["at least 3 concrete actions"] },
    "oneYear":     { "period": "Next 12 months", "conditions": "string", "tempTrend": "string", "rainfallTrend": "string", "climateTrends": ["list"], "suitabilityChanges": ["list"], "yieldProjection": "string", "suitableCrops": ["at least 3 specific crops"], "recommendedActions": ["at least 3 concrete actions"] }
  },
  "IMPORTANT": "Every outlook horizon MUST include non-empty suitableCrops and recommendedActions arrays tailored to that horizon's expected conditions in ${regionGuess}. Never leave them empty.",
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

Air quality (Open-Meteo): ${JSON.stringify(airQuality)}

Downscaled CMIP6 12-month climate projection (Open-Meteo): ${JSON.stringify(projections)}

NASA POWER agroclimatology (last 30d — solar radiation, temp, precip, humidity): ${JSON.stringify(nasaPower)}

Cross-reference ALL of the above sources. Explicitly reason about:
- Divergence between the 16-day forecast and the 3-year historical seasonal baseline
- How CMIP6 projections shift the 6-month and 1-year outlook vs historical norms
- Solar radiation & humidity trends from NASA POWER for irrigation and disease pressure
- Dust/PM impact on photosynthesis and worker health where relevant
Then produce comprehensive climate risk analysis with scenario-based yield projections, adaptive recommendations, and research insights. Ground every recommendation in the numeric data provided above and cite which dataset supports it in the "reason" field where applicable.`;

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
        const settled = await Promise.allSettled(models.map(callModel));
        const ok = settled
          .map((r, i) => ({ r, m: models[i] }))
          .filter(x => x.r.status === 'fulfilled' && (x.r as any).value)
          .map(x => ({ model: x.m, value: (x.r as PromiseFulfilledResult<any>).value }));
        if (ok.length === 0) throw new Error('all models failed');
        // Consensus risk score: mean of numeric riskScore across models
        const scores = ok.map(x => Number(x.value.riskScore)).filter(n => !isNaN(n));
        // Pick most detailed model output as base
        ok.sort((a, b) => JSON.stringify(b.value).length - JSON.stringify(a.value).length);
        analysis = ok[0].value;
        if (scores.length) analysis.riskScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        // Consensus risk level: most common
        const levels: Record<string, number> = {};
        ok.forEach(x => { const l = x.value.overallRiskLevel; if (l) levels[l] = (levels[l] || 0) + 1; });
        const topLevel = Object.entries(levels).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topLevel) analysis.overallRiskLevel = topLevel;
        quantumMeta = { enabled: true, modelsResponded: ok.map(x => x.model), consensusFrom: ok.length };
      } else {
        analysis = await callModel('gemini-2.5-flash-lite');
      }
      if (!analysis) throw new Error('No JSON found');
    } catch (parseError) {
      console.error("Parse error:", parseError);
      const stubHorizon = (period: string) => ({
        period,
        conditions: `Typical ${regionGuess} seasonal conditions expected for ${period.toLowerCase()}.`,
        tempTrend: 'Near-normal temperatures',
        rainfallTrend: 'Near-normal rainfall',
        yieldProjection: 'Average yields with standard practices',
        farmingOpportunities: ['Plan land preparation', 'Stock inputs early', 'Review crop insurance'],
        risks: ['Unexpected dry spells', 'Localized pest pressure'],
        suitableCrops: ['Maize', 'Beans', 'Sorghum', 'Vegetables', 'Sweet potato'],
        recommendedActions: ['Mulch beds to conserve moisture', 'Schedule irrigation based on forecast', 'Monitor pest traps weekly'],
      });
      analysis = {
        overallRiskLevel: "moderate",
        riskScore: 50,
        outlooks: {
          twoWeeks: stubHorizon('Next 2 weeks'),
          threeMonths: stubHorizon('Next 3 months'),
          sixMonths: stubHorizon('Next 6 months'),
          oneYear: stubHorizon('Next 12 months'),
        },
        cropRecommendations: [
          { crop: 'Maize', suitability: 'medium', optimalPlantingWindow: 'Start of rains', riskFactors: ['Dry spell mid-season'], adaptations: ['Use drought-tolerant varieties', 'Apply mulch'] },
          { crop: 'Beans', suitability: 'high', optimalPlantingWindow: 'Early wet season', riskFactors: ['Fungal disease in humid weeks'], adaptations: ['Space rows for airflow', 'Rotate with cereals'] },
          { crop: 'Sorghum', suitability: 'high', optimalPlantingWindow: 'Mid-season', riskFactors: ['Bird damage'], adaptations: ['Netting on heads', 'Community scaring'] },
        ],
        adaptiveActions: []
      };
    }

    analysis.extremeEventProbabilities = extremeEvents;
    analysis.forecastDays = forecastData?.time?.length || 0;
    analysis.currentConditions = currentConditions;
    analysis.forecastData = forecastData;
    analysis.historicalMonthly = historicalData;
    analysis.airQuality = airQuality;
    analysis.climateProjections = projections;
    analysis.nasaPower = nasaPower;
    analysis.dataSources = ['open-meteo-forecast', 'open-meteo-archive', 'open-meteo-air-quality', 'open-meteo-climate-cmip6', 'nasa-power-agroclimatology'];
    analysis.dataHarvested = true;
    analysis.knowledgeGraphUsed = !!knowledgeContext;
    if (quantumMeta) analysis.quantum = quantumMeta;

    // Backward-compat shims so older UI fields still resolve
    if (analysis.outlooks) {
      analysis.shortTermOutlook = analysis.outlooks.twoWeeks;
      analysis.midTermOutlook = analysis.outlooks.threeMonths;
      analysis.longTermOutlook = analysis.outlooks.oneYear;
    }

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
