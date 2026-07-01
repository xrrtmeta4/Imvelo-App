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

    const systemPrompt = 'You are an agricultural expert specializing in pest identification for African crops. Analyze the image carefully and provide structured JSON only: {"pest_name": "...", "treatment": "...", "confidence": number (0-100), "evidence": ["3-5 short visual cues you observed in the image that justify the identification (e.g. leaf damage pattern, body color, shape of larvae)"], "alternatives": [{"name":"...","likelihood":number}], "severity": "low|moderate|high", "affected_crops": ["..."], "prevention": "short prevention tip"}. Be honest about confidence — lower it when image quality is poor or symptoms are ambiguous.';
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
