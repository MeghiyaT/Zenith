/**
 * Theme Context — light/dark mode toggle
 * Defaults to system preference, persists choice in sessionStorage
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = sessionStorage.getItem('stellar_send_theme');
    return stored || getSystemTheme();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    sessionStorage.setItem('stellar_send_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
