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

// Thresholds are normalised per-day so the same rule works on a 2-day
// imminent window and a 5-day outlook window without false alarms.
type Hit = { severity: "moderate" | "high"; detail: string; confidence: number } | null;
const sum = (d: Daily[], f: (x: Daily) => number) => d.reduce((a, x) => a + (f(x) || 0), 0);
const maxRun = (d: Daily[], f: (x: Daily) => boolean) => {
  let best = 0, cur = 0;
  for (const x of d) { cur = f(x) ? cur + 1 : 0; if (cur > best) best = cur; }
  return best;
};
const clampConf = (n: number) => Math.max(55, Math.min(95, Math.round(n)));

const DISASTER_RULES: Array<{ key: string; label: string; check: (d: Daily[]) => Hit }> = [
  {
    key: "flood_risk", label: "Flood Risk",
    check: (d) => {
      if (!d.length) return null;
      const tot = sum(d, (x) => x.precip);
      const peak = Math.max(...d.map((x) => x.precip || 0));
      const prob = Math.max(...d.map((x) => x.precipProb || 0));
      // heavy total for the window OR one very wet day
      const heavy = tot >= 25 * d.length || peak >= 50;
      if (!heavy) return null;
      const severe = tot >= 45 * d.length || peak >= 90;
      return {
        severity: severe ? "high" : "moderate",
        detail: `${Math.round(tot)}mm over ${d.length} day(s), peak ${Math.round(peak)}mm/day`,
        confidence: clampConf(60 + prob * 0.3 + (severe ? 8 : 0)),
      };
    },
  },
  {
    key: "heatwave", label: "Heatwave",
    check: (d) => {
      const run = maxRun(d, (x) => (x.tmax || 0) >= 35);
      if (run < 2) return null;
      const peak = Math.max(...d.map((x) => x.tmax || 0));
      return {
        severity: run >= 3 || peak >= 40 ? "high" : "moderate",
        detail: `${run} consecutive day(s) ≥35°C, peaking at ${Math.round(peak)}°C`,
        confidence: clampConf(70 + run * 4 + (peak - 35) * 2),
      };
    },
  },
  {
    key: "drought", label: "Drought Watch",
    check: (d) => {
      if (d.length < 4) return null; // never call drought on a 2-day window
      const dry = maxRun(d, (x) => (x.precip || 0) < 1);
      const tot = sum(d, (x) => x.precip);
      if (dry < 5 || tot >= 3) return null;
      const hot = d.filter((x) => (x.tmax || 0) >= 32).length;
      return {
        severity: dry >= 7 && hot >= 3 ? "high" : "moderate",
        detail: `${dry} consecutive dry day(s), only ${tot.toFixed(1)}mm forecast`,
        confidence: clampConf(62 + dry * 3 + hot * 2),
      };
    },
  },
  {
    key: "frost", label: "Frost Alert",
    check: (d) => {
      const fr = d.filter((x) => (x.tmin ?? 99) <= 2).length;
      if (!fr) return null;
      const low = Math.min(...d.map((x) => (x.tmin ?? 99)));
      return {
        severity: low <= 0 || fr >= 2 ? "high" : "moderate",
        detail: `Lows to ${low.toFixed(1)}°C on ${fr} night(s)`,
        confidence: clampConf(78 + (2 - low) * 4),
      };
    },
  },
  {
    key: "wind_storm", label: "Strong Winds",
    check: (d) => {
      const ws = d.filter((x) => (x.wind || 0) >= 45).length;
      if (!ws) return null;
      const peak = Math.max(...d.map((x) => x.wind || 0));
      return {
        severity: peak >= 65 || ws >= 2 ? "high" : "moderate",
        detail: `Winds up to ${Math.round(peak)} km/h on ${ws} day(s)`,
        confidence: clampConf(65 + (peak - 45)),
      };
    },
  },
  {
    key: "cold_outbreak", label: "Cold Outbreak",
    check: (d) => {
      const cold = d.filter((x) => (x.tmax ?? 99) <= 12 && (x.precip || 0) >= 5).length;
      if (cold < 2) return null;
      const low = Math.min(...d.map((x) => (x.tmax ?? 99)));
      return {
        severity: cold >= 3 ? "high" : "moderate",
        detail: `${cold} day(s) of cold wet weather (highs near ${Math.round(low)}°C)`,
        confidence: clampConf(66 + cold * 4),
      };
    },
  },
  {
    key: "storm", label: "Thunderstorm / Hail",
    check: (d) => {
      const st = d.filter((x) => (x.precip || 0) >= 15 && (x.wind || 0) >= 30 && (x.tmax || 0) >= 25).length;
      if (!st) return null;
      const peakW = Math.max(...d.map((x) => x.wind || 0));
      return {
        severity: st >= 2 || peakW >= 55 ? "high" : "moderate",
        detail: `${st} day(s) with convective storm signature (gusts to ${Math.round(peakW)} km/h)`,
        confidence: clampConf(60 + st * 6 + (peakW - 30) * 0.6),
      };
    },
  },
  {
    key: "disease_pressure", label: "Crop Disease Pressure",
    check: (d) => {
      const wet = d.filter((x) => (x.rh ?? 0) >= 80 && (x.tmax || 0) >= 18 && (x.tmax || 0) <= 30).length;
      if (wet < 2) return null;
      const avgRh = Math.round(sum(d, (x) => x.rh || 0) / d.length);
      return {
        severity: wet >= 3 ? "high" : "moderate",
        detail: `${wet} day(s) of warm humid conditions (avg RH ${avgRh}%) favouring fungal outbreaks`,
        confidence: clampConf(58 + wet * 6),
      };
    },
  },
];

