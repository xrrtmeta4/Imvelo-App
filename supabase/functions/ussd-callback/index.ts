import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface USSDSession {
  id: string;
  session_id: string;
  phone_number: string;
  current_menu: string;
  context: Record<string, string>;
  last_input: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Africa's Talking sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    
    const sessionId = formData.get('sessionId') as string;
    const serviceCode = formData.get('serviceCode') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const text = formData.get('text') as string || '';

    console.log('USSD Request:', { sessionId, serviceCode, phoneNumber, text });

    // Get or create session from database
    let session = await getSession(supabase, sessionId);
    
    if (!session) {
      session = await createSession(supabase, sessionId, phoneNumber);
    }
    
    // Parse user input (text comes as "1*2*3" for multiple selections)
    const userInput = text.split('*').pop() || '';
    const inputPath = text.split('*');

    let response = '';

    // Handle menu navigation based on input path
    if (text === '') {
      // Main menu
      response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
      await updateSession(supabase, sessionId, 'main', {}, '');
      
    } else if (inputPath[0] === '1') {
      // Ask Farming Question flow
      if (inputPath.length === 1) {
        response = `CON What topic do you need help with?

1. Crop Diseases
2. Soil Management
3. Irrigation Tips
4. Pest Control
5. Fertilizer Use
0. Back to Main Menu`;
        await updateSession(supabase, sessionId, 'farming_topic', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
          await updateSession(supabase, sessionId, 'main', {}, userInput);
        } else {
          const topics: Record<string, string> = {
            '1': 'Crop Diseases',
            '2': 'Soil Management',
            '3': 'Irrigation Tips',
            '4': 'Pest Control',
            '5': 'Fertilizer Use'
          };
          const topic = topics[userInput] || 'General Farming';
          
          // Provide AI-generated tip
          const tips = await getAITip(topic);
          response = `END ${topic} Tips:

${tips}

Dial *384# for more help.`;
          await updateSession(supabase, sessionId, 'farming_result', { topic }, userInput);
        }
      }
      
    } else if (inputPath[0] === '2') {
      // Weather Forecast
      response = `END Weather Forecast for Eswatini:

Today: Partly cloudy, 19-25C
Humidity: 89%
Rain chance: 83%

Farming tip: Good conditions for planting. Consider irrigation due to high humidity.

Dial *384# for more options.`;
      await updateSession(supabase, sessionId, 'weather', {}, userInput);
      
    } else if (inputPath[0] === '3') {
      // Pest Identification Tips
      if (inputPath.length === 1) {
        response = `CON Select crop type:

1. Maize/Corn
2. Vegetables
3. Fruits
4. Sugarcane
5. Cotton
0. Back to Main Menu`;
        await updateSession(supabase, sessionId, 'pest_select', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
          await updateSession(supabase, sessionId, 'main', {}, userInput);
        } else {
          const crops: Record<string, string> = {
            '1': 'Maize/Corn',
            '2': 'Vegetables',
            '3': 'Fruits',
            '4': 'Sugarcane',
            '5': 'Cotton'
          };
          const crop = crops[userInput] || 'General Crops';
          const pestTips = await getPestTips(crop);
          response = `END ${crop} Pest Prevention:

${pestTips}

For detailed diagnosis, use Imvelo app camera scanner.

Dial *384# for more options.`;
          await updateSession(supabase, sessionId, 'pest_result', { crop }, userInput);
        }
      }
      
    } else if (inputPath[0] === '4') {
      // Crop Planting Guide
      if (inputPath.length === 1) {
        response = `CON Select month for planting guide:

1. January-March (Summer)
2. April-June (Autumn)
3. July-September (Winter)
4. October-December (Spring)
0. Back to Main Menu`;
        await updateSession(supabase, sessionId, 'planting_select', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
          await updateSession(supabase, sessionId, 'main', {}, userInput);
        } else {
          const seasons: Record<string, { name: string; crops: string }> = {
            '1': { name: 'Summer (Jan-Mar)', crops: 'Maize, Beans, Pumpkins, Watermelons' },
            '2': { name: 'Autumn (Apr-Jun)', crops: 'Cabbage, Spinach, Onions, Carrots' },
            '3': { name: 'Winter (Jul-Sep)', crops: 'Peas, Lettuce, Beetroot, Garlic' },
            '4': { name: 'Spring (Oct-Dec)', crops: 'Tomatoes, Peppers, Potatoes, Sweet Potato' }
          };
          const season = seasons[userInput] || seasons['1'];
          response = `END ${season.name} Planting Guide:

Best crops to plant:
${season.crops}

Tips: Prepare soil 2 weeks before planting. Add compost for nutrients.

Dial *384# for more options.`;
          await updateSession(supabase, sessionId, 'planting_result', { season: season.name }, userInput);
        }
      }
      
    } else if (inputPath[0] === '5') {
      // Contact Extension Officer
      response = `END Extension Officer Contact:

Eswatini Agricultural Office
Phone: +268 2404 2731

Regional Offices:
Hhohho: +268 2404 6321
Manzini: +268 2505 2841
Lubombo: +268 2303 3241
Shiselweni: +268 2207 1841

Dial *384# for more options.`;
      await updateSession(supabase, sessionId, 'contact', {}, userInput);
      
    } else {
      // Invalid input
      response = `CON Invalid option. Please try again.

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
      await updateSession(supabase, sessionId, 'error', session.context, userInput);
    }

    // Clean up expired sessions periodically (1% chance per request)
    if (Math.random() < 0.01) {
      await cleanupExpiredSessions(supabase);
    }

    console.log('USSD Response:', response);

    // Africa's Talking expects plain text response
    return new Response(response, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    console.error('USSD Error:', error);
    return new Response('END An error occurred. Please try again later.', {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }
});

// Database session management functions
async function getSession(supabase: any, sessionId: string): Promise<USSDSession | null> {
  const { data, error } = await supabase
    .from('ussd_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  // Check if session is expired
  if (data && new Date(data.expires_at) < new Date()) {
    console.log('Session expired, will create new one');
    return null;
  }

  return data;
}

async function createSession(supabase: any, sessionId: string, phoneNumber: string): Promise<USSDSession> {
  const newSession = {
    session_id: sessionId,
    phone_number: phoneNumber,
    current_menu: 'main',
    context: {},
    last_input: null,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
  };

  const { data, error } = await supabase
    .from('ussd_sessions')
    .insert(newSession)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  console.log('Created new session:', data.id);
  return data;
}

async function updateSession(
  supabase: any, 
  sessionId: string, 
  currentMenu: string, 
  context: Record<string, string>,
  lastInput: string
): Promise<void> {
  const { error } = await supabase
    .from('ussd_sessions')
    .update({
      current_menu: currentMenu,
      context: context,
      last_input: lastInput,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Extend expiry
    })
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error updating session:', error);
  }
}

async function cleanupExpiredSessions(supabase: any): Promise<void> {
  const { error } = await supabase
    .from('ussd_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error cleaning up sessions:', error);
  } else {
    console.log('Cleaned up expired sessions');
  }
}

// Helper function to get AI farming tips
async function getAITip(topic: string): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return getStaticTip(topic);
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
          {
            role: 'system',
            content: 'You are a farming assistant. Give ONE brief practical tip (max 160 characters) about the topic. No asterisks or markdown. Plain text only.'
          },
          {
            role: 'user',
            content: `Give a brief tip about ${topic} for farmers in Eswatini.`
          }
        ],
      }),
    });

    if (!response.ok) {
      return getStaticTip(topic);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content || getStaticTip(topic);
    // Ensure no asterisks and limit length for USSD
    return tip.replace(/\*+/g, '').substring(0, 160);
    
  } catch (error) {
    console.error('AI Tip Error:', error);
    return getStaticTip(topic);
  }
}

function getStaticTip(topic: string): string {
  const tips: Record<string, string> = {
    'Crop Diseases': 'Rotate crops yearly to prevent soil-borne diseases. Remove infected plants immediately to stop spread.',
    'Soil Management': 'Test soil pH before planting. Most crops prefer pH 6.0-7.0. Add lime for acidic soils.',
    'Irrigation Tips': 'Water early morning to reduce evaporation. Check soil moisture 2 inches deep before watering.',
    'Pest Control': 'Inspect crops weekly. Use neem oil spray as natural pest deterrent. Remove weeds regularly.',
    'Fertilizer Use': 'Apply fertilizer based on soil test results. Split applications work better than single heavy dose.'
  };
  return tips[topic] || 'Contact your local extension officer for personalized advice on your farming needs.';
}

async function getPestTips(crop: string): Promise<string> {
  const tips: Record<string, string> = {
    'Maize/Corn': 'Watch for Fall Armyworm. Check leaves for holes and frass. Apply Bt spray if detected early.',
    'Vegetables': 'Aphids are common. Use soapy water spray. Plant marigolds nearby to repel pests naturally.',
    'Fruits': 'Fruit flies damage ripening fruit. Use traps with vinegar bait. Harvest before fully ripe.',
    'Sugarcane': 'Stalk borers cause major damage. Plant resistant varieties. Remove and burn infected stalks.',
    'Cotton': 'Bollworms are the main threat. Scout fields regularly. Use pheromone traps for monitoring.'
  };
  return tips[crop] || 'Regular field inspection is key. Remove infected plants. Consult extension officers for treatment.';
}
