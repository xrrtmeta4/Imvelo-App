import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:support@imveloapp.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const { user_id, title, body, data, url } = await req.json();

    console.log(`Sending push notification to user: ${user_id || 'all users'}`);

    // Get user's push subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: title || 'Imvelo Notification',
      body: body || 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'imvelo-notification',
      data: {
        ...data,
        url: url || '/',
      },
    });

    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        console.log(`Successfully sent to: ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error: any) {
        console.error(`Failed to send to ${subscription.endpoint.substring(0, 50)}...`, error.message);
        
        // If subscription is expired or invalid, mark for cleanup
        if (error.statusCode === 404 || error.statusCode === 410) {
          failedEndpoints.push(subscription.endpoint);
        }
      }
    }

    // Clean up expired/invalid subscriptions
    if (failedEndpoints.length > 0) {
      console.log(`Cleaning up ${failedEndpoints.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    console.log(`Successfully sent ${successCount}/${subscriptions.length} push notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedEndpoints.length,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
