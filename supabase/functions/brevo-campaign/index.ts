import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/brevo';

function brevoHeaders() {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const brevoKey = Deno.env.get('BREVO_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');
  if (!brevoKey) throw new Error('BREVO_API_KEY is not configured');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': brevoKey,
  };
}

async function brevo(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY_URL}/${path}`, { ...init, headers: brevoHeaders() });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Brevo ${path} failed [${res.status}]: ${text}`);
    throw new Error(`[${res.status}] ${text}`);
  }
  try { return JSON.parse(text); } catch { return {}; }
}

function brandedEmail(opts: { title: string; body: string; ctaLabel?: string; ctaUrl?: string }) {
  const { title, body, ctaLabel, ctaUrl } = opts;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" style="border-collapse:collapse;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px rgba(16,64,32,.08);">
<tr><td style="background:linear-gradient(90deg,#15803d,#22c55e);padding:24px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:.5px;">IMVELO</h1>
<p style="margin:6px 0 0;color:#dcfce7;font-size:12px;">Smart Farming for Africa</p>
</td></tr>
<tr><td style="padding:32px 28px;">
<h2 style="margin:0 0 16px;font-size:20px;color:#14532d;">${title}</h2>
<div style="font-size:15px;line-height:24px;color:#3f4a43;">${body}</div>
${ctaUrl ? `<div style="text-align:center;margin-top:28px;"><a href="${ctaUrl}" style="display:inline-block;padding:14px 26px;background:#16a34a;color:#fff;text-decoration:none;font-weight:bold;border-radius:10px;">${ctaLabel || 'Open Imvelo'}</a></div>` : ''}
</td></tr>
<tr><td style="padding:20px;text-align:center;background:#f0fdf4;border-top:1px solid #dcfce7;">
<p style="margin:0;font-size:12px;color:#6b7280;">© ${new Date().getFullYear()} Imvelo — Empowering African Farmers.</p>
<p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">You receive this because you have an Imvelo account. {{ unsubscribe }}</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);

    // Allow service-role callers, otherwise require an extension officer
    if (token !== serviceKey) {
      const { data: userRes } = await admin.auth.getUser(token);
      const uid = userRes?.user?.id;
      if (!uid) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: isOfficer } = await admin.rpc('is_extension_officer', { _user_id: uid });
      if (!isOfficer) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'sync-contacts') {
      const listName = String(body?.listName || 'Imvelo Farmers');
      const lists = await brevo('contacts/lists?limit=50');
      let list = (lists?.lists || []).find((l: any) => l.name === listName);
      if (!list) {
        const folders = await brevo('contacts/folders?limit=10');
        const folderId = folders?.folders?.[0]?.id || 1;
        const created = await brevo('contacts/lists', { method: 'POST', body: JSON.stringify({ name: listName, folderId }) });
        list = { id: created.id, name: listName };
      }

      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const { data: profiles } = await admin.from('profiles').select('id, full_name, country');
      const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const contacts = (users?.users || [])
        .filter((u: any) => u.email)
        .map((u: any) => ({
          email: u.email,
          attributes: {
            FIRSTNAME: (pmap.get(u.id)?.full_name || '').split(' ')[0] || 'Farmer',
            COUNTRY: pmap.get(u.id)?.country || '',
          },
        }));

      let imported = 0;
      for (let i = 0; i < contacts.length; i += 100) {
        const chunk = contacts.slice(i, i + 100);
        await brevo('contacts/import', {
          method: 'POST',
          body: JSON.stringify({ listIds: [list.id], updateExistingContacts: true, emptyContactsAttributes: false, jsonBody: chunk }),
        });
        imported += chunk.length;
      }
      return new Response(JSON.stringify({ ok: true, listId: list.id, imported }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create-campaign' || action === 'send-campaign') {
      const name = String(body?.name || 'Imvelo Campaign').slice(0, 120);
      const subject = String(body?.subject || '').slice(0, 200);
      const title = String(body?.title || subject).slice(0, 200);
      const content = String(body?.content || '');
      const listId = Number(body?.listId);
      const senderName = String(body?.senderName || 'Imvelo');
      const senderEmail = String(body?.senderEmail || '');
      if (!subject || !content || !listId || !senderEmail) {
        return new Response(JSON.stringify({ error: 'subject, content, listId and senderEmail are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const htmlContent = brandedEmail({ title, body: content, ctaLabel: body?.ctaLabel, ctaUrl: body?.ctaUrl });
      const campaign = await brevo('emailCampaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          subject,
          sender: { name: senderName, email: senderEmail },
          type: 'classic',
          htmlContent,
          recipients: { listIds: [listId] },
          ...(body?.scheduledAt ? { scheduledAt: body.scheduledAt } : {}),
        }),
      });
      if (action === 'send-campaign' && !body?.scheduledAt) {
        await brevo(`emailCampaigns/${campaign.id}/sendNow`, { method: 'POST' });
      }
      return new Response(JSON.stringify({ ok: true, campaignId: campaign.id, sent: action === 'send-campaign' && !body?.scheduledAt }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list-campaigns') {
      const data = await brevo('emailCampaigns?limit=25&sort=desc');
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list-lists') {
      const data = await brevo('contacts/lists?limit=50');
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('brevo-campaign error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
