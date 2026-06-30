// Extracción de audio con FFmpeg WASM. Whisper necesita Float32 mono a 16 kHz,
// así que sacamos y reamuestreamos el audio del archivo subido. El core de
// @ffmpeg/ffmpeg corre en su propio worker interno: el hilo principal solo
// orquesta. El core se carga lazy (la 1ª vez que se sube algo) desde el MISMO
// origen (no de un CDN), para que ninguna petición salga a terceros.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
// Worker ESM de @ffmpeg/ffmpeg, empaquetado por Vite (?worker&url). FFmpeg crea
// SIEMPRE el worker como módulo ES; en ese contexto el worker carga el core con
// import() dinámico nativo (no importScripts). Hay que forzar a Vite a
// empaquetar este worker: su `new URL("./worker.js", import.meta.url)` interno
// no se resuelve solo desde dentro de la dependencia.
import ffmpegWorkerURL from "@ffmpeg/ffmpeg/worker?worker&url";

// Core ESM (lo exige el import() dinámico del worker módulo). Self-hosteado en
// public/ffmpeg/ (lo copia el script prebuild/predev desde @ffmpeg/core), así
// que se sirve desde el mismo origen.
const CORE_BASE = `${import.meta.env.BASE_URL}ffmpeg`;
const LOAD_TIMEOUT_MS = 90_000;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type ExtractPhase = "loading" | "extracting";

export interface ExtractCallbacks {
  onPhase?: (phase: ExtractPhase) => void;
  onProgress?: (ratio: number) => void;
}

export interface ExtractedAudio {
  /** PCM mono a 16 kHz, normalizado a [-1, 1]. */
  audio: Float32Array;
  sampleRate: number;
  duration: number;
}

/** No audio stream in the source — surfaced to the UI as a clear message. */
export class NoAudioError extends Error {}

async function getFFmpeg(cb?: ExtractCallbacks): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (!loadPromise) {
    loadPromise = (async () => {
      cb?.onPhase?.("loading");
      const ff = new FFmpeg();
      const load = ff.load({
        classWorkerURL: ffmpegWorkerURL,
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ffmpeg load timeout")), LOAD_TIMEOUT_MS),
      );
      await Promise.race([load, timeout]);
      ffmpeg = ff;
      return ff;
    })();
    // Si la carga falla, no dejes la promesa rechazada cacheada: permite reintentar.
    void loadPromise.catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export async function extractAudio(file: File, cb: ExtractCallbacks = {}): Promise<ExtractedAudio> {
  const ff = await getFFmpeg(cb);

  const onProgress = ({ progress }: { progress: number }) =>
    cb.onProgress?.(Math.min(1, Math.max(0, progress)));
  // Capturamos el log para distinguir "sin pista de audio" de otros fallos.
  let log = "";
  const onLog = ({ message }: { message: string }) => {
    log += message + "\n";
  };
  ff.on("progress", onProgress);
  ff.on("log", onLog);

  try {
    cb.onPhase?.("extracting");
    await ff.writeFile("input", await fetchFile(file));
    // -vn descarta vídeo; PCM s16le mono 16 kHz → trivial de pasar a Float32.
    const code = await ff.exec(["-i", "input", "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", "out.wav"]);
    if (code !== 0) {
      // Solo es "sin audio" si ffmpeg lo dice; un archivo corrupto/no soportado
      // sale con código != 0 pero no debe etiquetarse como falta de pista.
      if (/does not contain any stream|matches no streams|Cannot find a matching stream/i.test(log)) {
        throw new NoAudioError(`no audio stream (ffmpeg exit ${code})`);
      }
      throw new Error(`ffmpeg exit ${code}`);
    }

    const data = (await ff.readFile("out.wav")) as Uint8Array;
    await ff.deleteFile("input");
    await ff.deleteFile("out.wav");

    const { samples, sampleRate } = decodeWav(data);
    return { audio: samples, sampleRate, duration: samples.length / sampleRate };
  } finally {
    ff.off("progress", onProgress);
    ff.off("log", onLog);
  }
}

// Parser de WAV PCM s16le. Recorre los chunks RIFF para localizar `fmt ` y `data`
// (más robusto que asumir 44 bytes de cabecera).
function decodeWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sampleRate = 16000;
  let dataOffset = 44;
  let dataLen = bytes.length - 44;

  let offset = 12; // salta "RIFF" + size + "WAVE"
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      sampleRate = view.getUint32(body + 4, true);
    } else if (id === "data") {
      dataOffset = body;
      dataLen = size;
      break;
    }
    offset = body + size + (size & 1); // los chunks se alinean a palabra
  }

  const count = Math.floor(dataLen / 2);
  const samples = new Float32Array(count);
  for (let i = 0, p = dataOffset; i < count; i++, p += 2) {
    samples[i] = view.getInt16(p, true) / 32768;
  }
  return { samples, sampleRate };
}
