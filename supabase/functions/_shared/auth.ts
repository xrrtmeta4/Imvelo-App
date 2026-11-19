import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

/** Returns the signed-in user for this request, or null. */
export async function getRequestUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) return null;
  if (token === key) return null;
  const admin = createClient(url, key);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/** True when the request comes from trusted server code (service key) or the scheduler (cron secret). */
export async function isTrustedCaller(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  if (token && token === key) return true;
  const cron = req.headers.get("x-cron-secret");
  if (!cron) return false;
  const admin = createClient(url, key);
  const { data, error } = await admin.rpc("verify_cron_secret", { _secret: cron });
  return !error && data === true;
}

export async function hasActivePremium(userId: string): Promise<boolean> {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await admin
    .from("premium_subscriptions")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(5);
  return (data || []).some((s: { expires_at: string | null }) => !s.expires_at || new Date(s.expires_at) > new Date());
}

export function jsonError(message: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Mask a phone number for logs: keep last 3 digits. */
export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  const s = String(p);
  return s.length <= 3 ? "***" : `***${s.slice(-3)}`;
}

/** Only allow plain language names/codes in prompts. */
export function safeLabel(v: unknown, fallback: string, max = 40): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  if (!t || t.length > max || !/^[\p{L}\p{M} .()'-]+$/u.test(t)) return fallback;
  return t;
}

/** Only deliver web push to well-known browser push services. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "fcm.googleapis.com" || h === "android.googleapis.com" ||
      h === "updates.push.services.mozilla.com" || h.endsWith(".push.services.mozilla.com") ||
      h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}
