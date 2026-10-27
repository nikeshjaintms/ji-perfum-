import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    try {
      localStorage.setItem('jj_theme', 'light');
    } catch {}
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark');
    root.classList.add('light');
    body.classList.remove('dark');
    body.classList.add('light');
    body.style.backgroundColor = '#F8F9FA';
    body.style.color = '#0F172A';
  }, []);

  const isLight = true;
  const isDark = false;
  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isLight: true,
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
