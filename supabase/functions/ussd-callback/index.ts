import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USSD session storage (in production, use a database for persistence)
const sessions: Map<string, { level: string; data: Record<string, string> }> = new Map();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Africa's Talking sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    
    const sessionId = formData.get('sessionId') as string;
    const serviceCode = formData.get('serviceCode') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const text = formData.get('text') as string || '';

    console.log('USSD Request:', { sessionId, serviceCode, phoneNumber, text });

    // Get or create session
    let session = sessions.get(sessionId) || { level: 'main', data: {} };
    
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
      session.level = 'main';
      
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
        session.level = 'farming_topic';
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
        } else {
          const topics: Record<string, string> = {
            '1': 'Crop Diseases',
            '2': 'Soil Management',
            '3': 'Irrigation Tips',
            '4': 'Pest Control',
            '5': 'Fertilizer Use'
          };
          const topic = topics[userInput] || 'General Farming';
          session.data.topic = topic;
          
          // Provide AI-generated tip
          const tips = await getAITip(topic);
          response = `END ${topic} Tips:

${tips}

Dial *223# for more help.`;
        }
      }
      
    } else if (inputPath[0] === '2') {
      // Weather Forecast
      response = `END Weather Forecast for Eswatini:

Today: Partly cloudy, 19-25C
Humidity: 89%
Rain chance: 83%

Farming tip: Good conditions for planting. Consider irrigation due to high humidity.

Dial *223# for more options.`;
      
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
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
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

Dial *223# for more options.`;
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
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON Welcome to Imvelo AI
Farmer's Best Friend

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
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

Dial *223# for more options.`;
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

Dial *223# for more options.`;
      
    } else {
      // Invalid input
      response = `CON Invalid option. Please try again.

1. Ask Farming Question
2. Weather Forecast
3. Pest Identification Tips
4. Crop Planting Guide
5. Contact Extension Officer`;
    }

    // Save session
    sessions.set(sessionId, session);

    // Clean up old sessions (simple cleanup - in production use TTL)
    if (sessions.size > 1000) {
      const keys = Array.from(sessions.keys());
      for (let i = 0; i < 500; i++) {
        sessions.delete(keys[i]);
      }
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
