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
    console.log('Identifying animal disease from image:', imageUrl);

    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = GEMINI_KEY || LOVABLE_API_KEY_LOV;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
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
            content: `You are CHLOE, Imvelo's veterinary computer-vision AI for African smallholder livestock (cattle, goats, sheep, poultry, pigs).
You know the canonical presentations of foot-and-mouth disease, lumpy skin disease, East Coast fever, Newcastle disease, Peste des petits ruminants, African swine fever, mastitis, dermatophilosis, mange, coccidiosis, and common nutritional deficiencies.
Analyze the image and return STRICT JSON only:
{
  "disease_name": "canonical name",
  "animal_type": "species (breed if visible)",
  "treatment": "concrete steps: drug/dose/route where applicable, supportive care",
  "prevention": "vaccination schedule, biosecurity, hygiene",
  "confidence": 0-100,
  "urgency": "low|medium|high",
  "evidence": ["3-5 visual cues you observed"],
  "differential": ["2-3 other conditions to rule out"],
  "zoonotic_risk": "none|low|moderate|high"
}
Lower confidence for ambiguous images. Recommend calling a veterinarian for any high-urgency or zoonotic case.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image of an animal and identify any diseases or health issues. Provide treatment recommendations.'
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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback response
        result = {
          disease_name: 'Unable to identify',
          animal_type: 'Unknown',
          treatment: 'Please upload a clearer image.',
          prevention: 'Keep your animals healthy with regular checkups.',
          confidence: 50,
          urgency: 'low'
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      result = {
        disease_name: 'Unidentified condition',
        animal_type: 'Animal',
        treatment: content.substring(0, 200),
        prevention: 'Consult a veterinarian.',
        confidence: 60,
        urgency: 'medium'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in identify-animal-disease:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        disease_name: 'Failed',
        treatment: 'Please try again or consult a veterinarian.',
        confidence: 0,
        urgency: 'medium'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});