---
name: browser-asr-transformers
description: Use cuando trabajes con transcripción (Whisper) o traducción (OPUS-MT) de subtítulos en el navegador con transformers.js dentro de Web Workers. Cubre el protocolo de mensajes main⇄worker, la descarga de modelos con progreso, el caché en IndexedDB y el fallback WebGPU→WASM. Trigger: transcriber.worker.ts, translation.worker.ts, transformersClient.ts, @huggingface/transformers, pipeline, automatic-speech-recognition, dtype, chunk_length_s.
---

# IA en el navegador con transformers.js

Toda la inferencia corre en el cliente, dentro de Web Workers, para no congelar la UI.

## Modelos

- **ASR (voz→texto)**: Whisper. Empieza con `Xenova/whisper-base` (equilibrio tamaño/calidad, ~150 MB). Ofrece tiny/small como opciones.
- **Traducción**: `Xenova/opus-mt-{src}-{tgt}` (Helsinki-NLP). Solo se carga si el idioma de salida difiere del de entrada.

## Setup del worker ASR

```ts
import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true; // cachea pesos en IndexedDB tras la 1ª descarga

let recognizer: any = null;

const post = (msg: any, transfer: Transferable[] = []) =>
  (self as any).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === "ensure-asr") {
      if (!recognizer) {
        recognizer = await pipeline("automatic-speech-recognition", payload.model, {
          dtype: "fp32", // no cuantizado → máxima compatibilidad
          progress_callback: (p: any) => post({ type: "progress", key: "asr", payload: p }),
        });
      }
      post({ id, type: "done" });
    } else if (type === "transcribe") {
      const output = await recognizer(payload.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: payload.language,        // o undefined para autodetectar
        return_timestamps: payload.wordTimestamps ? "word" : true,
        task: "transcribe",
      });
      post({ id, type: "done", result: output });
    }
  } catch (error: any) {
    post({ id, type: "error", error: String(error?.message ?? error) });
  }
};
```

Para el worker de traducción, usa el mismo patrón con `pipeline("translation", model)`. OPUS-MT es bilingüe por modelo: no necesita `src_lang`/`tgt_lang`, basta pasar el texto a traducir.

## Protocolo main ⇄ worker

Empareja request/response con un `id` incremental:

- `→ { id, type: "ensure-asr", payload: { model, webgpu } }`
- `→ { id, type: "transcribe", payload: { audio, language, wordTimestamps } }` — **transfiere** el buffer
- `← { type: "progress", key, payload }` — progreso de descarga (en streaming, sin `id`)
- `← { type: "chunk" }` — progreso por chunk de ASR
- `← { id, type: "done", result? }` / `← { id, type: "error", error }`

En `transformersClient.ts`, mantén un `Map<number, {resolve, reject, target}>` de peticiones pendientes y un `reqId` que incrementas. Crea el worker con:

```ts
const asrWorker = new Worker(new URL("./transcriber.worker.ts", import.meta.url), { type: "module" });
```

Crea el worker de traducción **lazy** (solo cuando se necesita).

## Transferir el audio (no copiar)

```ts
// audio: Float32Array a 16 kHz mono (lo que espera Whisper)
worker.postMessage({ id, type: "transcribe", payload: { audio, language } }, [audio.buffer]);
```

## WebGPU → WASM (fallback obligatorio)

WebGPU acelera mucho pero su detección es frágil entre navegadores. Estrategia:

1. Intenta WebGPU si `navigator.gpu` existe y el usuario lo permite.
2. Si la inicialización falla o da resultados raros, **cae a WASM** y reintenta una vez.
3. WASM con `dtype: "fp32"` es el camino seguro y compatible en todas partes.

> Nota real del repo de referencia: por problemas de detección, llegaron a **forzar WASM**
> ocultando `navigator.gpu` dentro del worker. Empieza por WASM estable; añade WebGPU como
> opt-in detrás de un toggle solo cuando lo verifiques.

## Progreso y caché

- Reenvía cada `progress` al hilo principal para pintar el "status dock" (porcentaje por archivo de modelo).
- Los pesos quedan en IndexedDB (`useBrowserCache = true`): la 2ª vez no se descarga nada.
- En el `DownloadsPanel`, ofrece limpiar el caché borrando las bases de datos de transformers.js en IndexedDB.

## Errores comunes

- **Audio mal formateado**: Whisper quiere Float32 mono 16 kHz. Reamuestrea en la extracción (ver skill `ffmpeg-wasm-audio`).
- **Worker que no carga el modelo**: revisa `type: "module"` en el `new Worker(...)` y `worker: { format: "es" }` en Vite.
- **OOM en móviles**: usa whisper-tiny/base, no large. Avisa si el dispositivo es limitado.
