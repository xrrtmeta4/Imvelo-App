import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VegIndexInput {
  ndvi?: number;
  evi?: number;
  waterIndex?: number;
  greenness?: number;
  cropType?: string;
  growthStage?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({});
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { indices, imageBase64, imageUrl, cropType, growthStage } = (req.body || {}) as {
      indices?: VegIndexInput;
      imageBase64?: string;
      imageUrl?: string;
      cropType?: string;
      growthStage?: string;
    };

    // imageBase64 is an inline data URI from the client (no storage upload).
    const imageRef = imageBase64 || imageUrl;
    if (!imageRef) {
      res.status(400).json({ error: 'image required (imageBase64 or imageUrl)' });
      return;
    }

    const GEMINI_KEY = process.env.Gemini || process.env.GEMINI_API_KEY;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const USE_LOVABLE = !GEMINI_KEY && !!LOVABLE_API_KEY;
    const API_KEY = GEMINI_KEY || LOVABLE_API_KEY;
    const AI_URL = USE_LOVABLE
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';

    if (!API_KEY) {
      res.status(500).json({ error: 'Gemini API key is not configured (set Gemini or LOVABLE_API_KEY in Vercel env)' });
      return;
    }

    const ndvi = indices?.ndvi;
    const evi = indices?.evi;
    const waterIndex = indices?.waterIndex;
    const greenness = indices?.greenness;

    const healthAssessment =
      ndvi == null ? 'insufficient'
      : ndvi < 0.2 ? 'severe_stress'
      : ndvi < 0.4 ? 'moderate_stress'
      : ndvi < 0.6 ? 'mild_stress'
      : 'healthy';

    const waterStatus =
      waterIndex == null ? 'unknown'
      : waterIndex < 0.05 ? 'severe_water_stress'
      : waterIndex < 0.15 ? 'moderate_water_stress'
      : waterIndex < 0.3 ? 'mild_water_stress'
      : 'adequate_water';

    const systemPrompt = `You are CHLOE, an infrared-assisted plant & animal health diagnostician for African smallholder farms.
You receive computer-vision vegetation indices computed from a phone camera image plus the raw image itself. Interpret them together:

Vegetation-health indices range guide:
- NDVI: >0.6 healthy, 0.4-0.6 good/aggressive growth, 0.2-0.4 stressed, <0.2 severely stressed (or bare soil)
- EVI: similar scale, better in high-biomass/closing canopies
- Water Index (NDWI-like, green vs NIR-proxy): <0.05 severe water stress, 0.05-0.15 moderate, 0.15-0.3 mild, >0.3 adequate

For ANIMAL scans: the indices will be near-zero and health is judged from the image directly.

Respond in STRICT JSON:
{
  "target": "plant" | "animal" | "unknown",
  "cropType": "string or null",
  "growthStage": "string or null",
  "healthStatus": "healthy" | "mild_stress" | "moderate_stress" | "severe_stress" | "diseased" | "water_stressed" | "nutrient_deficient" | "pest_damage" | "healthy_animal" | "stressed_animal",
  "vigorScore": number (0-100),
  "diagnosis": { "waterStress": "none|low|moderate|severe", "nutrientStatus": "deficient|adequate|excess", "diseaseRisk": "none|low|moderate|high", "pestRisk": "none|low|moderate|high", "heatStress": "none|low|moderate|high" },
  "visibleSymptoms": ["string"],
  "recommendations": ["2-4 concrete, localizable actions"],
  "confidence": number (0-100)
}
Be honest: lower confidence for distant, partial, or night images.`;

    const userPrompt = `Phone camera capture + computed indices:
Crop/animal type (if known): ${cropType || "unknown"}
Growth stage (if known): ${growthStage || "unknown"}

## Computed vegetation & water indices (NDVI-like)
- NDVI (greenness vs NIR-proxy): ${ndvi ?? "n/a"}
- EVI: ${evi ?? "n/a"}
- Water Index (green vs NIR-proxy): ${waterIndex ?? "n/a"}
- Greenness proxy: ${greenness ?? "n/a"}
- Auto-classified health from indices: ${healthAssessment}
- Auto-classified water status from indices: ${waterStatus}

Interpret image: ${imageRef} — correlate the index values with visible leaf color, wilting, canopy gaps, pest lesions, or animal condition. Distinguish water stress (high NDVI drop + low water index) from nutrient deficiency (patchy greening) from disease/pest (localized lesions or skeletonizing).`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(`${AI_URL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash`,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageRef } },
          ] },
        ],
        max_tokens: 1500,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const t = await response.text();
      console.error('scan-stress-ir AI error:', response.status, t);
      res.status(502).json({ error: `AI error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(content.replace(/```json\s*/, '').replace(/```\s*$/, '').match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    } catch (e) {
      console.warn('scan-stress-ir parse fallback', e);
    }

    const result = {
      target: parsed?.target ?? (ndvi == null ? 'unknown' : 'plant'),
      cropType: parsed?.cropType ?? cropType ?? null,
      growthStage: parsed?.growthStage ?? growthStage ?? null,
      healthStatus: parsed?.healthStatus ?? healthAssessment,
      vigorScore: parsed?.vigorScore ?? (ndvi != null ? Math.max(0, Math.min(100, Math.round(ndvi * 100 + 20))) : 50),
      indices: { ndvi, evi, waterIndex, greenness, healthAssessment, waterStatus },
      diagnosis: parsed?.diagnosis ?? {
        waterStress: waterStatus,
        nutrientStatus: 'unknown',
        diseaseRisk: 'low',
        pestRisk: 'low',
        heatStress: 'low',
      },
      visibleSymptoms: parsed?.visibleSymptoms ?? [],
      recommendations: parsed?.recommendations ?? (ndvi != null && ndvi < 0.3
        ? ['Apply water directly to root zone.', 'Mulch to reduce evaporation.', 'Re-scan in 24h.']
        : []),
      confidence: parsed?.confidence ?? (ndvi != null ? 72 : 50),
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error: unknown) {
    console.error('scan-stress-ir error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
}
