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
    const { entries, action, advisorPrompt, currency } = await req.json();
    console.log('Ledger analysis request:', action, 'Entries:', entries?.length);

    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let prompt = '';
    
    if (action === 'advisor') {
      prompt = `You are a world-class farm financial advisor with the combined expertise of 10 PhD-level financial advisors specializing in:
1. Agricultural economics and farm finance
2. Tax optimization and compliance for smallholder and commercial farmers
3. Investment banking and capital allocation for agricultural ventures
4. Risk management and insurance for farming operations
5. Cash flow management and working capital optimization
6. Microfinance and agricultural lending
7. Commodity trading and hedging strategies
8. Sustainable finance and ESG in agriculture
9. International trade finance for agricultural exports
10. Financial planning and wealth management for farmers

FARMER'S FINANCIAL DATA (Currency: ${currency || 'USD'}):
${JSON.stringify(entries, null, 2)}

USER'S QUESTION: ${advisorPrompt}

Provide expert-level financial advice that is:
- Specific to the farmer's actual financial data shown above
- Actionable with clear next steps
- Quantified where possible (percentages, amounts, ratios)
- Risk-aware with both opportunities and warnings
- Practical for a farmer in Africa

Keep response under 300 words. Use plain text, no markdown.`;
    } else if (action === 'analyze') {
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

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-3-flash-preview`,
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
