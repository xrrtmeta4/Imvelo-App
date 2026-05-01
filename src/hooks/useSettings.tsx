import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  dataSaver: boolean;
  setDataSaver: (enabled: boolean) => void;
  brightness: number;
  setBrightness: (level: number) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  fontSize: 16,
  setFontSize: () => {},
  dataSaver: false,
  setDataSaver: () => {},
  brightness: 100,
  setBrightness: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('imvelo_font_size');
    return saved ? parseInt(saved, 10) : 16;
  });
  const [dataSaver, setDataSaverState] = useState(() => {
    return localStorage.getItem('imvelo_data_saver') === 'true';
  });
  const [brightness, setBrightnessState] = useState(() => {
    const saved = localStorage.getItem('imvelo_brightness');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('imvelo_font_size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('imvelo_data_saver', String(dataSaver));
  }, [dataSaver]);

  useEffect(() => {
    document.documentElement.style.filter = brightness < 100 ? `brightness(${brightness / 100})` : '';
    localStorage.setItem('imvelo_brightness', String(brightness));
  }, [brightness]);

  const setFontSize = (size: number) => setFontSizeState(Math.max(12, Math.min(24, size)));
  const setDataSaver = (enabled: boolean) => setDataSaverState(enabled);
  const setBrightness = (level: number) => setBrightnessState(Math.max(30, Math.min(100, level)));

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, dataSaver, setDataSaver, brightness, setBrightness }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);