# CLAUDE.md

Contexto persistente del proyecto. Claude Code lee este archivo automáticamente.

## Qué es esto

**Subwave**: app web de subtítulos que corre **100% en el navegador**. Transcribe con IA
(Whisper), edita en una timeline, traduce (OPUS-MT) y exporta `.srt` o vídeo con subtítulos
quemados. **Sin backend, sin subidas, sin API keys.** La privacidad es un principio de diseño.

App de subtítulos con identidad propia de **onda** (ver `BRANDING.md`).

## Stack

- **Astro 6** con `output: "static"` (sitio estático, **sin adapter, sin servidor**).
- **Deploy gratis**: Vercel (recomendado), o Cloudflare Pages / Netlify / GitHub Pages. El mismo build vale para todos.
- **Tailwind CSS 4** vía `@tailwindcss/vite`. **No hay `tailwind.config`**: el tema vive en `@theme` dentro de `src/styles/global.css` (tokens en `BRANDING.md`).
- **TypeScript** estricto. Alias `@` → `./src`.
- **pnpm**. Node `>=22.12`.
- **transformers.js** (`@huggingface/transformers`): Whisper (ASR) + OPUS-MT (traducción, ligero).
- **@ffmpeg/ffmpeg** (WASM, single-thread): extracción de audio.
- **mediabunny** + WebCodecs: export de vídeo; fallback canvas + `MediaRecorder`.

## Archivos que YA EXISTEN (no los regeneres; úsalos)

- `astro.config.mjs` — config estática, ya lista. Solo actualiza `site` con la URL final.
- `vercel.json` — cabeceras de seguridad + cache (Vercel ignora `public/_headers`).
- `public/favicon.svg`, `public/apple-touch-icon.png`, `public/og.svg`, `public/og.png` — assets de marca ya dibujados (logo de onda). Cablea el `<head>` para usarlos.
- `BRANDING.md` — identidad de marca + **el bloque `@theme` exacto** para copiar a `src/styles/global.css`.

No crees `src/worker.ts` ni `wrangler.jsonc`: este proyecto es estático, no usa Cloudflare Workers.

## Arquitectura mental

SPA multi-etapa incrustada en páginas estáticas. Trabajo pesado en Web Workers.

- **Hilo principal**: UI, reproducción, timeline, orquestación FFmpeg, render de export.
- **Worker de transcripción** (`transcriber.worker.ts`): Whisper, fuera del hilo principal.
- **Worker de traducción** (`translation.worker.ts`): OPUS-MT.
- **`transformersClient.ts`**: capa que habla con ambos workers vía mensajes con `id`.
- **Modelos**: se descargan de Hugging Face la 1ª vez (~150 MB) y se cachean en **IndexedDB**.
- **Idioma**: redirección en cliente (script inline), no en servidor (es estático).

Etapas del usuario: **upload → config → editor → export**. `stageManager.ts` alterna visibilidad.

## Marca (resumen; detalle en BRANDING.md)

- Dos modos: **landing de papel** (Instrument Serif + Outfit, textura sutil) y **editor "agua profunda"** oscuro.
- **Acento único: aqua `#2DE0CE`** sobre el editor oscuro.
- Logo: **una onda con su sub-onda debajo**; motivo de waveform por toda la UI.
- Fuentes: Instrument Serif (display) · Outfit (UI) · JetBrains Mono (timecodes).

## Convenciones

- Presentación en `src/components/*.astro`; lógica en `src/scripts/`.
- TS estricto. `any` solo en fronteras con WASM/ML, acotado y comentado.
- i18n: strings build-time en `.astro`; runtime en `window.__I18N__` por página (solo el idioma activo).
- Buffers de audio a los workers como **transferables** (no copiar).
- Accesibilidad: foco visible, teclado, respeta `prefers-reduced-motion`.

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm install` | Instala dependencias |
| `pnpm dev` | Dev server en `localhost:4321` |
| `pnpm build` | Build estático a `./dist/` |
| `pnpm preview` | Previsualiza el build |
| (deploy) | `npx vercel` o conectar el repo en vercel.com (detecta Astro solo) |

## Skills disponibles (en `.claude/skills/`)

Consúltalas **antes** de escribir código del área:

- `browser-asr-transformers` — Whisper/OPUS-MT en workers, protocolo de mensajes, WebGPU→WASM, IndexedDB.
- `ffmpeg-wasm-audio` — extracción de audio con FFmpeg WASM (single-thread).
- `webcodecs-video-export` — quemar subtítulos con WebCodecs/mediabunny y fallback a MediaRecorder.
- `astro-static-i18n` — Astro estático + i18n + redirección en cliente + vercel.json.
- `tailwind-v4-theming` — sistema de tokens en `@theme` (tokens de Subwave en BRANDING.md).

## Reglas duras

1. Nada del archivo del usuario (vídeo/audio) sale del navegador. Verificable en Network.
2. WebGPU siempre con fallback a WASM. No asumir soporte.
3. WebCodecs siempre con fallback a canvas + MediaRecorder.
4. Sin analítica con backend ni cuentas de usuario.
5. No avanzar de hito sin que el anterior funcione (ver `PROMPT.md`).
