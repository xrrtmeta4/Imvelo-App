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
    const { crop, region, season, soilType, pest, disease } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const contextParts: string[] = [];

    // 1. Find matching nodes for the query context
    const searchTerms = [crop, region, season, soilType, pest, disease].filter(Boolean);
    
    if (searchTerms.length === 0) {
      return new Response(
        JSON.stringify({ context: '', nodes: [], edges: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nodes matching search terms (case-insensitive, also check aliases)
    const { data: matchedNodes } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .or(searchTerms.map(t => `name.ilike.%${t}%`).join(','));

    if (!matchedNodes || matchedNodes.length === 0) {
      return new Response(
        JSON.stringify({ context: 'No matching knowledge found.', nodes: [], edges: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nodeIds = matchedNodes.map(n => n.id);

    // 2. Get all edges connected to matched nodes (multi-hop: 2 levels)
    const { data: firstHopEdges } = await supabase
      .from('knowledge_edges')
      .select('*, source_node:knowledge_nodes!knowledge_edges_source_node_id_fkey(*), target_node:knowledge_nodes!knowledge_edges_target_node_id_fkey(*)')
      .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
      .order('weight', { ascending: false })
      .limit(50);

    if (!firstHopEdges || firstHopEdges.length === 0) {
      const nodeNames = matchedNodes.map(n => `${n.name} (${n.node_type})`).join(', ');
      return new Response(
        JSON.stringify({ context: `Found entities: ${nodeNames}, but no relationships mapped yet.`, nodes: matchedNodes, edges: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Collect second-hop node IDs
    const secondHopIds = new Set<string>();
    firstHopEdges.forEach(e => {
      if (!nodeIds.includes(e.source_node_id)) secondHopIds.add(e.source_node_id);
      if (!nodeIds.includes(e.target_node_id)) secondHopIds.add(e.target_node_id);
    });

    // 4. Get second-hop edges for richer context
    let secondHopEdges: any[] = [];
    if (secondHopIds.size > 0) {
      const ids = Array.from(secondHopIds);
      const { data } = await supabase
        .from('knowledge_edges')
        .select('*, source_node:knowledge_nodes!knowledge_edges_source_node_id_fkey(name, node_type), target_node:knowledge_nodes!knowledge_edges_target_node_id_fkey(name, node_type)')
        .or(`source_node_id.in.(${ids.join(',')}),target_node_id.in.(${ids.join(',')})`)
        .order('weight', { ascending: false })
        .limit(30);
      if (data) secondHopEdges = data;
    }

    // 5. Build structured context string
    const allEdges = [...firstHopEdges, ...secondHopEdges];
    
    // Group by relationship type
    const pestEdges = allEdges.filter(e => e.relationship === 'affects');
    const treatmentEdges = allEdges.filter(e => e.relationship === 'treats');
    const soilEdges = allEdges.filter(e => e.relationship === 'grows_in' || e.relationship === 'thrives_in');
    const seasonEdges = allEdges.filter(e => e.relationship === 'seasonal_for');
    const regionEdges = allEdges.filter(e => e.relationship === 'found_in');
    const companionEdges = allEdges.filter(e => e.relationship === 'companion_to');

    if (crop) {
      const cropNode = matchedNodes.find(n => n.name.toLowerCase().includes(crop.toLowerCase()));
      if (cropNode) {
        contextParts.push(`CROP: ${cropNode.name}`);
        if (cropNode.properties) {
          const props = cropNode.properties as any;
          if (props.npk) contextParts.push(`  NPK needs: ${props.npk}`);
          if (props.water_needs) contextParts.push(`  Water needs: ${props.water_needs}`);
          if (props.temp_range_c) contextParts.push(`  Temperature range: ${props.temp_range_c[0]}-${props.temp_range_c[1]}°C`);
        }
      }
    }

    if (pestEdges.length > 0) {
      contextParts.push('COMMON PESTS/DISEASES:');
      const seen = new Set<string>();
      pestEdges.forEach(e => {
        const name = e.source_node?.name || 'Unknown';
        if (!seen.has(name)) {
          seen.add(name);
          const meta = e.metadata as any;
          contextParts.push(`  - ${name} (confidence: ${e.weight}, severity: ${meta?.severity || 'unknown'}, yield loss: ${meta?.yield_loss_pct || '?'}%)`);
        }
      });
    }

    if (treatmentEdges.length > 0) {
      contextParts.push('RECOMMENDED TREATMENTS:');
      const seen = new Set<string>();
      treatmentEdges.forEach(e => {
        const treatName = e.source_node?.name || 'Unknown';
        const pestName = e.target_node?.name || 'Unknown';
        const key = `${treatName}-${pestName}`;
        if (!seen.has(key)) {
          seen.add(key);
          const meta = e.metadata as any;
          contextParts.push(`  - ${treatName} for ${pestName} (efficacy: ${meta?.efficacy || 'unknown'}, timing: ${meta?.timing || 'any'})`);
        }
      });
    }

    if (soilEdges.length > 0) {
      contextParts.push('SOIL COMPATIBILITY:');
      soilEdges.forEach(e => {
        const soilName = e.target_node?.name || e.source_node?.name || 'Unknown';
        const meta = e.metadata as any;
        contextParts.push(`  - ${soilName}: ${meta?.suitability || 'compatible'} ${meta?.note ? `(${meta.note})` : ''}`);
      });
    }

    if (seasonEdges.length > 0) {
      contextParts.push('SEASONAL INFO:');
      seasonEdges.forEach(e => {
        const seasonName = e.target_node?.name || 'Unknown';
        const meta = e.metadata as any;
        contextParts.push(`  - ${seasonName}: plant months ${meta?.planting_months?.join(',') || '?'}, harvest ${meta?.harvest_months?.join(',') || '?'}`);
      });
    }

    if (regionEdges.length > 0) {
      contextParts.push('REGIONAL PREVALENCE:');
      const seen = new Set<string>();
      regionEdges.forEach(e => {
        const entityName = e.source_node?.name || 'Unknown';
        const regionName = e.target_node?.name || 'Unknown';
        const key = `${entityName}-${regionName}`;
        if (!seen.has(key)) {
          seen.add(key);
          const meta = e.metadata as any;
          contextParts.push(`  - ${entityName} in ${regionName}: ${meta?.prevalence || 'present'}`);
        }
      });
    }

    if (companionEdges.length > 0) {
      contextParts.push('COMPANION PLANTING:');
      companionEdges.forEach(e => {
        const meta = e.metadata as any;
        contextParts.push(`  - ${e.source_node?.name} + ${e.target_node?.name}: ${meta?.benefit || 'beneficial'}`);
      });
    }

    const contextString = contextParts.join('\n');

    return new Response(
      JSON.stringify({ 
        context: contextString, 
        nodes: matchedNodes.length,
        edges: allEdges.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Knowledge graph query error:', error);
    return new Response(
      JSON.stringify({ error: error.message, context: '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
