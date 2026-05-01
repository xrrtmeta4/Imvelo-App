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
    const { imageUrl } = await req.json();
    console.log('Identifying pest from image:', imageUrl);

    const GEMINI_KEY = Deno.env.get('Gemini');
    const LOVABLE_API_KEY = GEMINI_KEY;
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an agricultural expert specializing in pest identification for African crops. Analyze images and provide: pest name in English, treatment recommendation in English, and confidence level (0-100). Always respond in English. Respond in JSON format: {"pest_name": "...", "treatment": "...", "confidence": number}'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify the pest or disease in this crop image and recommend treatment.' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${error}`);
    }

    const data = await response.json();
    console.log('AI response:', data);
    
    const content = data.choices?.[0]?.message?.content || '{}';
    let result;
    
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if not JSON
        result = {
          pest_name: 'Unknown pest',
          treatment: content || 'Unable to identify. Consult extension officer.',
          confidence: 50
        };
      }
    } catch (e) {
      result = {
        pest_name: 'Analysis incomplete',
        treatment: content || 'Unable to provide specific treatment. Consult extension officer.',
        confidence: 30
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-pest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
