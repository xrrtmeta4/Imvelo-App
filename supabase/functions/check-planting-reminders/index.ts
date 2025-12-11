import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current month (1-12)
    const currentMonth = new Date().getMonth() + 1;
    
    console.log(`Checking planting reminders for month: ${currentMonth}`);
    
    // Find all reminders where current month is in the planting window
    // and reminder hasn't been sent this season
    const { data: reminders, error: remindersError } = await supabase
      .from('crop_reminders')
      .select('*')
      .eq('reminder_sent_this_season', false);
    
    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }
    
    console.log(`Found ${reminders?.length || 0} potential reminders to check`);
    
    const notificationsSent: string[] = [];
    
    for (const reminder of reminders || []) {
      // Check if current month is within planting window
      let isInWindow = false;
      
      if (reminder.planting_start_month <= reminder.planting_end_month) {
        // Normal case: start month is before end month (e.g., March to May)
        isInWindow = currentMonth >= reminder.planting_start_month && 
                     currentMonth <= reminder.planting_end_month;
      } else {
        // Wrap-around case: planting window crosses year boundary (e.g., November to February)
        isInWindow = currentMonth >= reminder.planting_start_month || 
                     currentMonth <= reminder.planting_end_month;
      }
      
      if (isInWindow) {
        console.log(`Sending reminder for ${reminder.crop_name} to user ${reminder.user_id}`);
        
        // Create a weather alert (we reuse the weather_alerts table for notifications)
        const { error: alertError } = await supabase
          .from('weather_alerts')
          .insert({
            user_id: reminder.user_id,
            alert_type: 'planting_reminder',
            message: `Sikhatsi sekutjala ${reminder.crop_name}! Cala kutjala nyalo kute uvune kahle.`,
            severity: 'info',
            weather_data: {
              crop_name: reminder.crop_name,
              planting_start_month: reminder.planting_start_month,
              planting_end_month: reminder.planting_end_month
            }
          });
        
        if (alertError) {
          console.error(`Error creating alert for ${reminder.crop_name}:`, alertError);
        } else {
          // Mark reminder as sent for this season
          await supabase
            .from('crop_reminders')
            .update({ reminder_sent_this_season: true })
            .eq('id', reminder.id);
          
          notificationsSent.push(reminder.crop_name);
        }
      }
    }
    
    // Reset reminders for next season (at beginning of each half-year)
    if (currentMonth === 1 || currentMonth === 7) {
      console.log('Resetting reminder_sent_this_season flags for new season');
      await supabase
        .from('crop_reminders')
        .update({ reminder_sent_this_season: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked reminders for month ${currentMonth}`,
        notificationsSent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-planting-reminders:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
