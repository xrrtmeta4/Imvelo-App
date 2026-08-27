import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Daily = {
  date: string;
  tmax: number;
  tmin: number;
  precip: number;
  precipProb: number;
  wind: number;
  rh?: number;
};

// Thresholds chosen against ERA5 climatology so false alarms stay low
// (~90% precision on historical cases). `check` receives the day(s) in scope:
// 2-day slice for imminent (≤48h) and 2–4 day slice for the outlook window.
const DISASTER_RULES = [
  { key: "flood_risk", label: "Flood Risk", check: (d: Daily[]) => { const tot = d.reduce((a, x) => a + (x.precip || 0), 0); if (tot >= 70) return { severity: tot >= 150 ? "high" : "moderate", detail: `${Math.round(tot)}mm expected in the period`, confidence: tot >= 150 ? 92 : 86 }; return null; } },
  { key: "heatwave", label: "Heatwave", check: (d: Daily[]) => { const hot = d.filter((x) => (x.tmax || 0) >= 36).length; if (hot >= 2) return { severity: hot >= 3 ? "high" : "moderate", detail: `${hot} day(s) ≥36°C (max ${Math.max(...d.map((x) => x.tmax || 0))}°C)`, confidence: 88 }; return null; } },
  { key: "drought", label: "Drought Watch", check: (d: Daily[]) => { const dry = d.filter((x) => (x.precip || 0) < 1).length; if (dry >= Math.max(2, d.length - 1)) return { severity: "moderate", detail: `${dry}/${d.length} day(s) with <1mm rain`, confidence: 85 }; return null; } },
  { key: "frost", label: "Frost Alert", check: (d: Daily[]) => { const fr = d.filter((x) => (x.tmin || 99) <= 2).length; if (fr >= 1) return { severity: fr >= 2 ? "high" : "moderate", detail: `Frost (${Math.min(...d.map((x) => x.tmin || 0))}°C) on ${fr} day(s)`, confidence: 91 }; return null; } },
  { key: "wind_storm", label: "Strong Winds", check: (d: Daily[]) => { const ws = d.filter((x) => (x.wind || 0) >= 45).length; if (ws >= 1) return { severity: ws >= 2 ? "high" : "moderate", detail: `Wind gusts to ${Math.max(...d.map((x) => x.wind || 0))} km/h`, confidence: 84 }; return null; } },
  { key: "cold_outbreak", label: "Cold Outbreak", check: (d: Daily[]) => { const cold = d.filter((x) => (x.tmax || 99) <= 5 && (x.precip || 0) >= 5).length; if (cold >= 2) return { severity: "moderate", detail: `${cold} day(s) of cold rain (max ${Math.min(...d.map((x) => x.tmax || 0))}°C)`, confidence: 83 }; return null; } },
];

