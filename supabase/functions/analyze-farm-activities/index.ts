import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activities, preferredLanguage = 'en' } = await req.json();
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';

    if (!LOVABLE_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ 
          analysis: 'No farm activities recorded yet. Start logging your daily activities to receive AI-powered insights and recommendations.',
          recommendations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format activities for AI analysis
    const formattedActivities = activities.map((a: any) => 
      `- ${a.activity_date}: ${a.activity_type}${a.description ? ` - ${a.description}` : ''}${a.quantity ? ` (${a.quantity} ${a.unit || ''})` : ''}${a.notes ? ` Notes: ${a.notes}` : ''}${a.weather_conditions ? ` Weather: ${a.weather_conditions}` : ''}`
    ).join('\n');

    const systemPrompt = `You are an expert agricultural advisor helping farmers in Eswatini and Southern Africa. Analyze the farmer's recorded activities and provide actionable insights.

Your response should be in ${preferredLanguage === 'en' ? 'English' : preferredLanguage}. Keep it practical and relevant to small-scale farming.

Provide:
1. A brief analysis of their farming patterns and productivity
2. 3-5 specific, actionable recommendations based on their activities
3. Any potential issues or improvements you notice
4. Seasonal advice based on the dates of activities

Be encouraging but practical. Focus on what they're doing well and how they can improve.`;

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-3-flash-preview`,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here are my farm activities from the past period:\n\n${formattedActivities}\n\nPlease analyze these activities and provide insights and recommendations.` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to analyze activities');
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || 'Unable to generate analysis. Please try again.';

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-farm-activities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
