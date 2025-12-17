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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert veterinarian AI assistant specializing in livestock and farm animal health. 
            Analyze images of animals to identify potential diseases or health issues.
            Always respond in English and in JSON format with these fields:
            - disease_name: The name of the disease or condition in English
            - animal_type: Type of animal identified
            - treatment: Recommended treatment steps in English
            - prevention: Prevention measures in English
            - confidence: Your confidence level (0-100)
            - urgency: "low", "medium", or "high" based on severity
            Be accurate and helpful for farmers in Eswatini.`
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