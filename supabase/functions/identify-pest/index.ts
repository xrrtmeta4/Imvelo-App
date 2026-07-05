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
    const { imageUrl, quantum = false } = await req.json();
    console.log('Identifying pest from image:', imageUrl, 'quantum:', quantum);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const useLovable = !GEMINI_KEY && !!LOVABLE_API_KEY;
    const apiKey = GEMINI_KEY || LOVABLE_API_KEY;
    if (!apiKey) throw new Error('No AI API key configured');

    const aiUrl = useLovable
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const modelPrefix = useLovable ? 'google/' : '';
    const primaryModel = `${modelPrefix}gemini-2.5-flash`;
    // Quantum ensemble uses 3 diverse models in parallel for consensus
    const ensembleModels = [
      `${modelPrefix}gemini-2.5-flash`,
      `${modelPrefix}gemini-2.5-flash-lite`,
      `${modelPrefix}gemini-2.5-pro`,
    ];

    const systemPrompt = `You are CHLOE, Imvelo's agronomic computer-vision AI specializing in African smallholder crop protection.
You have been trained on the taxonomy of major open agriculture computer-vision datasets: PlantDoc, PlantVillage, IP102 (102 insect pest classes), Roboflow "Agriculture Pest" and "Crop Diseases" collections, iCassava, RiceLeafs, CoffeeLeaf, WheatRust, and MaizeLethalNecrosis. Use their canonical class names when identifying (e.g. "Fall armyworm (Spodoptera frugiperda)", "Cassava mosaic disease", "Late blight (Phytophthora infestans)").
${quantum ? 'QUANTUM MODE: Provide a highly technical, expert-grade forensic analysis. Cite morphology (instar stage, wing venation, lesion halo, sporulation pattern), likely pathogen family, epidemiology, and integrated pest management (IPM) recommendations including biocontrol, cultural, and chemical (with active ingredient + WHO class).' : ''}
Analyze the image and return STRICT JSON only, no prose:
{
  "pest_name": "canonical common name (scientific name)",
  "treatment": "${quantum ? 'multi-line: IPM plan — biological, cultural, chemical (active ingredient, dose, PHI)' : 'concrete treatment steps, farmer-friendly'}",
  "confidence": number 0-100,
  "evidence": ["3-5 visual cues you actually see in the image"],
  "alternatives": [{"name":"...","likelihood":number}],
  "severity": "low|moderate|high",
  "affected_crops": ["..."],
  "prevention": "short prevention tip",
  "lifecycle_stage": "${quantum ? 'egg|larva|nymph|adult|mycelial|sporulating' : 'optional'}",
  "econ_threshold": "${quantum ? 'economic threshold in pests/plant or % infection above which intervention is justified' : 'optional'}"
}
Lower confidence when the image is blurry, distant, or symptoms overlap multiple pathogens. Never fabricate — say "Unknown" if you cannot see enough.`;
    const userContent = [
      { type: 'text', text: 'Identify the pest or disease in this crop image, recommend treatment, and list visual evidence supporting your decision.' },
      { type: 'image_url', image_url: { url: imageUrl } }
    ];

    const callModel = async (model: string) => {
      const r = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      });
      if (!r.ok) throw new Error(`${model}: ${r.status}`);
      const j = await r.json();
      const c = j.choices?.[0]?.message?.content || '{}';
      const m = c.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    };

    const parseResult = (raw: any, fallbackContent = ''): any => {
      if (raw && raw.pest_name) return raw;
      return {
        pest_name: 'Unknown pest',
        treatment: fallbackContent || 'Unable to identify. Consult extension officer.',
        confidence: 40,
      };
    };

    let result: any;
    let quantumMeta: any = null;

    if (quantum) {
      // Run diverse models in parallel — allow individual failures
      const settled = await Promise.allSettled(ensembleModels.map(callModel));
      const successes = settled
        .map((s, i) => ({ s, model: ensembleModels[i] }))
        .filter(x => x.s.status === 'fulfilled' && x.s.value)
        .map(x => ({ model: x.model, value: (x.s as PromiseFulfilledResult<any>).value }));

      if (successes.length === 0) {
        throw new Error('All quantum models failed');
      }

      // Consensus: pick most common pest_name (normalized), then merge fields
      const norm = (s: string) => (s || '').toLowerCase().trim();
      const tallies: Record<string, { count: number; entries: any[] }> = {};
      for (const { value } of successes) {
        const k = norm(value.pest_name);
        if (!tallies[k]) tallies[k] = { count: 0, entries: [] };
        tallies[k].count += 1;
        tallies[k].entries.push(value);
      }
      const [winnerKey, winner] = Object.entries(tallies).sort((a, b) => b[1].count - a[1].count)[0];
      const primary = winner.entries[0];
      const agree = winner.count;
      const total = successes.length;
      // Confidence blend: weighted mean + agreement bonus
      const avgConf = winner.entries.reduce((s, e) => s + (Number(e.confidence) || 50), 0) / winner.entries.length;
      const agreementBoost = agree === total ? 15 : agree > 1 ? 8 : 0;
      const confidence = Math.min(99, Math.round(avgConf + agreementBoost));

      // Union of evidence and alternatives across agreeing models
      const evidenceSet = new Set<string>();
      winner.entries.forEach((e: any) => (e.evidence || []).forEach((x: string) => evidenceSet.add(x)));
      const altMap: Record<string, number> = {};
      successes.forEach(({ value }) =>
        (value.alternatives || []).forEach((a: any) => {
          const n = a?.name;
          if (n && norm(n) !== winnerKey) altMap[n] = Math.max(altMap[n] || 0, Number(a.likelihood) || 0);
        })
      );

      result = {
        ...primary,
        confidence,
        evidence: Array.from(evidenceSet).slice(0, 8),
        alternatives: Object.entries(altMap).map(([name, likelihood]) => ({ name, likelihood })).slice(0, 5),
      };
      quantumMeta = {
        enabled: true,
        modelsQueried: ensembleModels,
        modelsResponded: successes.map(s => s.model),
        agreement: `${agree}/${total}`,
        agreementScore: agree / total,
      };
    } else {
      const single = await callModel(primaryModel);
      result = parseResult(single);
    }

    result.disclaimer = 'AI-assisted identification — not a substitute for professional agricultural advice. Always verify with a qualified extension officer before applying any chemical treatment.';
    if (!result.evidence) result.evidence = [];
    if (!result.alternatives) result.alternatives = [];
    if (quantumMeta) result.quantum = quantumMeta;

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
