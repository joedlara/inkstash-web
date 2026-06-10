// Allow side-effect CSS imports under tsc with noUncheckedSideEffectImports.
// Vite handles these at build time; this just teaches TS the module exists.
declare module '*.css';
