import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

export interface UsageResult {
  allowed: boolean;
  unlimited?: boolean;
  remaining?: number;
  limit?: number;
  reason?: string;
}

/**
 * Server-side enforcement of free-tier limits.
 * Verifies the caller's JWT, then atomically consumes one unit of quota.
 */
export async function consumeUsage(
  req: Request,
  kind: "scan" | "chat",
  limit: number,
): Promise<UsageResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return { allowed: false, reason: "server_misconfigured" };
  if (!token) return { allowed: false, reason: "auth_required" };

  const admin = createClient(url, serviceKey);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return { allowed: false, reason: "auth_required" };

  const { data, error } = await admin.rpc("consume_usage", {
    _user_id: user.id,
    _kind: kind,
    _limit: limit,
  });
  if (error) {
    console.error("consume_usage error", error);
    // Fail closed so limits cannot be bypassed by breaking the call.
    return { allowed: false, reason: "usage_check_failed" };
  }
  return data as UsageResult;
}

export function limitResponse(kind: "scan" | "chat", result: UsageResult, corsHeaders: Record<string, string>) {
  const status = result.reason === "auth_required" ? 401 : 429;
  const message = result.reason === "auth_required"
    ? "Please sign in to continue."
    : kind === "scan"
      ? "You've used all your free scans for this week. Upgrade to Premium for unlimited scans."
      : "You've used all your free Chloe chats for today. Upgrade to Premium for unlimited chats.";
  return new Response(
    JSON.stringify({ error: message, code: result.reason || "limit_reached", limit: result.limit, remaining: 0 }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
