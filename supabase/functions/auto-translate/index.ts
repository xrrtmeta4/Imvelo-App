import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", sw: "Swahili", ss: "siSwati (Eswatini)",
  zu: "Zulu", xh: "Xhosa", yo: "Yoruba", ha: "Hausa", am: "Amharic", ig: "Igbo",
  sn: "Shona", st: "Sesotho", tn: "Setswana", lg: "Luganda", rw: "Kinyarwanda",
  ti: "Tigrinya", wo: "Wolof", ln: "Lingala", so: "Somali", nso: "Sepedi", tw: "Twi",
  pt: "Portuguese", ar: "Arabic",
};

async function callAI(prompt: string, system: string) {
  // Prefer Lovable AI Gateway, fall back to direct Gemini
  const lovKey = Deno.env.get("LOVABLE_API_KEY");
  const gemKey = Deno.env.get("Gemini");
  const url = lovKey
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const key = lovKey || gemKey;
  const model = lovKey ? "google/gemini-3-flash-preview" : "gemini-2.5-flash-lite";
  if (!key) throw new Error("No AI API key configured");

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqClone = req.clone();
  try {
    const { texts, targetLang } = await req.json();
    if (!Array.isArray(texts) || !targetLang) {
      return new Response(JSON.stringify({ error: "texts[] and targetLang required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetLang === "en") {
      const out: Record<string, string> = {};
      for (const t of texts) out[t] = t;
      return new Response(JSON.stringify({ translations: out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = LANG_NAMES[targetLang] || targetLang;
    const system = `You are a professional agricultural translator. Translate UI strings into ${langName}. Use natural, mobile-friendly language familiar to African farmers. For siSwati specifically: use "Simo selitulu" for weather, "Balimisi" for extension officer/services. Return ONLY a valid JSON object mapping each input English string to its translation. No explanations.`;
    const prompt = `Translate these UI strings to ${langName}. Return JSON: {"english string": "translation", ...}\n\nStrings:\n${JSON.stringify(texts)}`;

    const content = await callAI(prompt, system);
    let translations: Record<string, string> = {};
    try {
      const m = content.match(/\{[\s\S]*\}/);
      translations = m ? JSON.parse(m[0]) : {};
    } catch {
      translations = {};
    }
    // Fill any missing keys with original
    for (const t of texts) if (!translations[t]) translations[t] = t;

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-translate error:", e);
    // Graceful fallback: return originals so the UI never crashes (rate limits, etc.)
    let texts: string[] = [];
    try { texts = (await reqClone.json())?.texts || []; } catch { /* ignore */ }
    const translations: Record<string, string> = {};
    for (const t of texts) translations[t] = t;
    const msg = e instanceof Error ? e.message : "Unknown";
    const rateLimited = /\b429\b|rate_limited/i.test(msg);
    return new Response(
      JSON.stringify({ translations, fallback: true, rateLimited, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});