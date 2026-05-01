import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { translations } from '@/lib/translations';

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
