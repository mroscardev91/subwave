# Prompt maestro — Subwave

> Pega **todo** este contenido como primer mensaje en Claude Code, dentro de la carpeta donde
> ya están `CLAUDE.md`, `BRANDING.md`, `astro.config.mjs`, `vercel.json`, `public/` y `.claude/`.
> La marca ya está decidida (Subwave); no hace falta que cambies nada para empezar.

---

Vas a construir, desde cero, **Subwave**: una aplicación web de generación y edición de
subtítulos que funciona **100% en el navegador**. Sin backend, sin subidas de archivos, sin API
keys. El usuario sube un vídeo o audio, una IA local lo transcribe, lo edita en una línea de
tiempo y exporta `.srt` o un vídeo con los subtítulos quemados.

Es una app de subtítulos con **identidad visual propia**
(ver `BRANDING.md`). El sitio es **estático** y se desplegará gratis en **Vercel**.

## Marca (ya definida — está en BRANDING.md)

```
APP_NAME   = "Subwave"
DOMAIN     = "subwave.pro"   # ajusta a tu URL real (p. ej. subwave-app.vercel.app)
TAGLINE_ES = "Del audio al texto. Subtítulos con IA en tu navegador, sin que tu vídeo salga de tu equipo."
TAGLINE_EN = "From sound to subtitles. AI captions in your browser — your video never leaves your device."
VIBE       = "Landing de papel editorial (Instrument Serif + Outfit, textura sutil) y editor oscuro 'agua profunda' con un único acento aqua eléctrico (#2DE0CE). El logo es una onda con su sub-onda debajo; motivo de onda/waveform por toda la UI."
```

**Importante sobre la marca:**
- Copia el bloque `@theme` **exacto** de `BRANDING.md` a `src/styles/global.css`. No inventes colores.
- El favicon y el OG **ya están** en `public/` (`favicon.svg`, `apple-touch-icon.png`, `og.svg`, `og.png`). Cablea el `<head>` para usarlos; no los regeneres.
- Dos modos: `<body class="landing">` (papel) en marketing y `<body class="editor">` (agua profunda) en el editor.
- Fuentes: Instrument Serif (display) · Outfit (UI) · JetBrains Mono (timecodes).

## Stack (fíjalo exactamente)

| Capa | Tecnología |
| --- | --- |
| Framework | **Astro 6** con `output: "static"` (sitio estático, **sin adapter**) |
| Deploy | **Vercel** (gratis). El build estático también vale para Cloudflare Pages / Netlify / GitHub Pages |
| Estilos | **Tailwind CSS 4** vía `@tailwindcss/vite` (sin config; todo en `@theme`) |
| ASR (voz→texto) | **`@huggingface/transformers`** (transformers.js) con Whisper |
| Traducción | transformers.js con **OPUS-MT** (`Xenova/opus-mt-{src}-{tgt}`, Helsinki-NLP) |
| Extracción de audio | **`@ffmpeg/ffmpeg`** + `@ffmpeg/util` (WASM, single-thread) |
| Export de vídeo | **`mediabunny`** + WebCodecs, fallback canvas + `MediaRecorder` |
| Paquetes | **pnpm**. Node `>=22.12` |
| Lenguaje | **TypeScript** estricto. Alias `@` → `./src` |
| i18n | i18n nativo de Astro: `en` (default) + `es` |

`package.json` que debes crear (deps clave, sin `@astrojs/cloudflare` ni `wrangler`):
`astro@6`, `@astrojs/sitemap`, `tailwindcss@4`, `@tailwindcss/vite@4`, `@huggingface/transformers@^4`,
`@ffmpeg/ffmpeg@0.12`, `@ffmpeg/util@0.12`, `mediabunny@^1.45`, `tailwind-animations`. Scripts:
`dev`, `build`, `preview`.

## Archivos que YA EXISTEN (úsalos, no los sobrescribas)

`astro.config.mjs` (estático), `vercel.json` (cabeceras), `public/favicon.svg`,
`public/apple-touch-icon.png`, `public/og.svg`, `public/og.png`, `BRANDING.md`, y las skills en
`.claude/skills/`. **No** crees `src/worker.ts` ni `wrangler.jsonc`.

## Arquitectura (respétala)

SPA **multi-etapa** incrustada en páginas estáticas. El trabajo pesado va a **Web Workers**.

```
Hilo principal       → UI, reproducción, timeline, orquestación de FFmpeg, render de export.
Worker transcripción → carga Whisper/OPUS-MT y corre la inferencia fuera del hilo principal.
Worker FFmpeg        → extrae el audio del vídeo subido antes de transcribir.
Modelos              → se descargan de Hugging Face la 1ª vez (~150 MB) y se cachean en IndexedDB.
Idioma               → redirección en CLIENTE (script inline en la home), no en servidor.
```

**Protocolo main ⇄ worker** (mensajes con `id`):
- `→ { id, type: "ensure-asr", payload: { model, webgpu } }`
- `→ { id, type: "transcribe", payload: { audio, language, wordTimestamps } }`  *(transfiere el buffer)*
- `← { type: "progress", key, payload }` · `← { type: "chunk" }`
- `← { id, type: "done", result? }` / `← { id, type: "error", error }`

Detalle de la IA → skill `browser-asr-transformers`.

## Flujo de usuario (las etapas)

