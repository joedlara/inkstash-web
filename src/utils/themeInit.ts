(function initializeTheme() {
  try {
    const storedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'auto'
      | null;
    const theme = storedTheme || 'auto';

    let resolvedTheme: 'light' | 'dark';

    if (theme === 'auto') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      resolvedTheme = theme;
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);

    // Also add class for any legacy CSS that might depend on it
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${resolvedTheme}`);
  } catch (error) {
    // Fallback to light theme if there's any error
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('theme-light');
  }
})();
