import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { APP_NAME } from "./src/config.js";

export default defineConfig({
  plugins: [
    react(),
    // Título da aba vem do mesmo APP_NAME do app (src/config.js).
    { name: "app-name-title", transformIndexHtml: (html) => html.replace("%APP_NAME%", APP_NAME) },
  ],
});
