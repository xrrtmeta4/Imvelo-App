// USSD handler for Imvelo Tech Group service code *4800#
// Compatible with Africa's Talking USSD gateway.
// Stateless: state is derived by splitting the cumulative `text` on '*'.
// Every screen is kept under 160 characters and uses CON / END semantics.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock market prices (per kg) in Eswatini Lilangeni
const MARKET_PRICES: Record<string, { name: string; price: string }> = {
  "1": { name: "Maize", price: "E4.50/kg" },
  "2": { name: "Beans", price: "E18.00/kg" },
  "3": { name: "Tomatoes", price: "E12.00/kg" },
};

const TEXT = {
  root: "CON Welcome to Imvelo\n1. Report Crop Issue\n2. Market Prices\n3. My Profile",
  cropName: "CON Enter Crop Name:\n0. Back",
  cropSymptoms: "CON Describe symptoms:\n0. Back",
  cropEnd: "END Thank you. An agent will contact you via SMS.",
  pricesMenu: "CON Market Prices (per kg):\n1. Maize\n2. Beans\n3. Tomatoes\n0. Back",
  invalid: "END Invalid option. Dial *4800# again.",
};

// Trim a screen to the 160-char USSD limit.
function clamp(s: string): string {
  return s.length <= 160 ? s : s.slice(0, 157) + "...";
}

function tplain(body: string, status = 200) {
  return new Response(clamp(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

async function logCropIssue(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  sessionId: string,
  crop: string,
  symptoms: string,
) {
  try {
    await supabase.from("ussd_crop_reports").insert({
      session_id: sessionId,
      phone_number: phone,
      crop_name: crop,
      symptoms,
    });
  } catch (e) {
    console.error("logCropIssue failed (non-fatal):", e);
  }
}

async function lookupProfileName(
  supabase: ReturnType<typeof createClient>,
  phone: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("phone_number", phone)
      .maybeSingle();
    const name = (data as any)?.full_name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Africa's Talking sends application/x-www-form-urlencoded
    let sessionId = "";
    let phoneNumber = "";
    let serviceCode = "";
    let text = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      sessionId = body.sessionId || "";
      phoneNumber = body.phoneNumber || "";
      serviceCode = body.serviceCode || "";
      text = body.text || "";
    } else {
      const form = await req.formData();
      sessionId = (form.get("sessionId") as string) || "";
      phoneNumber = (form.get("phoneNumber") as string) || "";
      serviceCode = (form.get("serviceCode") as string) || "";
      text = (form.get("text") as string) || "";
    }

    if (!sessionId || !phoneNumber) {
      return tplain("END Invalid request", 400);
    }

    // Sanitize: only digits, *, # — but allow spaces/letters for the symptoms free-text screen.
    // We split on '*' first; the LAST level may be free text on certain branches.
    const levels = text.split("*");
    const root = levels[0] || "";

    console.log("USSD *4800#", {
      sessionId,
      serviceCode,
      phone: phoneNumber.slice(0, 4) + "****",
      depth: levels.length,
      root,
    });

    // ---- ROOT ----
    if (text === "") {
      return tplain(TEXT.root);
    }

    // 0 anywhere at top returns to root by ending the session gracefully
    // (true "back" requires the user to redial in stateless USSD; we handle 0 at sub-menus.)

    // ---- 1. REPORT CROP ISSUE ----
    if (root === "1") {
      // 1                     -> ask crop name
      // 1*<cropName>          -> ask symptoms
      // 1*<cropName>*<symp>   -> END
      if (levels.length === 1) {
        return tplain(TEXT.cropName);
      }

      const cropName = (levels[1] || "").trim();
      if (cropName === "0") return tplain(TEXT.root);
      if (!cropName) return tplain(TEXT.cropName);

      if (levels.length === 2) {
        return tplain(TEXT.cropSymptoms);
      }

      // levels.length >= 3 — symptoms may itself contain spaces; rejoin tail.
      const symptoms = levels.slice(2).join("*").trim();
      if (symptoms === "0") return tplain(TEXT.cropName);
      if (!symptoms) return tplain(TEXT.cropSymptoms);

      await logCropIssue(supabase, phoneNumber, sessionId, cropName, symptoms);
      return tplain(TEXT.cropEnd);
    }

    // ---- 2. MARKET PRICES ----
    if (root === "2") {
      if (levels.length === 1) {
        return tplain(TEXT.pricesMenu);
      }
      const choice = (levels[1] || "").trim();
      if (choice === "0") return tplain(TEXT.root);

      const item = MARKET_PRICES[choice];
      if (!item) return tplain(TEXT.invalid);
      return tplain(`END ${item.name}: ${item.price}\nSource: Manzini Market`);
    }

    // ---- 3. MY PROFILE ----
    if (root === "3") {
      const name = await lookupProfileName(supabase, phoneNumber);
      const greeting = name ? `Hello ${name}!` : "Hello, Imvelo Farmer!";
      return tplain(
        `END ${greeting}\nPhone: ${phoneNumber}\nDial *4800# anytime for help.`,
      );
    }

    return tplain(TEXT.invalid);
  } catch (err) {
    console.error("USSD *4800# error:", err);
    return tplain("END Service error. Please try again later.", 500);
  }
});
