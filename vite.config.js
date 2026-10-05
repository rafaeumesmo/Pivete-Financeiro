import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { APP_NAME, APP_TAGLINE } from "./src/config.js";

export default defineConfig({
  plugins: [
    react(),
    // Título da aba vem do mesmo APP_NAME do app (src/config.js).
    { name: "app-name-title", transformIndexHtml: (html) => html.replaceAll("%APP_NAME%", APP_NAME) },
    // PWA: manifest + service worker que pré-carrega o build (abre offline),
    // fonte inclusa. Chamadas ao Supabase não são cacheadas. Cada build gera
    // um precache com revisões novas; o registro e o aviso de "versão nova"
    // ficam em components/UpdatePrompt.jsx (registerType "prompt").
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "badge.png"],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME.split(" ")[0],
        description: APP_TAGLINE,
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        // Tema claro é o padrão (lib/theme.js); splash e barra seguem ele.
        background_color: "#F4F5F7",
        theme_color: "#F4F5F7",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});
