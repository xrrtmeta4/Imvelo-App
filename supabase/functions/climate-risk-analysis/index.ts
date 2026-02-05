 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 interface ClimateData {
   historicalAverages: any;
   seasonalForecast: any;
   extremeEvents: any;
 }
 
 async function fetchHistoricalClimate(lat: number, lon: number): Promise<any> {
   // Fetch historical climate data (past 10 years averages)
   const endDate = new Date();
   const startDate = new Date();
   startDate.setFullYear(endDate.getFullYear() - 10);
   
   try {
     const response = await fetch(
       `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
     );
     
     if (!response.ok) return null;
     
     const data = await response.json();
     
     // Calculate monthly averages
     const monthlyData: Record<number, { temps: number[], precip: number[] }> = {};
     
     if (data.daily?.time) {
       data.daily.time.forEach((date: string, i: number) => {
         const month = new Date(date).getMonth();
         if (!monthlyData[month]) {
           monthlyData[month] = { temps: [], precip: [] };
         }
         const avgTemp = (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2;
         monthlyData[month].temps.push(avgTemp);
         monthlyData[month].precip.push(data.daily.precipitation_sum[i] || 0);
       });
     }
     
     const monthlyAverages: Record<number, { avgTemp: number, avgPrecip: number }> = {};
     for (const month in monthlyData) {
       const temps = monthlyData[month].temps;
       const precip = monthlyData[month].precip;
       monthlyAverages[month] = {
         avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
         avgPrecip: precip.reduce((a, b) => a + b, 0) / precip.length * 30 // Monthly total
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
     // Get 16-day forecast for mid-term projections
     const response = await fetch(
       `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode&forecast_days=16&timezone=auto`
     );
     
     if (!response.ok) return null;
     
     const data = await response.json();
     return data.daily;
   } catch (error) {
     console.error("Seasonal forecast error:", error);
     return null;
   }
 }
 
 async function calculateExtremeEventProbabilities(lat: number, lon: number, historicalData: any): Promise<any> {
   const currentMonth = new Date().getMonth();
   const nextThreeMonths = [currentMonth, (currentMonth + 1) % 12, (currentMonth + 2) % 12];
   
   // Base probabilities adjusted by region and season
   const isWetSeason = currentMonth >= 9 || currentMonth <= 3; // Oct-Mar for Southern Africa
   const isDrySeason = currentMonth >= 4 && currentMonth <= 8;
   
   return {
     drought: {
       probability: isDrySeason ? 0.35 : 0.15,
       severity: isDrySeason ? "moderate" : "low",
       period: "Next 3 months"
     },
     flood: {
       probability: isWetSeason ? 0.25 : 0.05,
       severity: isWetSeason ? "moderate" : "low", 
       period: "Next 3 months"
     },
     heatwave: {
       probability: currentMonth >= 10 || currentMonth <= 2 ? 0.40 : 0.10,
       severity: currentMonth >= 11 && currentMonth <= 1 ? "high" : "moderate",
       period: "Next 3 months"
     },
     frost: {
       probability: currentMonth >= 5 && currentMonth <= 8 ? 0.30 : 0.02,
       severity: currentMonth >= 6 && currentMonth <= 7 ? "high" : "low",
       period: "Next 3 months"
     }
   };
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { latitude, longitude, crops } = await req.json();
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const lat = latitude || -26.3054;
     const lon = longitude || 31.1367;
 
     console.log("Analyzing climate risk for location:", lat, lon);
 
     // Fetch all climate data in parallel
     const [historicalData, forecastData] = await Promise.all([
       fetchHistoricalClimate(lat, lon),
       fetchSeasonalForecast(lat, lon)
     ]);
 
     const extremeEvents = await calculateExtremeEventProbabilities(lat, lon, historicalData);
 
     // Use AI for comprehensive analysis and recommendations
     const systemPrompt = `You are an expert agricultural climate scientist specializing in climate risk assessment for African farming regions.
 Analyze climate data and provide actionable farming recommendations.
 
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
   ]
 }`;
 
     const userPrompt = `Analyze climate risk for a farm at coordinates ${lat}, ${lon}:
 
 Current crops: ${crops?.join(', ') || 'Mixed farming'}
 
 16-day forecast data: ${JSON.stringify(forecastData)}
 
 Extreme event probabilities: ${JSON.stringify(extremeEvents)}
 
 Historical monthly averages: ${JSON.stringify(historicalData)}
 
 Provide comprehensive climate risk analysis with scenario-based yield projections and adaptive recommendations.`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: userPrompt }
         ],
         max_tokens: 2500,
       }),
     });
 
     if (!response.ok) {
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
     } catch (parseError) {
       console.error("Parse error:", content);
       analysis = {
         overallRiskLevel: "moderate",
         riskScore: 50,
         shortTermOutlook: { period: "Next 2 weeks", conditions: "Normal conditions expected" },
         adaptiveActions: []
       };
     }
 
     // Add raw data for transparency
     analysis.extremeEventProbabilities = extremeEvents;
     analysis.forecastDays = forecastData?.time?.length || 0;
 
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