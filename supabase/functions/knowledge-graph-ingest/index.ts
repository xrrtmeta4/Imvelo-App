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
    const { 
      contributionType, // scan_confirmation | activity_log | harvest_report | manual_feedback
      entities, // array of { name, nodeType }
      relationships, // optional array of { sourceName, targetName, relationship }
      context, // { location, season, outcome, ... }
      userId 
    } = await req.json();

    if (!contributionType || !entities || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: contributionType, entities, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const processedNodes: any[] = [];

    // 1. Find or create nodes for each entity
    for (const entity of entities) {
      const { name, nodeType } = entity;
      if (!name || !nodeType) continue;

      // Try to find existing node (fuzzy match on name or aliases)
      const { data: existing } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('node_type', nodeType)
        .ilike('name', `%${name}%`)
        .limit(1)
        .single();

      if (existing) {
        // Increment interaction count
        await supabase
          .from('knowledge_nodes')
          .update({ interaction_count: existing.interaction_count + 1 })
          .eq('id', existing.id);
        
        processedNodes.push(existing);
      } else {
        // Check aliases
        const { data: aliasMatch } = await supabase
          .from('knowledge_nodes')
          .select('*')
          .eq('node_type', nodeType)
          .contains('aliases', JSON.stringify([name]))
          .limit(1)
          .single();

        if (aliasMatch) {
          await supabase
            .from('knowledge_nodes')
            .update({ interaction_count: aliasMatch.interaction_count + 1 })
            .eq('id', aliasMatch.id);
          processedNodes.push(aliasMatch);
        } else {
          // Create new node with low confidence
          const { data: newNode } = await supabase
            .from('knowledge_nodes')
            .insert({
              node_type: nodeType,
              name: name,
              confidence_score: 0.3,
              interaction_count: 1,
              aliases: JSON.stringify([]),
              properties: JSON.stringify({})
            })
            .select()
            .single();
          
          if (newNode) processedNodes.push(newNode);
        }
      }
    }

    // 2. Process relationships (create or strengthen edges)
    if (relationships && relationships.length > 0) {
      for (const rel of relationships) {
        const sourceNode = processedNodes.find(n => 
          n.name.toLowerCase().includes(rel.sourceName.toLowerCase())
        );
        const targetNode = processedNodes.find(n => 
          n.name.toLowerCase().includes(rel.targetName.toLowerCase())
        );

        if (sourceNode && targetNode) {
          // Check if edge exists
          const { data: existingEdge } = await supabase
            .from('knowledge_edges')
            .select('*')
            .eq('source_node_id', sourceNode.id)
            .eq('target_node_id', targetNode.id)
            .eq('relationship', rel.relationship)
            .single();

          if (existingEdge) {
            // Strengthen the edge
            const newWeight = Math.min(1.0, existingEdge.weight + 0.01);
            await supabase
              .from('knowledge_edges')
              .update({ 
                weight: newWeight, 
                reported_by_count: existingEdge.reported_by_count + 1 
              })
              .eq('id', existingEdge.id);
          } else {
            // Create new edge
            await supabase
              .from('knowledge_edges')
              .insert({
                source_node_id: sourceNode.id,
                target_node_id: targetNode.id,
                relationship: rel.relationship,
                weight: 0.4,
                reported_by_count: 1,
                metadata: JSON.stringify(rel.metadata || {})
              });
          }
        }
      }
    }

    // 3. Log contribution
    const sourceNode = processedNodes[0];
    const targetNode = processedNodes.length > 1 ? processedNodes[1] : null;

    await supabase
      .from('knowledge_contributions')
      .insert({
        user_id: userId,
        contribution_type: contributionType,
        source_node_id: sourceNode?.id || null,
        target_node_id: targetNode?.id || null,
        edge_relationship: relationships?.[0]?.relationship || null,
        context: context || {}
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        nodesProcessed: processedNodes.length,
        message: 'Knowledge graph enriched successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Knowledge graph ingest error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
