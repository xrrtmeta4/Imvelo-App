import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dashboard-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Whitelist of resources the dashboard can pull from.
const RESOURCES: Record<string, { table: string; orderBy?: string }> = {
  profiles: { table: "profiles", orderBy: "created_at" },
  subscriptions: { table: "premium_subscriptions", orderBy: "created_at" },
  ledger: { table: "ledger_entries", orderBy: "created_at" },
  harvests: { table: "harvests", orderBy: "created_at" },
  activities: { table: "farm_activities", orderBy: "created_at" },
  inventory: { table: "farm_inventory", orderBy: "created_at" },
  livestock: { table: "livestock", orderBy: "created_at" },
  pest_reports: { table: "pest_reports", orderBy: "created_at" },
  pest_scans: { table: "pest_reports", orderBy: "created_at" },
  pesticide_schedules: { table: "pesticide_schedules", orderBy: "created_at" },
  weather_alerts: { table: "weather_alerts", orderBy: "created_at" },
  climate_observations: { table: "climate_observations", orderBy: "created_at" },
  crop_rotations: { table: "crop_rotations", orderBy: "created_at" },
  crop_reminders: { table: "crop_reminders", orderBy: "created_at" },
  ussd_sessions: { table: "ussd_sessions", orderBy: "created_at" },
  ussd_crop_reports: { table: "ussd_crop_reports", orderBy: "created_at" },
  push_subscriptions: { table: "push_subscriptions", orderBy: "created_at" },
  knowledge_contributions: { table: "knowledge_contributions", orderBy: "created_at" },
};

