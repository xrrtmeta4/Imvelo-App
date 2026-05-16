import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
}

// Using Televite API for SMS
async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = Deno.env.get('TELEVITE_API_KEY');
    
    if (!apiKey) {
      console.error('TELEVITE_API_KEY not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    console.log(`Sending SMS via Televite to ${phone}: ${message.substring(0, 50)}...`);
    
    // Televite API endpoint
    const response = await fetch('https://api.televite.com/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        sender_id: 'Imvelo',
      }),
    });

    const result = await response.json();
    console.log('Televite response:', result);

    if (response.ok && (result.success || result.status === 'sent' || result.id)) {
      return { success: true };
    } else {
      return { success: false, error: result.error || result.message || 'Failed to send SMS' };
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, message } = await req.json() as SMSRequest;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Eswatini (+268)
    let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('268')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+268' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+268' + formattedPhone;
      }
    }

    console.log(`Formatted phone: ${formattedPhone}`);

    const result = await sendSMS(formattedPhone, message);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in send-sms-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
