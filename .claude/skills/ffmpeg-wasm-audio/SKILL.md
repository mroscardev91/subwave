---
name: ffmpeg-wasm-audio
description: Use cuando extraigas o conviertas audio en el navegador con FFmpeg compilado a WASM (@ffmpeg/ffmpeg), normalmente para sacar el audio de un vídeo subido antes de transcribir. Cubre carga del core, reamuestreo a 16 kHz mono, progreso y cuándo hace falta cross-origin isolation (COOP/COEP). Trigger: media/audio.ts, @ffmpeg/ffmpeg, @ffmpeg/util, SharedArrayBuffer, COOP, COEP, extraer audio, transcodificar.
---

# Extracción de audio con FFmpeg WASM

Whisper necesita **Float32 mono a 16 kHz**. El vídeo subido casi nunca viene así, por lo que
sacamos y reamuestreamos el audio en el navegador con FFmpeg WASM antes de transcribir.

## Carga del core (una sola vez, lazy)

```ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(onProgress?: (ratio: number) => void) {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => onProgress?.(progress));

  // Sirve el core single-thread desde un CDN o desde /public (mejor self-host para producción).
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}
```

> Para producción, **self-hostea** los archivos del core en `public/` en lugar de depender de
> un CDN: evita CORS sorpresa y caídas de terceros.

## Extraer audio a WAV 16 kHz mono

```ts
export async function extractAudio(file: File, onProgress?: (r: number) => void): Promise<Float32Array> {
  const ff = await getFFmpeg(onProgress);
  await ff.writeFile("in", await fetchFile(file));
  // PCM 16-bit, mono, 16 kHz → fácil de pasar a Float32
  await ff.exec(["-i", "in", "-ac", "1", "-ar", "16000", "-f", "wav", "out.wav"]);
  const data = (await ff.readFile("out.wav")) as Uint8Array;
  await ff.deleteFile("in");
  await ff.deleteFile("out.wav");
  return wavToFloat32(decodeWavHeader(data)); // salta la cabecera WAV de 44 bytes
}
```

Convierte PCM16 → Float32 dividiendo cada muestra entre 32768. Salta los 44 bytes de cabecera WAV
(o parsea la cabecera si quieres ser robusto con formatos no estándar).

## Cross-origin isolation: ¿hace falta?

- **Build single-thread de `@ffmpeg/ffmpeg@0.12`**: normalmente **NO** necesita `SharedArrayBuffer`,
  así que no requiere COOP/COEP. Empieza por aquí.
- **Build multi-thread** (más rápido) o ciertos entornos: **SÍ** requieren cross-origin isolation.
  Añade en `public/_headers`:

  ```
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```

  Ojo: con COEP `require-corp`, todo recurso de terceros (CDN de modelos incluido) debe enviar
  `Cross-Origin-Resource-Policy` o `Access-Control-Allow-Origin` adecuado, o fallará la carga.

**Decide un camino y documéntalo en `CLAUDE.md`.** Recomendación: single-thread + sin COOP/COEP
para simplicidad; sube a multi-thread solo si la velocidad de extracción es un cuello de botella.

## Progreso y UX

- Reenvía `progress` (0..1) al "status dock": "Extrayendo audio…".
- Cárgalo lazy: no traigas el core de FFmpeg hasta que el usuario suba algo.
- Audio-only (MP3/WAV/OGG): si ya viene como audio, igual conviene normalizar a 16 kHz mono.

## Errores comunes

- **Vídeo sin pista de audio**: detecta el caso y muestra un error claro.
- **Formato exótico de WAV**: si tu parser de cabecera asume 44 bytes y falla, parsea los chunks `fmt `/`data`.
- **Memoria**: archivos largos consumen mucha RAM en WASM. Avisa con vídeos muy largos.