// Tables merged into the unified realtime activity stream
const STREAM_SOURCES = [
  { table: "pest_reports", label: "pest_scan", user: "user_id" },
  { table: "farm_activities", label: "farm_activity", user: "user_id" },
  { table: "harvests", label: "harvest", user: "user_id" },
  { table: "ledger_entries", label: "ledger_entry", user: "user_id" },
  { table: "climate_observations", label: "climate_observation", user: "user_id" },
  { table: "pesticide_schedules", label: "spray_schedule", user: "user_id" },
  { table: "weather_alerts", label: "weather_alert", user: "user_id" },
  { table: "premium_subscriptions", label: "subscription", user: "user_id" },
  { table: "profiles", label: "signup", user: "id" },
  { table: "ussd_sessions", label: "ussd_session", user: null },
  { table: "ussd_crop_reports", label: "ussd_crop_report", user: null },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("DASHBOARD_API_KEY");
  if (!expected) return json({ error: "Server missing DASHBOARD_API_KEY" }, 500);

  const url = new URL(req.url);
  const provided =
    req.headers.get("x-dashboard-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("apiKey");

  if (provided !== expected) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const parts = url.pathname.split("/").filter(Boolean);
  const segment = parts[parts.length - 1] || "summary";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const since = url.searchParams.get("since"); // ISO timestamp cursor

  // Resolve user_id -> profile info for enrichment
  async function attachProfiles(rows: any[], key = "user_id") {
    const ids = [...new Set(rows.map((r) => r?.[key]).filter(Boolean))];
    if (!ids.length) return rows;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, role, country, location")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return rows.map((r) => ({ ...r, user: map.get(r?.[key]) ?? null }));
  }

  try {
    // --- Discovery ---
    if (segment === "routes") {
      return json({
        ok: true,
        endpoints: {
          "GET /summary": "aggregate counts + live KPIs",
          "GET /stream?since=ISO&limit=n": "unified realtime activity stream (poll with cursor)",
          "GET /activity?limit=n": "recent activity feed",
          "GET /pest-stats?days=30": "pest scan analytics",
          "GET /health": "service heartbeat",
          "GET /<resource>?since=&limit=&offset=": Object.keys(RESOURCES),
        },
        auth: "x-dashboard-key: <DASHBOARD_API_KEY>",
      });
    }

    if (segment === "health") {
      const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
      return json({ ok: !error, db: error ? "error" : "up", server_time: new Date().toISOString() });
    }

    // --- Aggregated summary ---
    if (segment === "summary" || segment === "dashboard-api") {
      const tables = [
        "profiles",
        "premium_subscriptions",
        "ledger_entries",
        "harvests",
        "farm_activities",
        "pest_reports",
        "ussd_sessions",
        "weather_alerts",
        "climate_observations",
        "push_subscriptions",
      ];
      const counts: Record<string, number> = {};
      await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
          counts[t] = count ?? 0;
        }),
      );

      const day = new Date(Date.now() - 864e5).toISOString();
      const week = new Date(Date.now() - 7 * 864e5).toISOString();
      const [
        { count: newUsers24h },
        { count: activeSubs },
        { count: scans24h },
        { count: scans7d },
        { count: activities24h },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", day),
        supabase.from("premium_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("pest_reports").select("*", { count: "exact", head: true }).gte("created_at", day),
        supabase.from("pest_reports").select("*", { count: "exact", head: true }).gte("created_at", week),
        supabase.from("farm_activities").select("*", { count: "exact", head: true }).gte("created_at", day),
      ]);

      return json({
        ok: true,
        generated_at: new Date().toISOString(),
        counts,
        new_users_24h: newUsers24h ?? 0,
        active_subscriptions: activeSubs ?? 0,
        pest_scans_24h: scans24h ?? 0,
        pest_scans_7d: scans7d ?? 0,
        farm_activities_24h: activities24h ?? 0,
      });
    }

    // --- Unified realtime stream (cursor based polling) ---
    if (segment === "stream" || segment === "activity") {
      const results = await Promise.all(
        STREAM_SOURCES.map(async (s) => {
          let q = supabase.from(s.table).select("*").order("created_at", { ascending: false }).limit(limit);
          if (since) q = q.gt("created_at", since);
          const { data, error } = await q;
          if (error) return [];
          return (data ?? []).map((r: any) => ({
            type: s.label,
            table: s.table,
            id: r.id,
            user_id: s.user ? r[s.user] : null,
            created_at: r.created_at,
            record: r,
          }));
        }),
      );
      let merged = results.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit);
      merged = await attachProfiles(merged, "user_id");
      return json({
        ok: true,
        count: merged.length,
        cursor: merged[0]?.created_at ?? since ?? new Date().toISOString(),
        polled_at: new Date().toISOString(),
        events: merged,
      });
    }

    // --- Pest scan analytics ---
    if (segment === "pest-stats") {
      const days = Math.min(Number(url.searchParams.get("days") ?? 30), 365);
      const from = new Date(Date.now() - days * 864e5).toISOString();
      const { data } = await supabase
        .from("pest_reports")
        .select("id, pest_name, confidence, location, created_at, user_id")
        .gte("created_at", from)
        .order("created_at", { ascending: false });

      const rows = data ?? [];
      const byPest: Record<string, number> = {};
      const byDay: Record<string, number> = {};
      const byLocation: Record<string, number> = {};
      let confSum = 0, confN = 0;
      for (const r of rows) {
        const pest = r.pest_name || "unidentified";
        byPest[pest] = (byPest[pest] ?? 0) + 1;
        const d = String(r.created_at).slice(0, 10);
        byDay[d] = (byDay[d] ?? 0) + 1;
        if (r.location) byLocation[r.location] = (byLocation[r.location] ?? 0) + 1;
        if (typeof r.confidence === "number") { confSum += r.confidence; confN++; }
      }
      return json({
        ok: true,
        window_days: days,
        total_scans: rows.length,
        unique_users: new Set(rows.map((r: any) => r.user_id)).size,
        avg_confidence: confN ? Number((confSum / confN).toFixed(2)) : null,
        top_pests: Object.entries(byPest).sort((a, b) => b[1] - a[1]).slice(0, 20)
          .map(([pest, count]) => ({ pest, count })),
        by_day: Object.entries(byDay).sort().map(([date, count]) => ({ date, count })),
        top_locations: Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 20)
          .map(([location, count]) => ({ location, count })),
      });
    }

    // --- Generic resource endpoint ---
    const resource = RESOURCES[segment];
    if (!resource) {
      return json(
        { error: "Unknown resource", available: ["routes", "health", "summary", "stream", "activity", "pest-stats", ...Object.keys(RESOURCES)] },
        404,
      );
    }

    let q = supabase.from(resource.table).select("*", { count: "exact" });
    if (since && resource.orderBy) q = q.gt(resource.orderBy, since);
    if (resource.orderBy) q = q.order(resource.orderBy, { ascending: false });
    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return json({ error: error.message }, 500);

    const withUsers = url.searchParams.get("with_users") === "true"
      ? await attachProfiles(data ?? [], resource.table === "profiles" ? "id" : "user_id")
      : data ?? [];

    return json({
      ok: true,
      resource: segment,
      total: count ?? null,
      limit,
      offset,
      count: withUsers.length,
      cursor: (withUsers[0] as any)?.created_at ?? since ?? null,
      data: withUsers,
    });
  } catch (err) {
    console.error("dashboard-api error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
