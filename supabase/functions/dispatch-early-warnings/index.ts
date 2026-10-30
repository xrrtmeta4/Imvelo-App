import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MBDay {
  tempMax?: number; tempMin?: number; precip_mm?: number;
  precipProb_pct?: number; windMax_kmh?: number;
}

function deriveWarnings(days: MBDay[]) {
  const w: Array<{ type: string; severity: 'moderate'|'high'; title: string; message: string }> = [];
  if (!days.length) return w;
  const total = days.reduce((a, d) => a + (d.precip_mm || 0), 0);
  const dry = days.filter(d => (d.precip_mm || 0) < 1).length;
  const heat = days.filter(d => (d.tempMax || 0) >= 35).length;
  const frost = days.filter(d => (d.tempMin ?? 99) <= 2).length;
  const wind = days.filter(d => (d.windMax_kmh || 0) >= 45).length;
  if (total >= 80) w.push({ type: 'flood', severity: total >= 150 ? 'high':'moderate', title: '⚠️ Flood Warning', message: `Heavy rain expected — ${Math.round(total)}mm total in 7 days. Check drainage and secure fields.` });
  if (dry >= 6) w.push({ type: 'drought', severity: 'moderate', title: '⚠️ Drought Watch', message: `Dry spell — <1mm rain on ${dry}/7 days. Irrigate priority crops, apply mulch.` });
  if (heat >= 2) w.push({ type: 'heatwave', severity: heat >= 4 ? 'high':'moderate', title: '🔥 Heatwave', message: `${heat} day(s) ≥35°C ahead. Water before 8am, shade livestock.` });
  if (frost >= 1) w.push({ type: 'frost', severity: frost >= 2 ? 'high':'moderate', title: '❄️ Frost Alert', message: `Overnight lows ≤2°C on ${frost} day(s). Cover sensitive crops.` });
  if (wind >= 1) w.push({ type: 'wind', severity: wind >= 2 ? 'high':'moderate', title: '💨 Strong Wind', message: `Gusts >45 km/h on ${wind} day(s). Stake tall crops, delay spraying.` });
  return w;
}

async function fetchMeteoblue(lat: number, lon: number, key: string) {
  try {
    const r = await fetch(`https://my.meteoblue.com/packages/basic-day_agro-day?apikey=${key}&lat=${lat}&lon=${lon}&format=json&forecast_days=7`);
    if (!r.ok) return [];
    const j = await r.json();
    const bd = j?.data_day || {};
    return (bd.time || []).map((_: string, i: number) => ({
      tempMax: bd.temperature_max?.[i],
      tempMin: bd.temperature_min?.[i],
      precip_mm: bd.precipitation?.[i],
      precipProb_pct: bd.precipitation_probability?.[i],
      windMax_kmh: bd.windspeed_max?.[i],
    })) as MBDay[];
  } catch (e) { console.error('mb err', e); return []; }
}

const CAUTIONS: Record<string, string[]> = {
  flood: ['Clear drains and furrows around fields', 'Move livestock and stored grain to higher ground', 'Do not cross flooded rivers or bridges'],
  drought: ['Irrigate priority crops early morning', 'Mulch to keep soil moisture', 'Provide extra water and shade for livestock'],
  heatwave: ['Water crops before 8am or after 5pm', 'Shade and water livestock frequently', 'Avoid field work 11am–3pm and drink water'],
  frost: ['Cover seedlings and sensitive crops overnight', 'Irrigate lightly before sunset to hold heat', 'House young animals'],
  wind: ['Stake tall crops and secure tunnels', 'Delay spraying chemicals', 'Secure roofing, tanks and loose equipment'],
};

