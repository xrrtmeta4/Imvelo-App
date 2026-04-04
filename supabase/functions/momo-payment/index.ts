import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, phone_number, payer_message, payee_note, user_id, plan } = await req.json();

    if (!amount || !phone_number || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, phone_number, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MOMO_USER_ID = Deno.env.get('MOMO_USER_ID');
    const MOMO_API_KEY = Deno.env.get('MOMO_API_KEY');
    const MOMO_PRIMARY_KEY = Deno.env.get('MOMO_PRIMARY_KEY');
    const MOMO_ENVIRONMENT = Deno.env.get('MOMO_ENVIRONMENT') || 'sandbox';

    if (!MOMO_USER_ID || !MOMO_API_KEY || !MOMO_PRIMARY_KEY) {
      throw new Error('MoMo API credentials not configured');
    }

    const baseUrl = MOMO_ENVIRONMENT === 'production'
      ? 'https://proxy.momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    // Step 1: Get OAuth token
    const tokenResponse = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${MOMO_USER_ID}:${MOMO_API_KEY}`),
        'Ocp-Apim-Subscription-Key': MOMO_PRIMARY_KEY,
      },
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Token error:', tokenResponse.status, err);
      throw new Error('Failed to get MoMo access token');
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Create requestToPay
    const referenceId = crypto.randomUUID();

    const requestToPayResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MOMO_ENVIRONMENT === 'production' ? 'mtncameroon' : 'sandbox',
        'Ocp-Apim-Subscription-Key': MOMO_PRIMARY_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: currency || 'EUR',
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phone_number.replace(/[^0-9]/g, ''),
        },
        payerMessage: payer_message || 'Imvelo Premium Subscription',
        payeeNote: payee_note || 'Premium plan payment',
      }),
    });

    if (!requestToPayResponse.ok && requestToPayResponse.status !== 202) {
      const err = await requestToPayResponse.text();
      console.error('RequestToPay error:', requestToPayResponse.status, err);
      throw new Error('Failed to initiate MoMo payment');
    }

    // Step 3: Poll for transaction status (max 60s, every 5s)
    let status = 'PENDING';
    let txData: any = null;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const statusResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Target-Environment': MOMO_ENVIRONMENT === 'production' ? 'mtncameroon' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MOMO_PRIMARY_KEY,
        },
      });

      if (statusResponse.ok) {
        txData = await statusResponse.json();
        status = txData.status;
        console.log(`Poll ${i + 1}: status=${status}`);
        if (status === 'SUCCESSFUL' || status === 'FAILED') break;
      }
    }

    // Step 4: If successful, activate subscription
    if (status === 'SUCCESSFUL') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      await supabaseAdmin.from('premium_subscriptions').upsert({
        user_id,
        status: 'active',
        plan: plan || 'premium',
        payment_reference: `momo_${referenceId}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' });
    }

    return new Response(
      JSON.stringify({
        status,
        reference_id: referenceId,
        transaction: txData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MoMo payment error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
