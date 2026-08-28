import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, dodo-signature',
};

// Verify webhook signature using HMAC-SHA256 (timing-safe comparison).
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const expectedSignature = new TextDecoder().decode(encode(new Uint8Array(signatureBuffer)));

    // Constant-time comparison to avoid timing attacks.
    if (expectedSignature.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Map product IDs to plan tiers (single source of truth, mirrors src/lib/products.ts).
const PRODUCT_PLAN_MAP: Record<string, string> = {
  'pdt_0NYZaqcOARihEXXOPIdmC': 'premium',
  'pdt_0NVKhwZKeJCCaRbxoTNno': 'commercial',
  'pdt_0NYZb3ccdGubedVQypzZn': 'enterprise',
};

// Send premium activation email using fetch (no external npm dependency)
async function sendPremiumEmail(email: string, name: string, planName: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { display: flex; align-items: center; margin: 15px 0; padding: 10px; background: white; border-radius: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        h1 { margin: 0; font-size: 28px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🌾</div>
          <h1>Welcome to ${planName}!</h1>
          <p>Farmer's Best Friend</p>
        </div>
        <div class="content">
          <p>Dear ${name || 'Valued Farmer'},</p>
          <p>Thank you for upgrading to <strong>Imvelo ${planName}</strong>! Your subscription is now active and you have access to all ${planName} features:</p>

          <div class="feature">✅ <strong style="margin-left: 10px;">Unlimited AI Pest & Disease Detection</strong></div>
          <div class="feature">✅ <strong style="margin-left: 10px;">Unlimited AI Chat Conversations</strong></div>
          <div class="feature">✅ <strong style="margin-left: 10px;">Unlimited Produce Estimation</strong></div>
          <div class="feature">✅ <strong style="margin-left: 10px;">Priority Weather Alerts</strong></div>
          <div class="feature">✅ <strong style="margin-left: 10px;">Premium Support</strong></div>

          <p>Start exploring your unlimited access now and take your farming to the next level!</p>

          <p style="margin-top: 30px;">Happy Farming! 🌱</p>
          <p><strong>The Imvelo Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Imvelo - Farmer's Best Friend</p>
          <p>Empowering farmers across Eswatini and beyond</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Imvelo <onboarding@resend.dev>',
        to: [email],
        subject: '🎉 Welcome to Imvelo Premium!',
        html: htmlContent,
      }),
    });

    if (response.ok) {
      console.log('Premium activation email sent to:', email);
    } else {
      const errorData = await response.text();
      console.error('Failed to send email:', errorData);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('DODO_WEBHOOK_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Webhook secret must be configured
    if (!webhookSecret) {
      console.error('DODO_WEBHOOK_SECRET not configured - rejecting webhook');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const payload = await req.text();

    // SECURITY: Signature verification is mandatory
    const signature = req.headers.get('dodo-signature') || req.headers.get('x-webhook-signature');
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const isValid = await verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    let payloadJson: any;
    try {
      payloadJson = JSON.parse(payload);
    } catch (parseError) {
      console.error('Invalid JSON payload in webhook:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    console.log('Dodo Payment webhook received:', JSON.stringify(payloadJson, null, 2));

    const eventType: string = payloadJson.type || payloadJson.event_type || 'unknown';

    const isSuccess =
      eventType === 'payment.succeeded' ||
      eventType === 'payment_intent.succeeded' ||
      eventType === 'payment.completed';

    const isFailure =
      eventType === 'payment.failed' ||
      eventType === 'payment_intent.failed' ||
      eventType === 'payment.failed';

    const isCancelled =
      eventType === 'payment.cancelled' ||
      eventType === 'payment_intent.cancelled';

    // Only act on terminal payment events.
    if (!isSuccess && !isFailure && !isCancelled) {
      return new Response(JSON.stringify({ success: true, message: 'Event received (ignored)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const paymentData = payloadJson.data || payloadJson;

    const customerEmail =
      paymentData.customer_email ||
      paymentData.customer?.email ||
      paymentData.metadata?.email ||
      paymentData.billing_details?.email;

    const customerName =
      paymentData.customer_name ||
      paymentData.customer?.name ||
      paymentData.metadata?.name ||
      paymentData.billing_details?.name;

    const paymentReference =
      paymentData.metadata?.payment_reference ||
      paymentData.payment_id ||
      paymentData.id ||
      paymentData.payment_intent_id;

    const productId = paymentData.product_id || paymentData.metadata?.product_id || '';
    const plan = PRODUCT_PLAN_MAP[productId] || 'premium';

    if (!customerEmail) {
      console.log('No customer email found in payload');
      return new Response(JSON.stringify({ success: false, message: 'No customer email in payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Find user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching users:', authError);
      throw authError;
    }
    const user = authUsers.users.find((u: any) => u.email === customerEmail);
    if (!user) {
      console.log('User not found for email:', customerEmail);
      return new Response(JSON.stringify({ success: false, message: 'User not found for email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: existingSub } = await supabase
      .from('premium_subscriptions')
      .select('id, status, payment_reference, plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (isSuccess) {
      // IDEMPOTENCY: if this exact payment was already applied, do not
      // re-activate or re-send the welcome email.
      if (existingSub && existingSub.status === 'active' && existingSub.payment_reference === paymentReference) {
        console.log('Webhook already processed for payment_reference', paymentReference);
        return new Response(JSON.stringify({ success: true, message: 'Already activated', user_id: user.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const wasAlreadyActive = existingSub && existingSub.status === 'active';
      const { error: writeError } = await supabase
        .from('premium_subscriptions')
        .upsert(
          {
            user_id: user.id,
            status: 'active',
            payment_reference: paymentReference,
            expires_at: null,
            plan,
          },
          { onConflict: 'user_id' },
        );

      if (writeError) {
        console.error('Error writing subscription:', writeError);
        throw writeError;
      }
      console.log('Activated subscription for user', user.id, 'plan', plan);

      // Only send the welcome email for a genuinely new activation.
      if (!wasAlreadyActive) {
        const profileRes = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const userName = profileRes.data?.full_name || customerName || 'Valued Farmer';
        const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
        await sendPremiumEmail(customerEmail, userName, planName);
      }
    } else {
      // Failed / cancelled: only revert if this payment matches the active row,
      // so we never accidentally downgrade a different (valid) subscription.
      if (existingSub && existingSub.payment_reference === paymentReference) {
        const { error: writeError } = await supabase
          .from('premium_subscriptions')
          .update({ status: isCancelled ? 'cancelled' : 'failed', payment_reference: paymentReference })
          .eq('user_id', user.id);
        if (writeError) {
          console.error('Error updating subscription status:', writeError);
          throw writeError;
        }
        console.log('Marked subscription', isCancelled ? 'cancelled' : 'failed', 'for user', user.id);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed', user_id: user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
