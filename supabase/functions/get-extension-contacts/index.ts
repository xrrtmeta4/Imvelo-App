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
    const { country_name, country_code } = await req.json();

    if (!country_name) {
      return new Response(
        JSON.stringify({ error: 'country_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a database of agricultural extension services worldwide. Return ONLY a valid JSON array of agricultural extension service contacts for the requested country. Each contact object must have these exact fields:
- id: string (sequential number as string)
- name: string (organization/office name)
- title: string (description of service)
- region: string (region/state/province within the country, or "Nationwide")
- office: string (office location)
- phone: string (real phone number with country code)
- email: string (real or plausible email)
- specialization: string (area of expertise)

Include 8-12 contacts covering:
1. The main Ministry of Agriculture or equivalent
2. Regional/provincial agricultural offices (3-4)
3. National agricultural boards or corporations (2-3)
4. International organizations present in that country (FAO, etc.)
5. Veterinary services
6. Environmental/conservation authority

Use REAL, verifiable phone numbers and organizations where possible. For the country "${country_name}" (code: ${country_code || 'unknown'}).
Return ONLY the JSON array, no markdown, no explanation.`
          },
          {
            role: "user",
            content: `Generate agricultural extension service contacts for ${country_name}.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const contacts = JSON.parse(content);

    // Determine regions from contacts
    const regions = ["All Regions", ...new Set(contacts.map((c: any) => c.region).filter((r: string) => r))];

    return new Response(
      JSON.stringify({ 
        contacts, 
        regions,
        country_name,
        country_code 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-extension-contacts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
