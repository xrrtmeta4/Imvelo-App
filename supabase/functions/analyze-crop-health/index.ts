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
     const { imageUrl, cropType, plantingDate, expectedGrowthStage } = await req.json();
     const GEMINI_KEY = Deno.env.get('Gemini');
    const LOVABLE_API_KEY = GEMINI_KEY;
     
     if (!LOVABLE_API_KEY) {
       throw new Error('Gemini API key is not configured');
     }
 
     console.log("Analyzing crop health for:", cropType, "planted:", plantingDate);
 
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
 
 Image URL: ${imageUrl}
 
 Provide a comprehensive analysis detecting any sub-visible stress, nutrient deficiencies, water stress, or early disease onset. Flag any deviations from expected growth curves.`;
 
     const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-pro",
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