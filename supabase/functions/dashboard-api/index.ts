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

// Whitelist of resources the dashboard can pull from. Add to this list as needed.
const RESOURCES: Record<string, { table: string; orderBy?: string }> = {
  profiles: { table: "profiles", orderBy: "created_at" },
  subscriptions: { table: "premium_subscriptions", orderBy: "created_at" },
  ledger: { table: "ledger_entries", orderBy: "created_at" },
  harvests: { table: "harvests", orderBy: "created_at" },
  activities: { table: "farm_activities", orderBy: "created_at" },
  inventory: { table: "farm_inventory", orderBy: "created_at" },
  livestock: { table: "livestock", orderBy: "created_at" },
  pest_reports: { table: "pest_reports", orderBy: "created_at" },
  pesticide_schedules: { table: "pesticide_schedules", orderBy: "created_at" },
  weather_alerts: { table: "weather_alerts", orderBy: "created_at" },
  climate_observations: { table: "climate_observations", orderBy: "created_at" },
  ussd_sessions: { table: "ussd_sessions", orderBy: "created_at" },
  ussd_crop_reports: { table: "ussd_crop_reports", orderBy: "created_at" },
  push_subscriptions: { table: "push_subscriptions", orderBy: "created_at" },
  knowledge_contributions: { table: "knowledge_contributions", orderBy: "created_at" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // --- Auth: shared API key ---
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

  // Path: /dashboard-api/<segment>
  const parts = url.pathname.split("/").filter(Boolean);
  const segment = parts[parts.length - 1] || "summary";

  try {
    // --- Aggregated summary for dashboard widgets ---
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
      ];
      const counts: Record<string, number> = {};
      await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase
            .from(t)
            .select("*", { count: "exact", head: true });
          counts[t] = count ?? 0;
        }),
      );

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ count: newUsers24h }, { count: activeSubs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
        supabase
          .from("premium_subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      return json({
        ok: true,
        generated_at: new Date().toISOString(),
        counts,
        new_users_24h: newUsers24h ?? 0,
        active_subscriptions: activeSubs ?? 0,
      });
    }

    // --- Recent activity feed across key tables ---
    if (segment === "activity") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
      const sources = [
        { table: "farm_activities", label: "farm_activity" },
        { table: "harvests", label: "harvest" },
        { table: "pest_reports", label: "pest_report" },
        { table: "ledger_entries", label: "ledger" },
        { table: "ussd_sessions", label: "ussd" },
        { table: "weather_alerts", label: "weather_alert" },
      ];
      const results = await Promise.all(
        sources.map(async (s) => {
          const { data } = await supabase
            .from(s.table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
          return (data ?? []).map((r: any) => ({
            type: s.label,
            table: s.table,
            created_at: r.created_at,
            record: r,
          }));
        }),
      );
      const merged = results
        .flat()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, limit);
      return json({ ok: true, count: merged.length, events: merged });
    }

    // --- Generic resource endpoint ---
    const resource = RESOURCES[segment];
    if (!resource) {
      return json(
        {
          error: "Unknown resource",
          available: ["summary", "activity", ...Object.keys(RESOURCES)],
        },
        404,
      );
    }

    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    const since = url.searchParams.get("since"); // ISO timestamp

    let q = supabase.from(resource.table).select("*", { count: "exact" });
    if (since && resource.orderBy) q = q.gte(resource.orderBy, since);
    if (resource.orderBy) q = q.order(resource.orderBy, { ascending: false });
    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return json({ error: error.message }, 500);

    return json({
      ok: true,
      resource: segment,
      total: count ?? null,
      limit,
      offset,
      count: data?.length ?? 0,
      data: data ?? [],
    });
  } catch (err) {
    console.error("dashboard-api error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});