1. **Upload** — drag & drop o seleccionar. MP4, MOV, WebM, MKV (vídeo) y MP3, WAV, OGG (audio). File API; **nunca se sube**.
2. **Config** — idioma del audio (o autodetectar) e idioma de subtítulos (activa traducción OPUS-MT si difiere).
3. **Editor** — lista de segmentos + timeline con scrubbing, edición de texto/timings, **undo/redo**, pistas multi-idioma, y presets de estilo (fuente, color, fondo, contorno, posición, opacidad, tamaño).
4. **Export** — `.srt`; y **MP4 con subtítulos quemados** (solo vídeo): WebCodecs + mediabunny, fallback canvas + `MediaRecorder`, con modal de progreso. Modo solo-audio: genera `.srt` sin vídeo. Skill `webcodecs-video-export`.

## Estructura de archivos a crear

```
src/
├── components/   Home.astro, UploadStage.astro, ConfigStage.astro, EditorStage.astro,
│                 EditorSidebar.astro, Timeline.astro, SubtitleStyleBar.astro, ExportModal.astro,
│                 DownloadsPanel.astro, StatusDock.astro, Footer.astro
├── i18n/         locales.ts (defaultLang, languages, type Lang) · ui.ts (en/es)
├── layouts/      Layout.astro (head, hreflang, meta/OG con og.png, fuentes, window.__I18N__)
├── pages/        index.astro (en) · es/index.astro (es)
├── scripts/
│   ├── app.ts            stageManager.ts
│   ├── stages/           uploadStage.ts, configStage.ts, editorStage.ts
│   ├── media/audio.ts    (FFmpeg WASM)
│   ├── export/           exportModal.ts, subtitleRenderer.ts, videoExport.ts
│   ├── transcriber.worker.ts, translation.worker.ts, transformersClient.ts
│   ├── subtitles.ts, subtitleStyle.ts, timeline.ts, editorSegments.ts, editorHistory.ts,
│   └── downloads.ts, languages.ts, i18n.ts, dom.ts, file.ts, ui.ts
└── styles/       global.css (pega aquí el @theme de BRANDING.md) · app.css
```

## Gotchas que NO debes pasar por alto

1. **WebGPU es frágil con transformers.js.** Implementa WebGPU **con fallback automático a WASM** (`dtype: "fp32"`). Empieza por WASM estable; WebGPU como opt-in cuando lo verifiques.
2. **Cross-origin isolation.** Con `@ffmpeg/ffmpeg@0.12` single-thread **no** hace falta COOP/COEP. **No** los añadas en Vercel: COEP rompería la descarga de modelos de Hugging Face. (Solo si algún día usas FFmpeg multi-thread.)
3. **Cabeceras en Vercel = `vercel.json`** (ya incluido). Vercel ignora `public/_headers`.
4. **Idioma en cliente**: la home redirige a `/es/` con un script inline según `navigator.language`, recordando la elección en `localStorage`. No hay middleware de servidor.
5. **Transferir, no copiar**: los `ArrayBuffer` de audio van a los workers como *transferables*.
6. **Una sola lengua por página** vía `window.__I18N__`.
7. **WebCodecs no está en todos lados**: detecta y cae a canvas + `MediaRecorder` (avisa en Safari).
8. **`mediabunny`** excluido de `optimizeDeps`, `worker: { format: "es" }` (ya en astro.config).
9. **Privacidad como feature**: nada de analítica con backend ni cuentas. Comunícalo en la UI.

## Orden de construcción (por hitos; valida cada uno)

1. **Scaffold**: Astro estático + Tailwind v4 + TS + pnpm + i18n. `pnpm dev` arranca y la landing se ve con la marca Subwave (papel, logo de onda, fuentes).
2. **Stages + navegación**: las tres etapas montan y `stageManager` alterna entre ellas.
3. **Upload + extracción de audio** (FFmpeg WASM en worker) con progreso.
4. **ASR en worker**: descarga de Whisper con progreso (IndexedDB), transcripción → segmentos. WebGPU→WASM funcionando.
5. **Editor + timeline + undo/redo + estilos de subtítulo** (modo "agua profunda").
6. **Traducción OPUS-MT** cuando el idioma de salida difiere.
7. **Export `.srt`** y **MP4 quemado** (mediabunny + fallback) con modal de progreso.
8. **i18n en/es completo**, SEO/OG/hreflang (usa `og.png`), sitemap, redirección de idioma en cliente.
9. **Pulido**: accesibilidad (foco, teclado, `prefers-reduced-motion`), estados de error, panel de descargas para limpiar modelos, animación de onda en el hero.

## Criterios de aceptación

- Subo un MP4 corto → subtítulos transcritos sin que nada salga del navegador (pestaña Network: cero subidas del vídeo).
- Edito texto/timings, deshago/rehago, cambio el estilo del subtítulo en vivo.
- Exporto un `.srt` válido y un MP4 con subtítulos quemados.
- Cambio el idioma de salida y se traduce.
- Funciona en `en` y `es` con URLs por locale y hreflang correctos.
- `pnpm build` pasa y el sitio despliega en Vercel sin errores.
- La identidad es claramente Subwave (papel + agua profunda + aqua, logo de onda).

## Cómo trabajar

- Consulta las skills **antes** de escribir código del área: `browser-asr-transformers`, `ffmpeg-wasm-audio`, `webcodecs-video-export`, `astro-static-i18n`, `tailwind-v4-theming`.
- TS estricto. Componentes pequeños; lógica en `scripts/`, presentación en `components/`.
- Tras cada hito, resume qué construiste y qué falta. No avances sin que el anterior funcione.

Empieza por el **Hito 1**. Antes de generar archivos, lee `CLAUDE.md`, `BRANDING.md` y las skills relevantes.
