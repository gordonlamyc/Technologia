// ====================================================================
// vite.config.js — Vite Build Tool Configuration
// This file controls how Vite bundles and serves the app.
// ====================================================================

// Import the helper function that gives us type-safe config with IntelliSense
import { defineConfig } from 'vite'

// Import the React plugin so Vite can understand JSX and Fast Refresh during dev
import react from '@vitejs/plugin-react'

// Import the Tailwind CSS Vite plugin (processes Tailwind directly in Vite pipeline)
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),       // Enables React JSX transform + HMR (Hot Module Replacement)
    tailwindcss(), // Enables Tailwind CSS processing via Vite's build pipeline
  ],

  server: {
    // ----------------------------------------------------------------
    // Dev Server Proxy — Avoids CORS errors when calling external APIs
    // ----------------------------------------------------------------
    proxy: {
      // Any request to /api/ilmu/* will be forwarded to https://api.ilmu.ai/*
      // This way the browser talks to localhost (no CORS), and Vite relays it.
      '/api/ilmu': {
        target: 'https://api.ilmu.ai', // The real API server
        changeOrigin: true,            // Changes the Host header to match the target (required by most APIs)
        rewrite: (path) => path.replace(/^\/api\/ilmu/, ''), // Strips "/api/ilmu" prefix before forwarding
        // e.g.  /api/ilmu/v1/chat  →  https://api.ilmu.ai/v1/chat
      },
    },
  },
})
