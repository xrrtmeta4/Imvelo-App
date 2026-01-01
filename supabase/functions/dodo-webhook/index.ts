import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    
    console.log('Dodo Payment webhook received:', JSON.stringify(payload, null, 2));

    // Handle payment completed event
    if (payload.type === 'payment.succeeded' || payload.type === 'payment_intent.succeeded' || payload.event_type === 'payment.completed') {
      const paymentData = payload.data || payload;
      
      // Extract customer email from various possible locations
      const customerEmail = paymentData.customer_email || 
                           paymentData.customer?.email || 
                           paymentData.metadata?.email ||
                           paymentData.billing_details?.email;
      
      const paymentReference = paymentData.payment_id || 
                               paymentData.id || 
                               paymentData.payment_intent_id;

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
                expires_at: null // Lifetime access
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
                expires_at: null // Lifetime access
              });

            if (insertError) {
              console.error('Error creating subscription:', insertError);
              throw insertError;
            }
            console.log('Created new subscription for user:', user.id);
          }

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
