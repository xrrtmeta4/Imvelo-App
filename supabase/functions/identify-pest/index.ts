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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const useLovable = !GEMINI_KEY && !!LOVABLE_API_KEY;
    const apiKey = GEMINI_KEY || LOVABLE_API_KEY;
    if (!apiKey) throw new Error('No AI API key configured');

    const aiUrl = useLovable
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const aiModel = useLovable ? 'google/gemini-2.5-flash' : 'gemini-2.5-flash';

    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an agricultural expert specializing in pest identification for African crops. Analyze the image carefully and provide structured JSON only: {"pest_name": "...", "treatment": "...", "confidence": number (0-100), "evidence": ["3-5 short visual cues you observed in the image that justify the identification (e.g. leaf damage pattern, body color, shape of larvae)"], "alternatives": [{"name":"...","likelihood":number}], "severity": "low|moderate|high", "affected_crops": ["..."], "prevention": "short prevention tip"}. Be honest about confidence — lower it when image quality is poor or symptoms are ambiguous.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify the pest or disease in this crop image, recommend treatment, and list visual evidence supporting your decision.' },
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

    // Ensure disclaimer is always attached
    result.disclaimer = "AI-assisted identification — not a substitute for professional agricultural advice. Always verify with a qualified extension officer before applying any chemical treatment.";
    if (!result.evidence) result.evidence = [];
    if (!result.alternatives) result.alternatives = [];

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