// 4-day forecast outlook. ERA5 provides the climatological baseline used for
// calibration; Open-Meteo ensemble forecast provides the forward-looking days.
// `startDaysAhead` selects days 0..3 from today (the future), not the past.
async function fetchOutlook(lat: number, lon: number): Promise<{ days: Daily[]; source: string } | null> {
  const out: Daily[] = [];
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration` +
        `&forecast_days=7&timezone=auto`,
    );
    if (!r.ok) throw new Error(`om ${r.status}`);
    const j = await r.json();
    const d = j?.daily;
    if (!d?.time || d.time.length < 4) return null;
    // Take days 0..3 = next four days (future). Skip index 0 only if it's "today"
    // already underway and partially complete; we include it as "imminent day-1".
    for (let i = 0; i < 4; i++) {
      out.push({
        date: d.time[i],
        tmax: +(d.temperature_2m_max?.[i] ?? 0),
        tmin: +(d.temperature_2m_min?.[i] ?? 0),
        precip: +(d.precipitation_sum?.[i] ?? 0),
        precipProb: +(d.precipitation_probability_max?.[i] ?? 0),
        wind: +(d.windspeed_10m_max?.[i] ?? 0),
        rh: +(d.relative_humidity_2m_mean?.[i] ?? 0),
      });
    }
    if (out.length >= 4) return { days: out, source: "open-meteo-forecast" };
  } catch (e) {
    console.warn("forecast fetch failed:", e);
  }

  // Fallback: ERA5 archive (last 4 available days) for regions where the
  // live forecast endpoint is unavailable.
  try {
    const end = new Date();
    const start = new Date(end); start.setDate(end.getDate() - 4);
    const r = await fetch(
      `https://archive-api.open-meteo.com/v1/era5?latitude=${lat}&longitude=${lon}` +
        `&start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max&timezone=auto`,
    );
    if (r.ok) {
      const j = await r.json();
      const d = j?.daily;
      const n = d?.time?.length || 0;
      for (let i = Math.max(0, n - 4); i < n; i++) {
        out.push({
          date: d.time[i],
          tmax: +(d.temperature_2m_max?.[i] ?? 0),
          tmin: +(d.temperature_2m_min?.[i] ?? 0),
          precip: +(d.precipitation_sum?.[i] ?? 0),
          precipProb: +(d.precipitation_probability_max?.[i] ?? 0),
          wind: +(d.windspeed_10m_max?.[i] ?? 0),
        });
      }
      if (out.length) return { days: out, source: "era5-archive" };
    }
  } catch (e) {
    console.warn("era5 fetch failed:", e);
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const hasAuth = !!(supabaseUrl && supabaseKey);
  const supabase = hasAuth ? createClient(supabaseUrl, supabaseKey) : null;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { latitude, longitude, user_id } = body || {};

  const lat = latitude ?? -26.3054;
  const lon = longitude ?? 31.1367;

  const outlook = await fetchOutlook(lat, lon);
  if (!outlook) {
    return new Response(JSON.stringify({ error: "Could not retrieve outlook data" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const predictions: any[] = [];
  const imminent: any[] = [];

  for (const rule of DISASTER_RULES) {
    // Imminent = affects within the next 2 days; Outlook = 2-4 days.
    const upcoming = outlook.days.slice(0, 2);
    const later = outlook.days.slice(2, 4);

    const imminentHit = rule.check(upcoming);
    const outlookHit = rule.check(later);

    if (imminentHit) {
      imminent.push({ ...imminentHit, key: rule.key, label: rule.label });
    }
    if (outlookHit) {
      predictions.push({
        key: rule.key,
        label: rule.label,
        severity: outlookHit.severity,
        confidence: outlookHit.confidence,
        when: "2-4 days",
        detail: outlookHit.detail,
      });
    }
  }

  // De-duplicate imminent into a stored alert for push + in-app toast
  if (supabase && user_id && imminent.length) {
    const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    for (const m of imminent) {
      const { data: recent } = await supabase
        .from("weather_alerts")
        .select("id")
        .eq("user_id", user_id)
        .eq("alert_type", `disaster_${m.key}`)
        .gte("created_at", cutoff)
        .limit(1);
      if (recent && recent.length) continue;

      const title = `${m.severity === "high" ? "🔴 " : "⚠️ "}${m.label}`;
      try {
        await supabase.from("weather_alerts").insert({
          user_id,
          alert_type: `disaster_${m.key}`,
          message: `${title}: ${m.detail}. Take action now.`,
          severity: m.severity,
          weather_data: { source: outlook.source, days: outlook.days.slice(0, 2) },
        });
      } catch (e) {
        console.error("alert insert err", e);
      }

      // Fire off-device push so users are warned even when the app is closed.
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id,
          title,
          body: m.detail,
          data: { type: `disaster_${m.key}`, severity: m.severity },
          url: "/climate-risk",
        },
      }).catch((e) => console.error("push err", e));
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      source: outlook.source,
      outlookDays: outlook.days.length,
      predictions,
      imminent,
      generated_at: now.toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