async function sendCautionEmail(supabase: any, uid: string, w: { type: string; severity: string; title: string; message: string }) {
  const lovKey = Deno.env.get('LOVABLE_API_KEY');
  const brevoKey = Deno.env.get('BREVO_API_KEY');
  if (!lovKey || !brevoKey) return;
  const { data } = await supabase.auth.admin.getUserById(uid);
  const email = data?.user?.email;
  if (!email) return;
  const name = data.user.user_metadata?.full_name || 'Farmer';
  const tips = (CAUTIONS[w.type] || []).map((t) => `<li style="margin:6px 0">${t}</li>`).join('');
  const color = w.severity === 'high' ? '#b42318' : '#b54708';
  const html = `<div style="font-family:Arial,sans-serif;background:#ffffff;padding:24px;max-width:560px;margin:auto">
    <div style="background:#1f5130;color:#ffffff;border-radius:16px;padding:20px">
      <p style="margin:0;font-size:13px;opacity:.85">Imvelo Early Warning</p>
      <h1 style="margin:6px 0 0;font-size:22px">${w.title}</h1>
    </div>
    <p style="font-size:15px;color:#1a2e1f">Hi ${name},</p>
    <p style="font-size:15px;color:#1a2e1f">${w.message}</p>
    <p style="font-weight:bold;color:${color};margin-bottom:4px">Severity: ${w.severity.toUpperCase()} — Cautions:</p>
    <ul style="color:#1a2e1f;font-size:14px;padding-left:18px">${tips}</ul>
    <a href="https://imveloapp.lovable.app/weather" style="display:inline-block;background:#1f5130;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;margin-top:8px">Open forecast</a>
    <p style="font-size:12px;color:#667085;margin-top:24px">You receive this because severe weather is expected at your farm location. Stay safe — Imvelo.</p>
  </div>`;
  const res = await fetch('https://connector-gateway.lovable.dev/brevo/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovKey}`, 'X-Connection-Api-Key': brevoKey },
    body: JSON.stringify({
      sender: { name: 'Imvelo Alerts', email: Deno.env.get('BREVO_SENDER_EMAIL') || 'alerts@imveloapp.xyz' },
      to: [{ email, name }],
      subject: `${w.title} — take precautions`,
      htmlContent: html,
    }),
  });
  if (!res.ok) console.error('brevo email failed', res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const mbKey = Deno.env.get('METEOBLUE_API_KEY');
    if (!mbKey) throw new Error('METEOBLUE_API_KEY missing');

    // Optional single-user override
    let body: any = {};
    try { body = await req.json(); } catch {}
    const singleUser: string | undefined = body?.user_id;

    // Get distinct users with push subscriptions + last known location from climate_observations
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .limit(1000);
    if (subErr) throw subErr;
    const { data: profs } = await supabase.from('profiles').select('id').limit(1000);
    const userIds = Array.from(new Set([...(subs || []).map((s: any) => s.user_id), ...(profs || []).map((p: any) => p.id)].filter(Boolean)));
    const targets = singleUser ? [singleUser] : userIds;

    const results: any[] = [];
    for (const uid of targets) {
      // most recent lat/lon we have for this user
      const { data: obs } = await supabase
        .from('climate_observations')
        .select('latitude,longitude')
        .eq('user_id', uid)
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const lat = obs?.latitude ?? -26.3054;
      const lon = obs?.longitude ?? 31.1367;

      const days = await fetchMeteoblue(lat, lon, mbKey);
      const warnings = deriveWarnings(days);
      if (!warnings.length) { results.push({ uid, sent: 0 }); continue; }

      let sent = 0;
      for (const w of warnings) {
        // Deduplicate: same user + type in last 12h
        const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
        const { data: recent } = await supabase
          .from('weather_alerts')
          .select('id')
          .eq('user_id', uid)
          .eq('alert_type', w.type)
          .gte('created_at', cutoff)
          .limit(1);
        if (recent && recent.length) continue;

        // Insert into weather_alerts (realtime push handled by client too)
        await supabase.from('weather_alerts').insert({
          user_id: uid, alert_type: w.type, severity: w.severity, message: w.message,
        }).select().maybeSingle().catch(() => null);

        // Direct web push via existing function
        await supabase.functions.invoke('send-push-notification', {
          body: { user_id: uid, title: w.title, body: w.message, data: { type: w.type, severity: w.severity }, url: '/climate-risk' },
        }).catch((e) => console.error('push invoke err', e));

        // SMS early warning via Brevo (reaches farmers offline / without push)
        await supabase.functions.invoke('brevo-sms', {
          body: { user_id: uid, message: w.message, category: 'early_warning' },
        }).catch((e) => console.error('brevo-sms invoke err', e));
        // Caution email via Brevo
        await sendCautionEmail(supabase, uid, w).catch((e) => console.error('email err', e));
        sent++;
      }
      results.push({ uid, sent });
    }

    return new Response(JSON.stringify({ ok: true, processed: targets.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('dispatch-early-warnings error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
