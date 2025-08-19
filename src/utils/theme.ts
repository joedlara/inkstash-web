// utils/theme.ts
// Simple theme management without React Context

export type Theme = 'light' | 'dark' | 'auto';

class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = 'auto';
  private listeners: Array<
    (theme: Theme, resolvedTheme: 'light' | 'dark') => void
  > = [];

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  constructor() {
    this.init();
  }

  private init() {
    // Get stored theme or default to auto
    const stored = localStorage.getItem('theme') as Theme;
    this.currentTheme = stored || 'auto';

    // Apply theme immediately
    this.applyTheme();

    // Listen for system theme changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme();
        }
      });
  }

  private getResolvedTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return this.currentTheme;
  }

  private applyTheme() {
    const resolvedTheme = this.getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolvedTheme);

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(this.currentTheme, resolvedTheme);
    });
  }

  public setTheme(theme: Theme) {
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme();
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  public getResolvedThemeValue(): 'light' | 'dark' {
    return this.getResolvedTheme();
  }

  public toggleTheme() {
    const nextTheme: Theme =
      this.currentTheme === 'light'
        ? 'dark'
        : this.currentTheme === 'dark'
          ? 'auto'
          : 'light';
    this.setTheme(nextTheme);
  }

  public onThemeChange(
    callback: (theme: Theme, resolvedTheme: 'light' | 'dark') => void
  ) {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
}

export const themeManager = ThemeManager.getInstance();
