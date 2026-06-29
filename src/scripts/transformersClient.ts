// Capa que habla con el worker de transcripción vía mensajes con `id`. Mantiene
// un mapa de peticiones pendientes y reenvía el progreso de descarga del modelo.

let worker: Worker | null = null;
let reqId = 0;

interface Pending {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}
const pending = new Map<number, Pending>();
let onAsrProgress: ((payload: any) => void) | null = null;

// Si el worker no puede instanciarse/evaluarse (chunk que falla, etc.), nunca
// llegaría un mensaje y las promesas quedarían colgadas. Rechazamos todo y
// reseteamos para poder reintentar.
function failAll(error: Error): void {
  for (const p of pending.values()) p.reject(error);
  pending.clear();
  worker?.terminate();
  worker = null;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("@/scripts/transcriber.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const { id, type, payload, result, error } = event.data || {};
      if (type === "progress") {
        onAsrProgress?.(payload);
        return;
      }
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (type === "error") p.reject(new Error(error));
      else p.resolve(result);
    };
    worker.onerror = () => failAll(new Error("transcriber worker error"));
    worker.onmessageerror = () => failAll(new Error("transcriber worker message error"));
  }
  return worker;
}

function send(type: string, payload: any, transfer: Transferable[] = []): Promise<any> {
  const w = getWorker();
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, type, payload }, transfer);
  });
}

export interface EnsureAsrOptions {
  webgpu?: boolean;
  onProgress?: (payload: any) => void;
}

export function ensureAsr(model: string, opts: EnsureAsrOptions = {}): Promise<void> {
  onAsrProgress = opts.onProgress ?? null;
  return send("ensure-asr", { model, webgpu: opts.webgpu });
}

export function transcribe(audio: Float32Array, language?: string): Promise<any> {
  // Transferimos una COPIA del buffer para no dejar inservible session.audio
  // (lo necesitamos para re-transcribir si cambia el idioma de origen).
  const copy = audio.slice();
  return send("transcribe", { audio: copy, language }, [copy.buffer]);
}
