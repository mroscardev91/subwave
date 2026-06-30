# LÉEME — cómo correr y desplegar Subwave

Guía corta en español para montar **Subwave** desde el repositorio. La versión en
inglés está en **[README.md](./README.md)**.

> ▶ Demo en vivo: **[subwave.pro](https://subwave.pro)**

## Qué es

App web de subtítulos con IA que corre **100% en el navegador**: transcribe con
Whisper, editas en una timeline (con forma de onda), traduces con OPUS-MT y
exportas `.srt`, `.vtt`, `.ass` o un vídeo con los subtítulos quemados. **Sin
backend, sin subidas, sin API keys, sin cuentas.** Tu archivo nunca sale de tu
equipo. Construida con [Claude Code](https://claude.com/claude-code) siguiendo
los hitos de [PROMPT.md](./PROMPT.md); el proceso está versionado en el repo.

## 0) Qué necesitas

- **Node.js ≥ 22.12** → comprueba con `node -v`.
- **pnpm** → `npm install -g pnpm` (o `corepack enable`).
- **Git**, y para desplegar gratis una cuenta de **Vercel** (o Cloudflare Pages / Netlify / GitHub Pages).

## 1) Clona e instala

```sh
git clone https://github.com/mroscardev91/subwave.git
cd subwave
pnpm install
```

El `postinstall`/`prebuild` copia el core de FFmpeg WASM a `public/ffmpeg/` (se
sirve desde el mismo origen, no de un CDN).

## 2) Arranca en local

```sh
pnpm dev          # http://localhost:4321
pnpm build        # build estático → ./dist
pnpm preview      # previsualiza el build
```

Abre `http://localhost:4321`: verás la landing de papel con el logo de onda.

**Comprobación de privacidad:** sube un vídeo y transcríbelo con las DevTools en
la pestaña **Network** abierta. No debe haber **ninguna subida** de tu archivo.
Lo único que se descarga (la primera vez) son los modelos de IA desde Hugging
Face, que quedan cacheados.

## 3) Despliega gratis en Vercel

**Por web (recomendado):**
1. `vercel.com` → *Add New… → Project* → importa tu fork del repo.
2. Vercel detecta Astro solo. Deja todo por defecto y pulsa **Deploy**.

**Por terminal:**
```sh
npx vercel        # primer deploy (te guía)
npx vercel --prod # publicar a producción
```

El dominio de producción está fijado a `https://subwave.pro` en
`astro.config.mjs` (`site:`), lo que alimenta canonical, hreflang, OG y el
sitemap. Si despliegas en otra URL, cámbialo ahí, y conecta tu dominio en Vercel
en *Settings → Domains*. El mismo build estático vale también para Cloudflare
Pages, Netlify o GitHub Pages.

## Estructura

```
src/
├── components/   Home, App shell + etapas Upload/Config/Editor, Footer
├── i18n/         locales.ts · ui.ts (textos en/es)
├── layouts/      Layout.astro (head, hreflang, OG, fuentes, i18n runtime)
├── pages/        index.astro (en) · es/index.astro (es)
├── scripts/      app.ts, stageManager.ts (+ stages, workers, media, export)
└── styles/       global.css (tokens @theme)
```

## Licencia

[MIT](./LICENSE) © mroscardev
