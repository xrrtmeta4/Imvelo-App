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
    const apiKey = Deno.env.get('IPGEOLOCATION_API_KEY');
    
    if (!apiKey) {
      console.warn('IPGEOLOCATION_API_KEY not configured; using fallback location');
      return new Response(
        JSON.stringify({
          latitude: -26.3054,
          longitude: 31.1367,
          city: 'Mbabane',
          state: 'Hhohho',
          country_name: 'Eswatini',
          country_code: 'SZ',
          timezone: 'Africa/Mbabane',
          source: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     '';

    console.log('Fetching location for IP:', clientIp || 'auto-detect');

    // Use ipgeolocation.io API
    const url = clientIp 
      ? `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${clientIp}`
      : `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Geolocation API error:', response.status, errorText);
      console.warn('Falling back to default location (Mbabane, Eswatini)');

      return new Response(
        JSON.stringify({
          latitude: -26.3054,
          longitude: 31.1367,
          city: 'Mbabane',
          state: 'Hhohho',
          country_name: 'Eswatini',
          country_code: 'SZ',
          timezone: 'Africa/Mbabane',
          source: 'fallback',
          error: 'ipgeolocation_failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Location data received:', data.city, data.country_name, data.latitude, data.longitude);

    return new Response(
      JSON.stringify({
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        city: data.city,
        state: data.state_prov,
        country_name: data.country_name,
        country_code: data.country_code2,
        timezone: data.time_zone?.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