// ---- Per-day risk scoring (0-100) used for graphs/heatmaps in the UI ----
const norm = (v: number, lo: number, hi: number) =>
  Math.max(0, Math.min(100, Math.round(((v - lo) / (hi - lo)) * 100)));

const DAILY_SCORERS: Record<string, (x: Daily) => number> = {
  flood_risk: (x) => norm(x.precip || 0, 5, 80) * (0.5 + (x.precipProb || 50) / 200),
  heatwave: (x) => norm(x.tmax || 0, 30, 43),
  drought: (x) => norm(4 - Math.min(4, x.precip || 0), 0, 4) * (0.6 + norm(x.tmax || 0, 25, 40) / 250),
  frost: (x) => norm(6 - (x.tmin ?? 20), 0, 10),
  wind_storm: (x) => norm(x.wind || 0, 25, 75),
  cold_outbreak: (x) => norm(18 - (x.tmax ?? 30), 0, 14),
  storm: (x) => Math.min(norm(x.precip || 0, 8, 45), 100) * 0.5 + norm(x.wind || 0, 25, 70) * 0.5,
  disease_pressure: (x) =>
    (x.tmax || 0) >= 18 && (x.tmax || 0) <= 32 ? norm(x.rh ?? 0, 60, 95) : norm(x.rh ?? 0, 60, 95) * 0.4,
};

const HAZARD_LABELS: Record<string, string> = {
  flood_risk: "Flood",
  heatwave: "Heat",
  drought: "Drought",
  frost: "Frost",
  wind_storm: "Wind",
  cold_outbreak: "Cold",
  storm: "Storm",
  disease_pressure: "Disease",
};



// Meteoblue daily outlook (primary provider). Returns the next 4 days in the
// same Daily shape the disaster rules expect.
async function fetchMeteoblueOutlook(lat: number, lon: number, key: string): Promise<{ days: Daily[]; source: string } | null> {
  const url = `https://my.meteoblue.com/packages/basic-day?apikey=${key}` +
    `&lat=${lat}&lon=${lon}&format=json&forecast_days=7&temperature=C&windspeed=km/h`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`meteoblue ${r.status}`);
  const j = await r.json();
  const d = j?.data_day;
  if (!d?.time || d.time.length < 4) return null;
  const days: Daily[] = [];
  for (let i = 0; i < 7 && i < d.time.length; i++) {
    days.push({
      date: d.time[i],
      tmax: +(d.temperature_max?.[i] ?? 0),
      tmin: +(d.temperature_min?.[i] ?? 0),
      precip: +(d.precipitation?.[i] ?? 0),
      precipProb: +(d.precipitation_probability?.[i] ?? 0),
      wind: +(d.windspeed_max?.[i] ?? d.windspeed_mean?.[i] ?? 0),
      rh: +(d.humidity_mean?.[i] ?? d.relative_humidity_mean?.[i] ?? 0),
    });
  }
  if (days.length >= 4) return { days, source: "meteoblue" };
  return null;
}

// 4-day forecast outlook. Meteoblue is the primary provider; Open-Meteo +
// ERA5 are kept as fallbacks when Meteoblue is unavailable.
async function fetchOutlook(lat: number, lon: number): Promise<{ days: Daily[]; source: string } | null> {
  // Primary: Meteoblue (reads METEOBLUE_API_KEY)
  try {
    const mbKey = Deno.env.get("METEOBLUE_API_KEY");
    if (mbKey) {
      const mb = await fetchMeteoblueOutlook(lat, lon, mbKey);
      if (mb) return mb;
    }
  } catch (e) {
    console.warn("meteoblue outlook failed:", e);
  }

  // Fallback: Open-Meteo forecast + ERA5 archive (existing)
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
    for (let i = 0; i < 7 && i < d.time.length; i++) {
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

  const upcoming = outlook.days.slice(0, 2);
  const later = outlook.days.slice(2);
  const whole = outlook.days;

  for (const rule of DISASTER_RULES) {
    const imminentHit = rule.check(upcoming);
    if (imminentHit) {
      imminent.push({ ...imminentHit, key: rule.key, label: rule.label });
    }

    // Slow-onset hazards (drought) need the full window; the rest use days 3+.
    const window = rule.key === "drought" ? whole : later;
    const outlookHit = window.length ? rule.check(window) : null;
    if (outlookHit && !imminentHit) {
      predictions.push({
        key: rule.key,
        label: rule.label,
        severity: outlookHit.severity,
        confidence: outlookHit.confidence,
        when: rule.key === "drought"
          ? `next ${whole.length} days`
          : `${later[0]?.date ?? "day 3"} → ${later[later.length - 1]?.date ?? ""}`,
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
      days: outlook.days,
      predictions,
      imminent,
      generated_at: now.toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
