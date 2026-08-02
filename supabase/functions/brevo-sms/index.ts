import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/brevo';

function normalizePhone(raw: string, country?: string | null): string | null {
  let p = String(raw || '').replace(/[\s\-()]/g, '');
  if (!p) return null;
  if (p.startsWith('+')) return p.slice(1);
  if (p.startsWith('00')) return p.slice(2);
  if (p.startsWith('0')) {
    // default Eswatini country code when unknown
    const cc = country === 'ZA' ? '27' : '268';
    return cc + p.slice(1);
  }
  return p;
}

async function sendSms(recipient: string, content: string, sender: string) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const brevoKey = Deno.env.get('BREVO_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');
  if (!brevoKey) throw new Error('BREVO_API_KEY is not configured');

  const res = await fetch(`${GATEWAY_URL}/transactionalSMS/sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': brevoKey,
    },
    body: JSON.stringify({ type: 'transactional', unicodeEnabled: false, sender, recipient, content: content.slice(0, 320) }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Brevo SMS failed [${res.status}]: ${text}`);
    return { ok: false, status: res.status, error: text };
  }
  return { ok: true, response: text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);
    const isService = token === serviceKey;
    let callerId: string | null = null;
    let callerIsOfficer = false;

    if (!isService) {
      const { data: userRes } = await admin.auth.getUser(token);
      callerId = userRes?.user?.id ?? null;
      if (!callerId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: officer } = await admin.rpc('is_extension_officer', { _user_id: callerId });
      callerIsOfficer = !!officer;
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    const sender = String(body?.sender || 'IMVELO').slice(0, 11);
    const category = String(body?.category || 'advisory'); // 'early_warning' | 'advisory'
    if (!message) return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Resolve recipients
    let targets: Array<{ user_id?: string; phone: string; country?: string | null }> = [];

    if (body?.phone) {
      if (!isService && !callerIsOfficer) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      targets = [{ phone: String(body.phone) }];
    } else if (body?.user_id) {
      const uid = String(body.user_id);
      if (!isService && !callerIsOfficer && uid !== callerId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: p } = await admin.from('profiles').select('id, phone_number, country').eq('id', uid).maybeSingle();
      if (p?.phone_number) targets = [{ user_id: p.id, phone: p.phone_number, country: p.country }];
    } else if (body?.broadcast) {
      if (!isService && !callerIsOfficer) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      let q = admin.from('profiles').select('id, phone_number, country').not('phone_number', 'is', null).limit(1000);
      if (body?.country) q = q.eq('country', body.country);
      const { data: rows } = await q;
      targets = (rows || []).map((p: any) => ({ user_id: p.id, phone: p.phone_number, country: p.country }));
    } else if (callerId) {
      const { data: p } = await admin.from('profiles').select('id, phone_number, country').eq('id', callerId).maybeSingle();
      if (p?.phone_number) targets = [{ user_id: p.id, phone: p.phone_number, country: p.country }];
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No recipients with phone numbers' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prefix = category === 'early_warning' ? 'IMVELO ALERT: ' : 'IMVELO: ';
    let sent = 0;
    const failures: any[] = [];
    for (const t of targets) {
      const phone = normalizePhone(t.phone, t.country);
      if (!phone) continue;
      const r = await sendSms(phone, prefix + message, sender);
      if (r.ok) sent++; else failures.push({ phone, error: r.error, status: r.status });
    }

    return new Response(JSON.stringify({ ok: true, sent, failed: failures.length, failures: failures.slice(0, 5) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('brevo-sms error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
