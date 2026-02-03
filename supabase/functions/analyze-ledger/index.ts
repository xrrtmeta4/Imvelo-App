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
    const { entries, action } = await req.json();
    console.log('Ledger analysis request:', action, 'Entries:', entries?.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let prompt = '';
    
    if (action === 'analyze') {
      // Analyze financial health
      prompt = `You are a farm financial advisor. Analyze these farm ledger entries and provide insights.

ENTRIES (JSON):
${JSON.stringify(entries, null, 2)}

Provide a brief analysis covering:
1. Overall financial health summary (1-2 sentences)
2. Top 3 spending categories and recommendations
3. Income vs expense balance assessment
4. One actionable tip to improve profitability

Keep your response concise (under 200 words). Use plain text, no markdown formatting.`;
    } else if (action === 'forecast') {
      prompt = `You are a farm financial advisor. Based on these ledger entries, provide a simple financial forecast.

ENTRIES (JSON):
${JSON.stringify(entries, null, 2)}

Provide:
1. Estimated monthly income trend
2. Estimated monthly expense trend
3. Projected balance for next month
4. One risk to watch out for

Keep your response concise (under 150 words). Use plain text, no markdown formatting.`;
    } else if (action === 'suggestions') {
      prompt = `You are a farm financial advisor. Review these entries and suggest ways to cut costs or increase income.

ENTRIES (JSON):
${JSON.stringify(entries, null, 2)}

Provide 3-5 specific, actionable suggestions based on the spending patterns you see. Keep each suggestion to 1-2 sentences. Use plain text, no markdown formatting.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
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
    const aiResponse = data.choices?.[0]?.message?.content || 'Unable to generate analysis';

    return new Response(
      JSON.stringify({ analysis: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-ledger:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
