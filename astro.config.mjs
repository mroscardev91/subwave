// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// Subwave — build 100% estático. La app corre en el navegador (IA, FFmpeg y
// export con WebCodecs), así que no necesitas servidor: despliega gratis en
// Vercel, Cloudflare Pages, Netlify o GitHub Pages indistintamente.
export default defineConfig({
  // Cambia esto a tu URL final (subdominio gratis o dominio propio).
  site: "https://subwave.pro",
  output: "static",
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false }, // en → /   ·   es → /es/
  },
  integrations: [
    sitemap({ i18n: { defaultLocale: "en", locales: { en: "en", es: "es" } } }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { exclude: ["mediabunny"] },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    worker: { format: "es" },
  },
});
