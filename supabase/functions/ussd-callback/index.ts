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

const languageNames: Record<string, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  el: 'Greek',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  ss: 'siSwati',
  sw: 'Swahili'
};

// Menu translations
const menuTranslations: Record<string, Record<string, string>> = {
  main_welcome: {
    en: "Welcome to Imvelo AI\nFarmer's Best Friend",
    ss: "Wemukelekile ku-Imvelo AI\nUmngani Wemlimi",
    sw: "Karibu Imvelo AI\nRafiki wa Mkulima",
    fr: "Bienvenue à Imvelo AI\nL'ami du fermier",
    de: "Willkommen bei Imvelo AI\nDer Freund des Bauern",
    es: "Bienvenido a Imvelo AI\nEl amigo del agricultor",
    pt: "Bem-vindo ao Imvelo AI\nO amigo do agricultor"
  },
  menu_1: {
    en: "1. Ask Farming Question",
    ss: "1. Buta Umbuzo Wekulima",
    sw: "1. Uliza Swali la Kilimo",
    fr: "1. Poser une question agricole",
    de: "1. Landwirtschaftliche Frage stellen",
    es: "1. Hacer pregunta agrícola",
    pt: "1. Fazer pergunta agrícola"
  },
  menu_2: {
    en: "2. Weather Forecast",
    ss: "2. Litulu",
    sw: "2. Utabiri wa Hali ya Hewa",
    fr: "2. Prévisions météo",
    de: "2. Wettervorhersage",
    es: "2. Pronóstico del tiempo",
    pt: "2. Previsão do tempo"
  },
  menu_3: {
    en: "3. Pest Identification Tips",
    ss: "3. Emacondziso Ngetilwane",
    sw: "3. Vidokezo vya Kutambua Wadudu",
    fr: "3. Conseils d'identification des ravageurs",
    de: "3. Tipps zur Schädlingsidentifikation",
    es: "3. Consejos de identificación de plagas",
    pt: "3. Dicas de identificação de pragas"
  },
  menu_4: {
    en: "4. Crop Planting Guide",
    ss: "4. Umhlahlandlela Wekuhlanyela",
    sw: "4. Mwongozo wa Kupanda Mazao",
    fr: "4. Guide de plantation",
    de: "4. Pflanzanleitung",
    es: "4. Guía de siembra",
    pt: "4. Guia de plantio"
  },
  menu_5: {
    en: "5. Contact Extension Officer",
    ss: "5. Chumana Ne-Extension Officer",
    sw: "5. Wasiliana na Afisa wa Kilimo",
    fr: "5. Contacter l'agent agricole",
    de: "5. Kontakt Berater",
    es: "5. Contactar agente agrícola",
    pt: "5. Contactar extensionista"
  },
  back_to_menu: {
    en: "0. Back to Main Menu",
    ss: "0. Buyela Emuva",
    sw: "0. Rudi Menyu Kuu",
    fr: "0. Retour au menu principal",
    de: "0. Zurück zum Hauptmenü",
    es: "0. Volver al menú principal",
    pt: "0. Voltar ao menu principal"
  },
  farming_topic_prompt: {
    en: "What topic do you need help with?",
    ss: "Ufuna lusito ngani?",
    sw: "Unahitaji msaada kuhusu nini?",
    fr: "De quel sujet avez-vous besoin d'aide?",
    de: "Bei welchem Thema brauchen Sie Hilfe?",
    es: "¿En qué tema necesita ayuda?",
    pt: "Em que tópico você precisa de ajuda?"
  },
  topic_1: {
    en: "1. Crop Diseases",
    ss: "1. Tifo Tetitjalo",
    sw: "1. Magonjwa ya Mazao",
    fr: "1. Maladies des cultures",
    de: "1. Pflanzenkrankheiten",
    es: "1. Enfermedades de cultivos",
    pt: "1. Doenças das culturas"
  },
  topic_2: {
    en: "2. Soil Management",
    ss: "2. Kunakekela Umhlaba",
    sw: "2. Usimamizi wa Udongo",
    fr: "2. Gestion du sol",
    de: "2. Bodenpflege",
    es: "2. Gestión del suelo",
    pt: "2. Gestão do solo"
  },
  topic_3: {
    en: "3. Irrigation Tips",
    ss: "3. Emacondziso Ekunisela",
    sw: "3. Vidokezo vya Umwagiliaji",
    fr: "3. Conseils d'irrigation",
    de: "3. Bewässerungstipps",
    es: "3. Consejos de riego",
    pt: "3. Dicas de irrigação"
  },
  topic_4: {
    en: "4. Pest Control",
    ss: "4. Kulawula Tilwane",
    sw: "4. Kudhibiti Wadudu",
    fr: "4. Lutte antiparasitaire",
    de: "4. Schädlingsbekämpfung",
    es: "4. Control de plagas",
    pt: "4. Controle de pragas"
  },
  topic_5: {
    en: "5. Fertilizer Use",
    ss: "5. Kusebentisa Umanyolo",
    sw: "5. Matumizi ya Mbolea",
    fr: "5. Utilisation d'engrais",
    de: "5. Düngemittelverwendung",
    es: "5. Uso de fertilizantes",
    pt: "5. Uso de fertilizantes"
  },
  dial_more: {
    en: "Dial *384*51139# for more help.",
    ss: "Shayela *384*51139# kutfola lusito.",
    sw: "Piga *384*51139# kwa msaada zaidi.",
    fr: "Composez *384*51139# pour plus d'aide.",
    de: "Wählen Sie *384*51139# für weitere Hilfe.",
    es: "Marque *384*51139# para más ayuda.",
    pt: "Disque *384*51139# para mais ajuda."
  },
  dial_options: {
    en: "Dial *384*51139# for more options.",
    ss: "Shayela *384*51139# kutfola lokunyenti.",
    sw: "Piga *384*51139# kwa chaguo zaidi.",
    fr: "Composez *384*51139# pour plus d'options.",
    de: "Wählen Sie *384*51139# für mehr Optionen.",
    es: "Marque *384*51139# para más opciones.",
    pt: "Disque *384*51139# para mais opções."
  },
  select_crop: {
    en: "Select crop type:",
    ss: "Khetsa luhlobo lwesitjalo:",
    sw: "Chagua aina ya zao:",
    fr: "Sélectionnez le type de culture:",
    de: "Wählen Sie die Kulturart:",
    es: "Seleccione tipo de cultivo:",
    pt: "Selecione o tipo de cultura:"
  },
  crop_1: {
    en: "1. Maize/Corn",
    ss: "1. Umbila",
    sw: "1. Mahindi",
    fr: "1. Maïs",
    de: "1. Mais",
    es: "1. Maíz",
    pt: "1. Milho"
  },
  crop_2: {
    en: "2. Vegetables",
    ss: "2. Tibhidvo",
    sw: "2. Mboga",
    fr: "2. Légumes",
    de: "2. Gemüse",
    es: "2. Verduras",
    pt: "2. Vegetais"
  },
  crop_3: {
    en: "3. Fruits",
    ss: "3. Titselo",
    sw: "3. Matunda",
    fr: "3. Fruits",
    de: "3. Früchte",
    es: "3. Frutas",
    pt: "3. Frutas"
  },
  crop_4: {
    en: "4. Sugarcane",
    ss: "4. Umoba",
    sw: "4. Miwa",
    fr: "4. Canne à sucre",
    de: "4. Zuckerrohr",
    es: "4. Caña de azúcar",
    pt: "4. Cana-de-açúcar"
  },
  crop_5: {
    en: "5. Cotton",
    ss: "5. Kotoni",
    sw: "5. Pamba",
    fr: "5. Coton",
    de: "5. Baumwolle",
    es: "5. Algodón",
    pt: "5. Algodão"
  },
  use_app_scanner: {
    en: "For detailed diagnosis, use Imvelo app camera scanner.",
    ss: "Kutfola kabanzi, sebentisa ikhamera ye-Imvelo app.",
    sw: "Kwa uchunguzi wa kina, tumia skana ya kamera ya Imvelo.",
    fr: "Pour un diagnostic détaillé, utilisez le scanner de l'application Imvelo.",
    de: "Für eine detaillierte Diagnose verwenden Sie den Imvelo App Scanner.",
    es: "Para un diagnóstico detallado, use el escáner de la aplicación Imvelo.",
    pt: "Para diagnóstico detalhado, use o scanner do aplicativo Imvelo."
  },
  select_season: {
    en: "Select month for planting guide:",
    ss: "Khetsa sikhatsi sekuhlanyela:",
    sw: "Chagua mwezi kwa mwongozo wa kupanda:",
    fr: "Sélectionnez le mois pour le guide de plantation:",
    de: "Wählen Sie den Monat für die Pflanzanleitung:",
    es: "Seleccione el mes para la guía de siembra:",
    pt: "Selecione o mês para o guia de plantio:"
  },
  season_1: {
    en: "1. January-March (Summer)",
    ss: "1. Bhimbidvwane-Indlovana (Lihlobo)",
    sw: "1. Januari-Machi (Kiangazi)",
    fr: "1. Janvier-Mars (Été)",
    de: "1. Januar-März (Sommer)",
    es: "1. Enero-Marzo (Verano)",
    pt: "1. Janeiro-Março (Verão)"
  },
  season_2: {
    en: "2. April-June (Autumn)",
    ss: "2. Mabasa-Inhlaba (Lihwindla)",
    sw: "2. Aprili-Juni (Vuli)",
    fr: "2. Avril-Juin (Automne)",
    de: "2. April-Juni (Herbst)",
    es: "2. Abril-Junio (Otoño)",
    pt: "2. Abril-Junho (Outono)"
  },
  season_3: {
    en: "3. July-September (Winter)",
    ss: "3. Kholwane-Inyoni (Busika)",
    sw: "3. Julai-Septemba (Baridi)",
    fr: "3. Juillet-Septembre (Hiver)",
    de: "3. Juli-September (Winter)",
    es: "3. Julio-Septiembre (Invierno)",
    pt: "3. Julho-Setembro (Inverno)"
  },
  season_4: {
    en: "4. October-December (Spring)",
    ss: "4. Inkhwekhweti-Ingongoni (Intwasahlobo)",
    sw: "4. Oktoba-Desemba (Masika)",
    fr: "4. Octobre-Décembre (Printemps)",
    de: "4. Oktober-Dezember (Frühling)",
    es: "4. Octubre-Diciembre (Primavera)",
    pt: "4. Outubro-Dezembro (Primavera)"
  },
  best_crops: {
    en: "Best crops to plant:",
    ss: "Titjalo letinhle tekuhlanyela:",
    sw: "Mazao bora ya kupanda:",
    fr: "Meilleures cultures à planter:",
    de: "Beste Kulturen zum Pflanzen:",
    es: "Mejores cultivos para plantar:",
    pt: "Melhores culturas para plantar:"
  },
  planting_tips: {
    en: "Tips: Prepare soil 2 weeks before planting. Add compost for nutrients.",
    ss: "Emacondziso: Lungisa umhlaba emaviki lamabili ngaphambi kwekuhlanyela.",
    sw: "Vidokezo: Andaa udongo wiki 2 kabla ya kupanda. Ongeza mboji kwa virutubisho.",
    fr: "Conseils: Préparez le sol 2 semaines avant la plantation.",
    de: "Tipps: Bereiten Sie den Boden 2 Wochen vor dem Pflanzen vor.",
    es: "Consejos: Prepare el suelo 2 semanas antes de plantar.",
    pt: "Dicas: Prepare o solo 2 semanas antes do plantio."
  },
  extension_title: {
    en: "Extension Officer Contact:",
    ss: "Chumana Ne-Extension Officer:",
    sw: "Mawasiliano ya Afisa wa Kilimo:",
    fr: "Contact Agent Agricole:",
    de: "Kontakt Berater:",
    es: "Contacto Agente Agrícola:",
    pt: "Contacto Extensionista:"
  },
  regional_offices: {
    en: "Regional Offices:",
    ss: "Ema-Ofisi Etifundza:",
    sw: "Ofisi za Mkoa:",
    fr: "Bureaux régionaux:",
    de: "Regionalbüros:",
    es: "Oficinas regionales:",
    pt: "Escritórios regionais:"
  },
  invalid_option: {
    en: "Invalid option. Please try again.",
    ss: "Inombolo lengakalungi. Zama futsi.",
    sw: "Chaguo batili. Tafadhali jaribu tena.",
    fr: "Option invalide. Veuillez réessayer.",
    de: "Ungültige Option. Bitte versuchen Sie es erneut.",
    es: "Opción inválida. Por favor intente de nuevo.",
    pt: "Opção inválida. Por favor tente novamente."
  },
  weather_title: {
    en: "Weather Forecast for Eswatini:",
    ss: "Litulu laka-Eswatini:",
    sw: "Utabiri wa Hali ya Hewa kwa Eswatini:",
    fr: "Prévisions météo pour Eswatini:",
    de: "Wettervorhersage für Eswatini:",
    es: "Pronóstico del tiempo para Eswatini:",
    pt: "Previsão do tempo para Eswatini:"
  },
  weather_today: {
    en: "Today: Partly cloudy, 19-25C",
    ss: "Namuhla: Kunelifu, 19-25C",
    sw: "Leo: Mawingu kidogo, 19-25C",
    fr: "Aujourd'hui: Partiellement nuageux, 19-25C",
    de: "Heute: Teilweise bewölkt, 19-25C",
    es: "Hoy: Parcialmente nublado, 19-25C",
    pt: "Hoje: Parcialmente nublado, 19-25C"
  },
  farming_tip: {
    en: "Farming tip: Good conditions for planting. Consider irrigation due to high humidity.",
    ss: "Sicondziso sekulima: Sikhatsi lesihle sekuhlanyela. Cabangela kunisela.",
    sw: "Kidokezo cha kilimo: Hali nzuri ya kupanda. Fikiria umwagiliaji kutokana na unyevu mkubwa.",
    fr: "Conseil agricole: Bonnes conditions pour la plantation.",
    de: "Landwirtschaftstipp: Gute Bedingungen zum Pflanzen.",
    es: "Consejo agrícola: Buenas condiciones para plantar.",
    pt: "Dica agrícola: Boas condições para plantio."
  }
};

