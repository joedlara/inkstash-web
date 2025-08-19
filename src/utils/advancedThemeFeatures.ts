// utils/advancedThemeFeatures.ts
// Optional advanced features you can add

import { themeManager } from './themeManager';

// 1. Theme synchronization across browser tabs
export const syncThemeAcrossTabs = () => {
  window.addEventListener('storage', e => {
    if (e.key === 'theme' && e.newValue) {
      themeManager.setTheme(e.newValue as any);
    }
  });
};

// 2. Automatic theme switching based on time of day
export const enableAutoThemeByTime = () => {
  const updateThemeByTime = () => {
    const hour = new Date().getHours();
    const isDayTime = hour >= 6 && hour < 18;

    if (themeManager.getTheme() === 'auto') {
      // Override auto behavior with time-based switching
      const timeBasedTheme = isDayTime ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', timeBasedTheme);
    }
  };

  // Check every hour
  setInterval(updateThemeByTime, 60 * 60 * 1000);
  updateThemeByTime(); // Initial check
};

// 3. Theme preloading for smooth transitions
export const preloadThemeAssets = () => {
  // Preload any theme-specific images or assets
  const themes = ['light', 'dark'];

  themes.forEach(theme => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/assets/theme-${theme}.css`; // If you have theme-specific assets
    document.head.appendChild(link);
  });
};

// 4. Theme preference detection from user's browsing history
export const detectPreferredTheme = (): 'light' | 'dark' | 'auto' => {
  // Check if user has visited during different times
  const visitHistory = JSON.parse(
    localStorage.getItem('visit_history') || '[]'
  );
  const now = new Date().getHours();

  visitHistory.push(now);
  localStorage.setItem(
    'visit_history',
    JSON.stringify(visitHistory.slice(-10))
  ); // Keep last 10 visits

  const dayVisits = visitHistory.filter(
    (hour: number) => hour >= 6 && hour < 18
  ).length;
  const nightVisits = visitHistory.filter(
    (hour: number) => hour < 6 || hour >= 18
  ).length;

  if (dayVisits > nightVisits * 2) return 'light';
  if (nightVisits > dayVisits * 2) return 'dark';
  return 'auto';
};

// 5. Theme analytics (for understanding user preferences)
export const trackThemeUsage = (theme: string) => {
  // Only track if user consents to analytics
  if (localStorage.getItem('analytics_consent') === 'true') {
    const usage = JSON.parse(localStorage.getItem('theme_usage') || '{}');
    usage[theme] = (usage[theme] || 0) + 1;
    usage.lastChanged = new Date().toISOString();
    localStorage.setItem('theme_usage', JSON.stringify(usage));
  }
};

// 6. Smooth theme transition animations
export const enableThemeTransitions = () => {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      transition: 
        background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    /* Disable transitions during page load to prevent flashing */
    .theme-transitioning * {
      transition: none !important;
    }
  `;
  document.head.appendChild(style);

  // Remove transition disable class after page load
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('theme-transitioning');
  });
};

// 7. Theme-aware meta tags for better mobile experience
export const updateThemeMetaTags = (theme: 'light' | 'dark') => {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const statusBarStyle = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );

  if (theme === 'dark') {
    metaThemeColor?.setAttribute('content', '#1e293b');
    statusBarStyle?.setAttribute('content', 'black-translucent');
  } else {
    metaThemeColor?.setAttribute('content', '#ffffff');
    statusBarStyle?.setAttribute('content', 'default');
  }
};

// Initialize advanced features
export const initAdvancedThemeFeatures = () => {
  syncThemeAcrossTabs();
  enableThemeTransitions();

  // Listen for theme changes to update meta tags
  themeManager.onThemeChange((_, resolvedTheme) => {
    updateThemeMetaTags(resolvedTheme);
    trackThemeUsage(resolvedTheme);
  });
};
