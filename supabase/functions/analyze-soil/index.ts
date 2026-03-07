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
    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert soil scientist. Analyze soil images to determine:
1. Soil type (clay, sandy, loam, silt, etc.)
2. Estimated pH range
3. Texture assessment
4. Organic matter content estimate (low/medium/high)
5. Drainage characteristics
6. Color-based nutrient indicators
7. Improvement recommendations

Respond in JSON:
{
  "soilType": "string",
  "phEstimate": "string (e.g. '6.0-6.5')",
  "texture": "string",
  "organicMatter": "low" | "medium" | "high",
  "drainage": "poor" | "moderate" | "good" | "excessive",
  "colorAnalysis": "string",
  "recommendations": ["string"],
  "suitableCrops": ["string"],
  "confidence": number (1-100)
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this soil image and provide a detailed assessment. Image URL: ${imageUrl}` },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1500,
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
    } catch {
      analysis = {
        soilType: "Unable to determine",
        phEstimate: "Unknown",
        texture: "Unknown",
        organicMatter: "unknown",
        drainage: "unknown",
        recommendations: ["Please try with a clearer, close-up photo of your soil"],
        confidence: 0
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-soil error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