function getText(key: string, lang: string): string {
  const translations = menuTranslations[key];
  if (!translations) return key;
  return translations[lang] || translations['en'] || key;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify the request comes from Africa's Talking using a shared API key
  const ussdApiKey = Deno.env.get('USSD_API_KEY');
  if (ussdApiKey) {
    const providedKey = req.headers.get('x-ussd-api-key') || new URL(req.url).searchParams.get('apiKey');
    if (providedKey !== ussdApiKey) {
      console.error('USSD request rejected: invalid API key');
      return new Response('END Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } });
    }
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

    // Validate required fields
    if (!sessionId || !phoneNumber) {
      console.error('USSD request rejected: missing sessionId or phoneNumber');
      return new Response('END Invalid request', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    // Validate phone number format (E.164: + followed by 7-15 digits)
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      console.error('USSD request rejected: invalid phone number format', phoneNumber);
      return new Response('END Invalid phone number', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    // Sanitize text input - only allow digits, asterisks, and hashes (valid USSD input)
    const sanitizedText = text.replace(/[^0-9*#]/g, '');

    console.log('USSD Request:', { sessionId, serviceCode, phoneNumber: phoneNumber.slice(0, 4) + '****' });

    // Get user's preferred language from profile based on phone number
    const preferredLang = await getUserLanguage(supabase, phoneNumber);
    console.log('User preferred language:', preferredLang);

    // Get or create session from database
    let session = await getSession(supabase, sessionId);
    
    if (!session) {
      session = await createSession(supabase, sessionId, phoneNumber);
    }
    
    // Parse user input (text comes as "1*2*3" for multiple selections)
    const userInput = sanitizedText.split('*').pop() || '';
    const inputPath = sanitizedText.split('*');

    let response = '';

    // Handle menu navigation based on input path
    if (sanitizedText === '') {
      // Main menu
      response = `CON ${getText('main_welcome', preferredLang)}

${getText('menu_1', preferredLang)}
${getText('menu_2', preferredLang)}
${getText('menu_3', preferredLang)}
${getText('menu_4', preferredLang)}
${getText('menu_5', preferredLang)}`;
      await updateSession(supabase, sessionId, 'main', {}, '');
      
    } else if (inputPath[0] === '1') {
      // Ask Farming Question flow
      if (inputPath.length === 1) {
        response = `CON ${getText('farming_topic_prompt', preferredLang)}

${getText('topic_1', preferredLang)}
${getText('topic_2', preferredLang)}
${getText('topic_3', preferredLang)}
${getText('topic_4', preferredLang)}
${getText('topic_5', preferredLang)}
${getText('back_to_menu', preferredLang)}`;
        await updateSession(supabase, sessionId, 'farming_topic', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON ${getText('main_welcome', preferredLang)}

${getText('menu_1', preferredLang)}
${getText('menu_2', preferredLang)}
${getText('menu_3', preferredLang)}
${getText('menu_4', preferredLang)}
${getText('menu_5', preferredLang)}`;
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
          
          // Provide AI-generated tip in user's language
          const tips = await getAITip(topic, preferredLang);
          response = `END ${topic}:

${tips}

${getText('dial_more', preferredLang)}`;
          await updateSession(supabase, sessionId, 'farming_result', { topic }, userInput);
        }
      }
      
    } else if (inputPath[0] === '2') {
      // Weather Forecast
      response = `END ${getText('weather_title', preferredLang)}

${getText('weather_today', preferredLang)}
Humidity: 89%
Rain chance: 83%

${getText('farming_tip', preferredLang)}

${getText('dial_options', preferredLang)}`;
      await updateSession(supabase, sessionId, 'weather', {}, userInput);
      
    } else if (inputPath[0] === '3') {
      // Pest Identification Tips
      if (inputPath.length === 1) {
        response = `CON ${getText('select_crop', preferredLang)}

${getText('crop_1', preferredLang)}
${getText('crop_2', preferredLang)}
${getText('crop_3', preferredLang)}
${getText('crop_4', preferredLang)}
${getText('crop_5', preferredLang)}
${getText('back_to_menu', preferredLang)}`;
        await updateSession(supabase, sessionId, 'pest_select', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON ${getText('main_welcome', preferredLang)}

${getText('menu_1', preferredLang)}
${getText('menu_2', preferredLang)}
${getText('menu_3', preferredLang)}
${getText('menu_4', preferredLang)}
${getText('menu_5', preferredLang)}`;
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
          const pestTips = await getPestTips(crop, preferredLang);
          response = `END ${crop}:

${pestTips}

${getText('use_app_scanner', preferredLang)}

${getText('dial_options', preferredLang)}`;
          await updateSession(supabase, sessionId, 'pest_result', { crop }, userInput);
        }
      }
      
    } else if (inputPath[0] === '4') {
      // Crop Planting Guide
      if (inputPath.length === 1) {
        response = `CON ${getText('select_season', preferredLang)}

${getText('season_1', preferredLang)}
${getText('season_2', preferredLang)}
${getText('season_3', preferredLang)}
${getText('season_4', preferredLang)}
${getText('back_to_menu', preferredLang)}`;
        await updateSession(supabase, sessionId, 'planting_select', session.context, userInput);
        
      } else if (inputPath.length === 2) {
        if (userInput === '0') {
          response = `CON ${getText('main_welcome', preferredLang)}

${getText('menu_1', preferredLang)}
${getText('menu_2', preferredLang)}
${getText('menu_3', preferredLang)}
${getText('menu_4', preferredLang)}
${getText('menu_5', preferredLang)}`;
          await updateSession(supabase, sessionId, 'main', {}, userInput);
        } else {
          const seasons: Record<string, { name: string; crops: string }> = {
            '1': { name: 'Summer (Jan-Mar)', crops: 'Maize, Beans, Pumpkins, Watermelons' },
            '2': { name: 'Autumn (Apr-Jun)', crops: 'Cabbage, Spinach, Onions, Carrots' },
            '3': { name: 'Winter (Jul-Sep)', crops: 'Peas, Lettuce, Beetroot, Garlic' },
            '4': { name: 'Spring (Oct-Dec)', crops: 'Tomatoes, Peppers, Potatoes, Sweet Potato' }
          };
          const season = seasons[userInput] || seasons['1'];
          response = `END ${season.name}:

${getText('best_crops', preferredLang)}
${season.crops}

${getText('planting_tips', preferredLang)}

${getText('dial_options', preferredLang)}`;
          await updateSession(supabase, sessionId, 'planting_result', { season: season.name }, userInput);
        }
      }
      
    } else if (inputPath[0] === '5') {
      // Contact Extension Officer
      response = `END ${getText('extension_title', preferredLang)}

Eswatini Agricultural Office
Phone: +268 2404 2731

${getText('regional_offices', preferredLang)}
Hhohho: +268 2404 6321
Manzini: +268 2505 2841
Lubombo: +268 2303 3241
Shiselweni: +268 2207 1841

${getText('dial_options', preferredLang)}`;
      await updateSession(supabase, sessionId, 'contact', {}, userInput);
      
    } else {
      // Invalid input
      response = `CON ${getText('invalid_option', preferredLang)}

${getText('menu_1', preferredLang)}
${getText('menu_2', preferredLang)}
${getText('menu_3', preferredLang)}
${getText('menu_4', preferredLang)}
${getText('menu_5', preferredLang)}`;
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

// Get user's preferred language from profile
async function getUserLanguage(supabase: any, phoneNumber: string): Promise<string> {
  try {
    // Normalize phone number (remove + prefix for matching)
    const normalizedPhone = phoneNumber.replace(/^\+/, '');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_language')
      .or(`phone_number.eq.${phoneNumber},phone_number.eq.${normalizedPhone},phone_number.eq.+${normalizedPhone}`)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user language:', error);
      return 'en';
    }

    return data?.preferred_language || 'en';
  } catch (error) {
    console.error('Error in getUserLanguage:', error);
    return 'en';
  }
}

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

// Helper function to get AI farming tips in user's language
async function getAITip(topic: string, lang: string): Promise<string> {
  try {
    const LOVABLE_API_KEY_LOV = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_KEY = Deno.env.get('Gemini');
    const USE_LOVABLE = !!LOVABLE_API_KEY_LOV;
    const LOVABLE_API_KEY = LOVABLE_API_KEY_LOV || GEMINI_KEY;
    const AI_URL = USE_LOVABLE ? 'https://ai.gateway.lovable.dev/v1/chat/completions' : AI_URL;
    const AI_MODEL_PREFIX = USE_LOVABLE ? 'google/' : '';
    if (!LOVABLE_API_KEY) {
      return getStaticTip(topic, lang);
    }

    const languageName = languageNames[lang] || 'English';

    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `${AI_MODEL_PREFIX}gemini-2.5-flash`,
        messages: [
          {
            role: 'system',
            content: `You are a farming assistant. Give ONE brief practical tip (max 160 characters) about the topic. No asterisks or markdown. Plain text only. RESPOND IN ${languageName} LANGUAGE.`
          },
          {
            role: 'user',
            content: `Give a brief tip about ${topic} for farmers in Eswatini. Respond in ${languageName}.`
          }
        ],
      }),
    });

    if (!response.ok) {
      return getStaticTip(topic, lang);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content || getStaticTip(topic, lang);
    // Ensure no asterisks and limit length for USSD
    return tip.replace(/\*+/g, '').substring(0, 160);
    
  } catch (error) {
    console.error('AI Tip Error:', error);
    return getStaticTip(topic, lang);
  }
}

function getStaticTip(topic: string, lang: string): string {
  const tips: Record<string, Record<string, string>> = {
    'Crop Diseases': {
      en: 'Rotate crops yearly to prevent soil-borne diseases. Remove infected plants immediately to stop spread.',
      ss: 'Jikisa titjalo njalo ngemnyaka kuvikela tifo. Susa titjalo letinesifo masinyane.',
      fr: 'Faites la rotation des cultures pour prévenir les maladies. Retirez les plantes infectées immédiatement.',
      de: 'Wechseln Sie die Kulturen jährlich, um Krankheiten zu verhindern. Entfernen Sie infizierte Pflanzen sofort.',
      es: 'Rote los cultivos anualmente para prevenir enfermedades. Retire las plantas infectadas inmediatamente.',
      pt: 'Faça rotação de culturas anualmente para prevenir doenças. Remova plantas infectadas imediatamente.'
    },
    'Soil Management': {
      en: 'Test soil pH before planting. Most crops prefer pH 6.0-7.0. Add lime for acidic soils.',
      ss: 'Hlola umhlaba ngaphambi kwekuhlanyela. Titjalo letinyenti titsandza pH 6.0-7.0.',
      fr: 'Testez le pH du sol avant de planter. La plupart des cultures préfèrent un pH de 6,0 à 7,0.',
      de: 'Testen Sie den Boden-pH vor dem Pflanzen. Die meisten Kulturen bevorzugen pH 6,0-7,0.',
      es: 'Pruebe el pH del suelo antes de plantar. La mayoría de los cultivos prefieren pH 6.0-7.0.',
      pt: 'Teste o pH do solo antes de plantar. A maioria das culturas prefere pH 6.0-7.0.'
    },
    'Irrigation Tips': {
      en: 'Water early morning to reduce evaporation. Check soil moisture 2 inches deep before watering.',
      ss: 'Nisela ekuseni kunciphisa kukushisa. Hlola buswakamo bemhlaba ngaphambi kwekunisela.',
      fr: 'Arrosez tôt le matin pour réduire l\'évaporation. Vérifiez l\'humidité du sol avant d\'arroser.',
      de: 'Bewässern Sie früh morgens, um die Verdunstung zu reduzieren.',
      es: 'Riegue temprano en la mañana para reducir la evaporación.',
      pt: 'Regue de manhã cedo para reduzir a evaporação.'
    },
    'Pest Control': {
      en: 'Inspect crops weekly. Use neem oil spray as natural pest deterrent. Remove weeds regularly.',
      ss: 'Hlola titjalo njalo ngeliviki. Sebentisa emafutsa e-neem kuvikela tilwane.',
      fr: 'Inspectez les cultures chaque semaine. Utilisez l\'huile de neem comme répulsif naturel.',
      de: 'Untersuchen Sie die Kulturen wöchentlich. Verwenden Sie Neemöl als natürliches Schädlingsabwehrmittel.',
      es: 'Inspeccione los cultivos semanalmente. Use aceite de neem como repelente natural.',
      pt: 'Inspecione as culturas semanalmente. Use óleo de neem como repelente natural.'
    },
    'Fertilizer Use': {
      en: 'Apply fertilizer based on soil test results. Split applications work better than single heavy dose.',
      ss: 'Faka umanyolo ngekwemiphumela yekulinga umhlaba. Kuhlukanisa kusebenta kahle.',
      fr: 'Appliquez l\'engrais selon les résultats des tests de sol. Les applications fractionnées fonctionnent mieux.',
      de: 'Düngen Sie basierend auf Bodentest. Geteilte Anwendungen funktionieren besser.',
      es: 'Aplique fertilizante según los resultados de las pruebas de suelo.',
      pt: 'Aplique fertilizante com base nos resultados do teste de solo.'
    }
  };
  
  const topicTips = tips[topic];
  if (!topicTips) {
    return lang === 'ss' ? 'Chumana ne-extension officer yakho kutfola lusito.' : 'Contact your local extension officer for personalized advice.';
  }
  return topicTips[lang] || topicTips['en'];
}

async function getPestTips(crop: string, lang: string): Promise<string> {
  const tips: Record<string, Record<string, string>> = {
    'Maize/Corn': {
      en: 'Watch for Fall Armyworm. Check leaves for holes and frass. Apply Bt spray if detected early.',
      ss: 'Buka i-Fall Armyworm. Hlola emacembe ngetimbobo. Faka i-Bt spray uma itfolakele masinyane.',
      fr: 'Surveillez la chenille légionnaire. Vérifiez les feuilles pour les trous. Appliquez Bt si détecté tôt.',
      de: 'Achten Sie auf den Herbst-Heerwurm. Überprüfen Sie Blätter auf Löcher. Verwenden Sie Bt-Spray bei früher Erkennung.',
      es: 'Esté atento al gusano cogollero. Revise las hojas para agujeros. Aplique Bt si se detecta temprano.',
      pt: 'Fique atento à lagarta-do-cartucho. Verifique as folhas para buracos. Aplique Bt se detectado cedo.'
    },
    'Vegetables': {
      en: 'Aphids are common. Use soapy water spray. Plant marigolds nearby to repel pests naturally.',
      ss: 'Ema-aphid avamile. Sebentisa emanti e-sopo. Hlanyela marigolds edvute kuvikela tilwane.',
      fr: 'Les pucerons sont courants. Utilisez un spray d\'eau savonneuse. Plantez des soucis pour repousser les ravageurs.',
      de: 'Blattläuse sind häufig. Verwenden Sie Seifenwasser-Spray. Pflanzen Sie Ringelblumen in der Nähe.',
      es: 'Los pulgones son comunes. Use spray de agua jabonosa. Plante maravillas cerca para repeler plagas.',
      pt: 'Pulgões são comuns. Use spray de água com sabão. Plante cravos-de-defunto para repelir pragas.'
    },
    'Fruits': {
      en: 'Fruit flies damage ripening fruit. Use traps with vinegar bait. Harvest before fully ripe.',
      ss: 'Timbungu titona titselo letivutfwako. Sebentisa tingibe ne-vinegar. Vuna ngaphambi kwekuvutfwa.',
      fr: 'Les mouches des fruits endommagent les fruits mûrs. Utilisez des pièges avec du vinaigre.',
      de: 'Fruchtfliegen beschädigen reifende Früchte. Verwenden Sie Fallen mit Essigköder.',
      es: 'Las moscas de la fruta dañan la fruta madura. Use trampas con vinagre.',
      pt: 'Moscas-das-frutas danificam frutas maduras. Use armadilhas com vinagre.'
    },
    'Sugarcane': {
      en: 'Stalk borers cause major damage. Plant resistant varieties. Remove and burn infected stalks.',
      ss: 'Tibungu tibanga umonakalo lomkhulu. Hlanyela tinhlobo letimela. Susa ushise letinesifo.',
      fr: 'Les foreurs de tiges causent des dommages majeurs. Plantez des variétés résistantes.',
      de: 'Stängelbohrer verursachen große Schäden. Pflanzen Sie resistente Sorten.',
      es: 'Los barrenadores causan daños mayores. Plante variedades resistentes.',
      pt: 'Brocas causam danos graves. Plante variedades resistentes.'
    },
    'Cotton': {
      en: 'Bollworms are the main threat. Scout fields regularly. Use pheromone traps for monitoring.',
      ss: 'Tibungu tingubudisi lobakhulu. Hlola emasimi njalo. Sebentisa tingibe te-pheromone.',
      fr: 'Les vers de la capsule sont la principale menace. Inspectez les champs régulièrement.',
      de: 'Kapselwürmer sind die Hauptbedrohung. Kontrollieren Sie die Felder regelmäßig.',
      es: 'Los gusanos del algodón son la principal amenaza. Inspeccione los campos regularmente.',
      pt: 'Lagartas são a principal ameaça. Inspecione os campos regularmente.'
    }
  };
  
  const cropTips = tips[crop];
  if (!cropTips) {
    return lang === 'ss' ? 'Kuhlola emasimi njalo kubalulekile. Susa titjalo letinesifo.' : 'Regular field inspection is key. Remove infected plants.';
  }
  return cropTips[lang] || cropTips['en'];
}
