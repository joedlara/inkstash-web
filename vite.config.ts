import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 so the dev server is reachable from LAN devices (your
    // phone) and from ngrok tunnels.
    host: true,
    // Allow ngrok's free-tier and paid-tier domains so the dev server
    // doesn't reject the tunneled request with "Blocked request".
    // The leading dot makes it a wildcard suffix match.
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app',
      '.ngrok.io',
    ],
  },
})
