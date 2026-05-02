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
    const { imageUrl } = await req.json();
    console.log('Estimating produce from image:', imageUrl);

    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : AI_URL;
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash`,
        messages: [
          {
            role: 'system',
            content: `You are an expert agricultural AI assistant specializing in crop yield estimation for farms in Eswatini/Southern Africa.
            Analyze images of crops/fields to estimate potential yield.
            Always respond in English and in JSON format with these fields:
            - crop_type: Type of crop identified in English
            - estimated_yield: Estimated yield per hectare or visible area (e.g., "500-700 kg/hectare")
            - crop_health: Assessment of crop health in English ("Excellent", "Good", "Fair", "Poor")
            - harvest_time: Estimated time until harvest in English (e.g., "2-3 weeks", "1 month")
            - recommendations: Array of 2-4 recommendations for the farmer in English
            - confidence: Your confidence level (0-100)
            Be practical and helpful for small-scale farmers.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image of crops/field and estimate the potential yield. Provide recommendations for the farmer.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = {
          crop_type: 'Unable to identify',
          estimated_yield: 'Unknown',
          crop_health: 'Fair',
          harvest_time: 'Unknown',
          recommendations: ['Please upload a clearer image'],
          confidence: 50
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      result = {
        crop_type: 'Crops',
        estimated_yield: 'Estimation incomplete',
        crop_health: 'Fair',
        harvest_time: 'Check crop color indicators',
        recommendations: ['Check your crops regularly', 'Irrigate as needed'],
        confidence: 40
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in estimate-produce:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        crop_type: 'Failed',
        estimated_yield: 'Not available',
        crop_health: 'Unknown',
        harvest_time: 'Unknown',
        recommendations: ['Please try again'],
        confidence: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});