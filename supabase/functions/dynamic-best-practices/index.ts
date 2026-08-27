import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(messages: any[]) {
  const lovKey = Deno.env.get("LOVABLE_API_KEY");
  const gemKey = Deno.env.get("Gemini");
  const url = (!gemKey && lovKey)
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const key = gemKey || lovKey;
  const model = (!gemKey && lovKey) ? "google/gemini-2.5-flash-lite" : "gemini-2.5-flash";
  if (!key) throw new Error("No AI API key configured");
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { region, season, language } = await req.json().catch(() => ({}));
    const month = new Date().toLocaleString("en-US", { month: "long" });
    const year = new Date().getFullYear();
    const system = `You are an agricultural science expert. Provide 5 cutting-edge, current best-farming practices that reflect the latest research and global trends. Focus on small-holder African farmers. Respond in ${language || "English"}. Return ONLY JSON array: [{"title":"...","description":"...","category":"soil|water|pest|crop|livestock|climate","path":"/planting-guide|/soil-management|/water-conservation|/crop-rotation|/smart-irrigation|/pesticide-calendar"}]`;
    const user = `Generate fresh best-practice tips for ${month} ${year}, region: ${region || "Sub-Saharan Africa"}, season: ${season || "current"}. Include latest 2025-2026 advances (regenerative ag, precision farming, climate adaptation, biological pest control).`;
    const content = await callAI([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    let practices: any[] = [];
    try {
      const m = content.match(/\[[\s\S]*\]/);
      if (m) practices = JSON.parse(m[0]);
    } catch { /* ignore */ }
    if (practices.length === 0) {
      practices = [
        { title: "Seasonal Planting Guide", description: "Learn the best time to plant your crops", category: "crop", path: "/planting-guide" },
        { title: "Soil Management", description: "Keep your soil healthy for better harvests", category: "soil", path: "/soil-management" },
        { title: "Water Conservation", description: "Tips for efficient water management", category: "water", path: "/water-conservation" },
      ];
    }
    return new Response(JSON.stringify({ practices, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});