---
name: astro-static-i18n
description: Use cuando configures el proyecto Astro 6 como sitio ESTÁTICO (output static, sin adapter) desplegable gratis en Vercel/Cloudflare Pages/Netlify/GitHub Pages, con Tailwind v4 vía Vite, i18n nativo (en/es), redirección de idioma en cliente y cabeceras por vercel.json. Cubre astro.config.mjs, vercel.json, el patrón window.__I18N__, hreflang y el alias @. Trigger: astro.config.mjs, vercel.json, output static, i18n, hreflang, locales, prefixDefaultLocale, deploy Vercel.
---

# Astro 6 estático + i18n + Vercel

La app corre 100% en el navegador, así que el sitio es **estático**: no necesitas servidor ni
adapter. El mismo build sirve para Vercel, Cloudflare Pages, Netlify o GitHub Pages.

> En este proyecto, `astro.config.mjs` y `vercel.json` **ya vienen hechos** en la raíz. No los
> regeneres; respétalos. Esta skill explica por qué son así y cómo encaja el i18n.

## astro.config.mjs (estático)

```js
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://subwave.app",          // cámbialo a tu URL final (subdominio o dominio)
  output: "static",                       // sin adapter, sin servidor
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
```

No hay `@astrojs/cloudflare`, ni `wrangler`, ni `src/worker.ts`. Si esos archivos aparecen,
sobran: bórralos.

## Redirección de idioma (en cliente, porque es estático)

El sitio estático no tiene middleware de servidor. Detecta el idioma en la home con un script
inline y redirige una sola vez, recordando la elección en `localStorage`:

```astro
<script is:inline>
  if (location.pathname === "/" && !localStorage.getItem("locale")
      && (navigator.language || "").toLowerCase().startsWith("es")) {
    location.replace("/es/");
  }
</script>
```

Cuando el usuario cambie idioma con el selector, guarda `localStorage.setItem("locale", code)`
y navega a la ruta correspondiente. El SEO no depende de esto: lo cubre el `hreflang`.

## Cabeceras: vercel.json (NO public/_headers en Vercel)

Vercel ignora `public/_headers`. Las cabeceras van en `vercel.json` (ya incluido):

```jsonc
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }
    ]},
    { "source": "/_astro/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]}
  ]
}
```

Vercel ya da HTTPS + HSTS. **No añadas COOP/COEP** salvo que uses el FFmpeg multi-thread:
COEP `require-corp` rompería la descarga de modelos desde Hugging Face. Con el FFmpeg
single-thread que usa este proyecto, no hace falta. (Si despliegas en Cloudflare Pages o Netlify,
ahí sí se usa `public/_headers` con el mismo contenido.)

## i18n: dos niveles de strings

- **Build-time** (`t.<grupo>`): se usan dentro de componentes `.astro`. Coste cliente cero.
- **Runtime** (`t.client`): se serializan por página y `app.ts` las lee. Inyecta solo el idioma
  activo para que no viaje más de una lengua por página:

```astro
---
import { ui } from "@/i18n/ui";
const lang = Astro.currentLocale ?? "en";
const t = ui[lang];
---
<script is:inline define:vars={{ I18N: t.client, LANG: lang }}>
  window.__I18N__ = I18N;
  window.__LANG__ = LANG;
</script>
```

`src/i18n/locales.ts` exporta `defaultLang`, `languages` (mapa código→nombre) y `type Lang`.
`src/i18n/ui.ts` exporta `ui` con un bloque por idioma que espeja las mismas claves.

## Layout.astro — SEO/hreflang + assets de marca

- `<link rel="canonical">` absoluto.
- `<link rel="alternate" hreflang="en|es|x-default">` por locale.
- Favicon y OG ya están en `public/`: `favicon.svg`, `apple-touch-icon.png`, `og.png`.
  Usa `og.png` (1200×630) en `og:image` (las plataformas necesitan PNG, no SVG).
- Fuentes: importa Instrument Serif + Outfit + JetBrains Mono (ver BRANDING.md).
- `lang={lang}` en `<html>`.

## Añadir un idioma

1. Añade el código a `i18n.locales` en `astro.config.mjs`.
2. Crea `src/pages/<code>/index.astro` (copia `es/index.astro`).
3. Añade el bloque `<code>: { ... }` en `src/i18n/ui.ts`.
4. Regístralo en `languages` dentro de `src/i18n/locales.ts`.
