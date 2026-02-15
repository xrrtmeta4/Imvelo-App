import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, dodo-signature',
};

// Verify webhook signature using simple string comparison
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
    
    // Simple string comparison (timing-safe comparison is ideal but this is sufficient for most cases)
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Send premium activation email using fetch (no external npm dependency)
async function sendPremiumEmail(email: string, name: string): Promise<void> {
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
          <h1>Welcome to Premium!</h1>
          <p>Farmer's Best Friend</p>
        </div>
        <div class="content">
          <p>Dear ${name || 'Valued Farmer'},</p>
          <p>Thank you for upgrading to <strong>Imvelo Premium</strong>! Your subscription is now active and you have access to all premium features:</p>
          
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

    const payloadJson = JSON.parse(payload);
    console.log('Dodo Payment webhook received:', JSON.stringify(payloadJson, null, 2));

    // Map product IDs to plan tiers
    const PRODUCT_PLAN_MAP: Record<string, string> = {
      'pdt_0NVKhwZKeJCCaRbxoTNno': 'starter',
      'pdt_0NYZaqcOARihEXXOPIdmC': 'pro',
      'pdt_0NYZb3ccdGubedVQypzZn': 'enterprise',
    };

    // Handle payment completed event
    if (payloadJson.type === 'payment.succeeded' || payloadJson.type === 'payment_intent.succeeded' || payloadJson.event_type === 'payment.completed') {
      const paymentData = payloadJson.data || payloadJson;
      
      const customerEmail = paymentData.customer_email || 
                           paymentData.customer?.email || 
                           paymentData.metadata?.email ||
                           paymentData.billing_details?.email;
      
      const customerName = paymentData.customer_name ||
                          paymentData.customer?.name ||
                          paymentData.metadata?.name ||
                          paymentData.billing_details?.name;
      
      const paymentReference = paymentData.payment_id || 
                               paymentData.id || 
                               paymentData.payment_intent_id;

      // Determine plan from product ID
      const productId = paymentData.product_id || paymentData.metadata?.product_id || '';
      const plan = PRODUCT_PLAN_MAP[productId] || 'starter';

      console.log('Processing payment for email:', customerEmail);
      console.log('Payment reference:', paymentReference);

      if (customerEmail) {
        // Find user by email
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('Error fetching users:', authError);
          throw authError;
        }

        const user = authUsers.users.find(u => u.email === customerEmail);

        if (user) {
          console.log('Found user:', user.id);
          
          // Get user profile for name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          
          const userName = profile?.full_name || customerName || 'Valued Farmer';
          
          // Check if subscription already exists
          const { data: existingSub } = await supabase
            .from('premium_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingSub) {
            // Update existing subscription
            const { error: updateError } = await supabase
              .from('premium_subscriptions')
              .update({
                status: 'active',
                payment_reference: paymentReference,
                expires_at: null,
                plan: plan
              })
              .eq('user_id', user.id);

            if (updateError) {
              console.error('Error updating subscription:', updateError);
              throw updateError;
            }
            console.log('Updated existing subscription for user:', user.id);
          } else {
            // Create new subscription
            const { error: insertError } = await supabase
              .from('premium_subscriptions')
              .insert({
                user_id: user.id,
                status: 'active',
                payment_reference: paymentReference,
                expires_at: null,
                plan: plan
              });

            if (insertError) {
              console.error('Error creating subscription:', insertError);
              throw insertError;
            }
            console.log('Created new subscription for user:', user.id);
          }

          // Send premium activation email
          await sendPremiumEmail(customerEmail, userName);

          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Subscription activated',
            user_id: user.id 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } else {
          console.log('User not found for email:', customerEmail);
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'User not found for email' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 to acknowledge receipt
          });
        }
      } else {
        console.log('No customer email found in payload');
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'No customer email in payload' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // Acknowledge other event types
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Event received' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});