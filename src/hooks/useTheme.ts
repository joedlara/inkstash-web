// hooks/useTheme.ts
import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

export const useTheme = () => {
  // Initialize with the stored theme or default to 'auto'
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'auto';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Function to get the actual theme to apply
    const getResolvedTheme = (currentTheme: Theme): 'light' | 'dark' => {
      if (currentTheme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return currentTheme;
    };

    // Apply theme to document
    const applyTheme = (themeToApply: 'light' | 'dark') => {
      document.documentElement.setAttribute('data-theme', themeToApply);
      setResolvedTheme(themeToApply);
    };

    // Initial theme application
    const initialResolvedTheme = getResolvedTheme(theme);
    applyTheme(initialResolvedTheme);

    // Listen for system theme changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        const newResolvedTheme = getResolvedTheme(theme);
        applyTheme(newResolvedTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const setAndStoreTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setAndStoreTheme,
    toggleTheme: () => {
      const nextTheme: Theme =
        theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
      setAndStoreTheme(nextTheme);
    },
  };
};
