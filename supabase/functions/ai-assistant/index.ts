import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, preferredLanguage = 'en' } = await req.json();
    console.log('AI Assistant request:', messages, 'Language:', preferredLanguage);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const languageNames: Record<string, string> = {
      en: 'English', fr: 'French', de: 'German', es: 'Spanish',
      pt: 'Portuguese', it: 'Italian', nl: 'Dutch', pl: 'Polish',
      sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish',
      el: 'Greek', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian',
      bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian',
      ss: 'siSwati'
    };

    const languageName = languageNames[preferredLanguage] || 'English';

    // --- KNOWLEDGE GRAPH INTEGRATION ---
    let knowledgeContext = '';
    try {
      // Extract context keywords from the last user message
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
      if (lastUserMsg) {
        const msgContent = lastUserMsg.content.toLowerCase();
        
        // Simple keyword extraction for crops, pests, regions, soil
        const contextParams: any = {};
        
        // Query the knowledge graph
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Get all node names for matching
        const { data: nodes } = await supabase
          .from('knowledge_nodes')
          .select('name, node_type')
          .order('interaction_count', { ascending: false })
          .limit(300);

        if (nodes) {
          for (const node of nodes) {
            const nameLower = node.name.toLowerCase();
            if (msgContent.includes(nameLower)) {
              if (node.node_type === 'crop') contextParams.crop = node.name;
              else if (node.node_type === 'pest') contextParams.pest = node.name;
              else if (node.node_type === 'disease') contextParams.disease = node.name;
              else if (node.node_type === 'region') contextParams.region = node.name;
              else if (node.node_type === 'soil_type') contextParams.soilType = node.name;
              else if (node.node_type === 'season') contextParams.season = node.name;
            }
          }
        }

        // If we found relevant entities, query the graph
        if (Object.keys(contextParams).length > 0) {
          const graphResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/knowledge-graph-query`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify(contextParams),
            }
          );

          if (graphResponse.ok) {
            const graphData = await graphResponse.json();
            if (graphData.context && graphData.context.trim()) {
              knowledgeContext = graphData.context;
              console.log('Knowledge graph context injected:', knowledgeContext.substring(0, 200));
            }
          }
        }
      }
    } catch (graphError) {
      console.error('Knowledge graph query failed (non-fatal):', graphError);
    }

    // Build system prompt with knowledge graph context
    let systemPrompt = `You are a helpful agricultural assistant for farmers called Imvelo AI. 

CRITICAL LANGUAGE INSTRUCTION:
- ALWAYS detect the language the user is writing in and respond in that SAME language
- If the user writes in Spanish, respond in Spanish. If they write in French, respond in French. If they write in siSwati, respond in siSwati. And so on for any language.
- Match the user's language exactly - this takes priority over any profile settings
- If you cannot determine the user's language from their message, fall back to ${languageName}

IMPORTANT FORMATTING RULES:
- NEVER use asterisks (*) or markdown formatting like **bold** or *italic*
- Use plain text only
- Organize your responses in clear paragraphs with proper spacing
- Use numbered lists (1. 2. 3.) when listing steps or options
- Keep paragraphs short and focused on one idea each
- Separate different topics with blank lines for readability

Provide practical advice about farming, crops, pest control, weather, livestock, and marketplace. Be helpful, friendly, and actionable.`;

    if (knowledgeContext) {
      systemPrompt += `

AGRONOMIC KNOWLEDGE GRAPH DATA (verified local data from African farmers - use this to give specific, accurate advice):
${knowledgeContext}

IMPORTANT: When the knowledge graph provides specific data about pests, treatments, soil compatibility, or regional information, incorporate it into your answer. Cite confidence levels when relevant. This data is from real farmer reports and local agricultural research.`;
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
          { role: 'system', content: systemPrompt },
          ...messages
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
    console.log('AI response received');
    
    const aiResponse = data.choices?.[0]?.message?.content || 'Unable to generate response';

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        knowledgeGraphUsed: !!knowledgeContext 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
