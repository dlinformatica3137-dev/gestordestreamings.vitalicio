import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  isFullscreen: false,
  toggleFullscreen: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gestor_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const rootContainer = document.getElementById('root');

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      if (body) {
        body.classList.add('dark');
        body.setAttribute('data-theme', 'dark');
      }
      if (rootContainer) {
        rootContainer.classList.add('dark');
      }
      try {
        localStorage.setItem('gestor_theme', 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
      if (body) {
        body.classList.remove('dark');
        body.removeAttribute('data-theme');
      }
      if (rootContainer) {
        rootContainer.classList.remove('dark');
      }
      try {
        localStorage.setItem('gestor_theme', 'light');
      } catch {}
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, isFullscreen, toggleFullscreen }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
