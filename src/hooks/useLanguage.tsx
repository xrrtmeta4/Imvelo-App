import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
  en: {
    home: 'Home', scan: 'Scan', spray: 'Spray', ledger: 'Ledger', profile: 'Profile',
    weather: 'Weather', upgrade: 'Upgrade Plan', logout: 'Logout', save: 'Save Changes',
    myProfile: 'My Profile', myInfo: 'My Information', fullName: 'Full Name',
    phone: 'Phone Number', location: 'Location', language: 'Preferred Language',
    role: 'Role', cropMonitor: 'Crop Monitor', climateRisk: 'Climate Risk',
    aiHealthScan: 'AI health scan', volatilityEngine: 'Volatility engine',
    farmersBestFriend: "Farmer's Best Friend", choosePlan: 'Choose Your Plan',
    unlockTools: 'Unlock powerful farming tools', currentPlan: 'Current Plan',
    upgradeTo: 'Upgrade to', viewPlans: 'View Plans & Upgrade',
    bestPractices: 'Best Practices', extensionServices: 'Extension Services',
    managePlan: 'Manage Plan', premiumMember: 'Premium Member', freePlan: 'Free Plan',
    back: 'Back', signIn: 'Sign In', signUp: 'Create Account', email: 'Email',
    password: 'Password', country: 'Country', phoneRequired: 'Phone number is required',
    countryRequired: 'Country is required',
  },
  fr: {
    home: 'Accueil', scan: 'Scanner', spray: 'Pulvériser', ledger: 'Registre', profile: 'Profil',
    weather: 'Météo', upgrade: 'Passer au plan supérieur', logout: 'Déconnexion', save: 'Enregistrer',
    myProfile: 'Mon Profil', myInfo: 'Mes Informations', fullName: 'Nom complet',
    phone: 'Numéro de téléphone', location: 'Emplacement', language: 'Langue préférée',
    role: 'Rôle', cropMonitor: 'Suivi cultures', climateRisk: 'Risque climatique',
    aiHealthScan: 'Scan IA santé', volatilityEngine: 'Moteur de volatilité',
    farmersBestFriend: "Meilleur ami du fermier", choosePlan: 'Choisissez votre plan',
    unlockTools: 'Débloquez des outils agricoles puissants', currentPlan: 'Plan actuel',
    upgradeTo: 'Passer à', viewPlans: 'Voir les plans',
    bestPractices: 'Bonnes pratiques', extensionServices: "Services d'extension",
    managePlan: 'Gérer le plan', premiumMember: 'Membre Premium', freePlan: 'Plan gratuit',
    back: 'Retour', signIn: 'Se connecter', signUp: 'Créer un compte', email: 'E-mail',
    password: 'Mot de passe', country: 'Pays', phoneRequired: 'Le numéro de téléphone est requis',
    countryRequired: 'Le pays est requis',
  },
  es: {
    home: 'Inicio', scan: 'Escanear', spray: 'Pulverizar', ledger: 'Libro', profile: 'Perfil',
    weather: 'Clima', upgrade: 'Mejorar plan', logout: 'Cerrar sesión', save: 'Guardar cambios',
    myProfile: 'Mi Perfil', myInfo: 'Mi Información', fullName: 'Nombre completo',
    phone: 'Teléfono', location: 'Ubicación', language: 'Idioma preferido',
    role: 'Rol', cropMonitor: 'Monitor cultivos', climateRisk: 'Riesgo climático',
    aiHealthScan: 'Escaneo IA', volatilityEngine: 'Motor de volatilidad',
    farmersBestFriend: 'Mejor amigo del agricultor', choosePlan: 'Elige tu plan',
    unlockTools: 'Desbloquea herramientas agrícolas', currentPlan: 'Plan actual',
    upgradeTo: 'Mejorar a', viewPlans: 'Ver planes',
    bestPractices: 'Buenas prácticas', extensionServices: 'Servicios de extensión',
    managePlan: 'Gestionar plan', premiumMember: 'Miembro Premium', freePlan: 'Plan gratuito',
    back: 'Volver', signIn: 'Iniciar sesión', signUp: 'Crear cuenta', email: 'Correo',
    password: 'Contraseña', country: 'País', phoneRequired: 'Se requiere teléfono',
    countryRequired: 'Se requiere país',
  },
  sw: {
    home: 'Nyumbani', scan: 'Changanua', spray: 'Nyunyizia', ledger: 'Daftari', profile: 'Wasifu',
    weather: 'Hali ya hewa', upgrade: 'Panda mpango', logout: 'Toka', save: 'Hifadhi mabadiliko',
    myProfile: 'Wasifu Wangu', myInfo: 'Taarifa Zangu', fullName: 'Jina kamili',
    phone: 'Nambari ya simu', location: 'Mahali', language: 'Lugha unayopendelea',
    role: 'Jukumu', cropMonitor: 'Ufuatiliaji mazao', climateRisk: 'Hatari ya hali ya hewa',
    aiHealthScan: 'Uchunguzi wa AI', volatilityEngine: 'Injini ya mabadiliko',
    farmersBestFriend: 'Rafiki bora wa mkulima', choosePlan: 'Chagua mpango wako',
    unlockTools: 'Fungua zana za kilimo', currentPlan: 'Mpango wa sasa',
    upgradeTo: 'Panda hadi', viewPlans: 'Tazama mipango',
    bestPractices: 'Mbinu bora', extensionServices: 'Huduma za ugani',
    managePlan: 'Simamia mpango', premiumMember: 'Mwanachama wa Premium', freePlan: 'Mpango wa bure',
    back: 'Rudi', signIn: 'Ingia', signUp: 'Jisajili', email: 'Barua pepe',
    password: 'Nywila', country: 'Nchi', phoneRequired: 'Nambari ya simu inahitajika',
    countryRequired: 'Nchi inahitajika',
  },
  ss: {
    home: 'Ekhaya', scan: 'Hlola', spray: 'Fafata', ledger: 'Incwadzi', profile: 'Umuntfu',
    weather: 'Simo yelitulu', upgrade: 'Khuphula licebo', logout: 'Phuma', save: 'Gcina kugucuka',
    myProfile: 'Umuntfu Wami', myInfo: 'Lwati Lwami', fullName: 'Ligama lephelele',
    phone: 'Inombolo yelucingo', location: 'Indzawo', language: 'Lulwimi lolukhetsako',
    role: 'Indzima', cropMonitor: 'Kubuka tilimo', climateRisk: 'Ingoti yelitulu',
    aiHealthScan: 'Kuhlola kwe-AI', volatilityEngine: 'Injini yekugucula',
    farmersBestFriend: 'Umngani lomkhulu wemlimi', choosePlan: 'Khetsa licebo lakho',
    unlockTools: 'Vula emathuluzi ekulima', currentPlan: 'Licebo lanyalo',
    upgradeTo: 'Khuphulela ku', viewPlans: 'Buka emacebo',
    bestPractices: 'Tindlela letinhle', extensionServices: 'Lusito lwekwandza',
    managePlan: 'Lawula licebo', premiumMember: 'Lilunga le-Premium', freePlan: 'Licebo lelimahhala',
    back: 'Buyela', signIn: 'Ngena', signUp: 'Bhalisa', email: 'I-imeyili',
    password: 'Liphasiwedi', country: 'Live', phoneRequired: 'Inombolo yelucingo iyadingeka',
    countryRequired: 'Live liyadingeka',
  },
};

interface LanguageContextType {
  lang: string;
  t: (key: string) => string;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem('imvelo_lang') || 'en');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.preferred_language) {
          setLangState(data.preferred_language);
          localStorage.setItem('imvelo_lang', data.preferred_language);
        }
      });
  }, [user]);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    localStorage.setItem('imvelo_lang', newLang);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
