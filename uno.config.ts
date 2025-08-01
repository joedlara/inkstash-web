// uno.config.ts
import { defineConfig, presetUno, presetAttributify, presetIcons } from "unocss"

export default defineConfig({
  presets: [
    presetUno(), // the “Tailwind-like” core
    presetAttributify(), // optional: use <div bg="blue-500" p="4"> syntax
    presetIcons(), // optional: <i-heroicons-outline:menu />
  ],
  rules: [
    // add any custom rules here
  ],
  theme: {
    colors: {
      primary: "#111111",
      accent: "#E31B23",
      light: "#F9F9F9",
      mid: "#D1D5DB",
    },
  },
})
