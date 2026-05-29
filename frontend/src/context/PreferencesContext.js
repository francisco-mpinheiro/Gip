import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // 'dark' ou 'light'
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'

  // Carregar preferências do localStorage e aplicar ao iniciar
  useEffect(() => {
    const savedTheme = localStorage.getItem('gip-theme') || 'dark';
    const savedFontSize = localStorage.getItem('gip-fontSize') || 'medium';
    setTheme(savedTheme);
    setFontSize(savedFontSize);
    applyPreferences(savedTheme, savedFontSize);
  }, []);

  // Função para aplicar as preferências no DOM
  const applyPreferences = (themeValue, fontSizeValue) => {
    const html = document.documentElement;

    // Aplicar tema usando data-theme attribute
    html.setAttribute('data-theme', themeValue);

    // Aplicar tamanho de fonte
    let fontSizeValue_ = '18px'; // medium (padrão)
    if (fontSizeValue === 'small') fontSizeValue_ = '16px';
    if (fontSizeValue === 'large') fontSizeValue_ = '20px';
    html.style.fontSize = fontSizeValue_;
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('gip-theme', newTheme);
    applyPreferences(newTheme, fontSize);
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('gip-fontSize', size);
    applyPreferences(theme, size);
  };

  return (
    <PreferencesContext.Provider value={{ theme, fontSize, toggleTheme, changeFontSize }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
