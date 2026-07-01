// Capa que habla con los workers de IA (transcripción y traducción) vía mensajes
// con `id`. El worker de traducción se crea lazy (solo si hace falta traducir).

let asrWorker: Worker | null = null;
let transWorker: Worker | null = null;
let reqId = 0;

interface Pending {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  worker: Worker;
}
const pending = new Map<number, Pending>();
const onProgress: { asr?: (p: any) => void; translation?: (p: any) => void } = {};

function route(event: MessageEvent): void {
  const { id, type, payload, result, error, key } = event.data || {};
  if (type === "progress") {
    onProgress[key as "asr" | "translation"]?.(payload);
    return;
  }
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  if (type === "error") p.reject(new Error(error));
  else p.resolve(result);
}

// Si un worker no puede instanciarse/evaluarse, rechaza SOLO lo suyo y lo resetea
// (no arrastra al otro worker, que puede tener un modelo grande ya cargado).
function failWorker(worker: Worker, error: Error): void {
  for (const [id, p] of pending) {
    if (p.worker !== worker) continue;
    p.reject(error);
    pending.delete(id);
  }
  if (worker === asrWorker) {
    asrWorker.terminate();
    asrWorker = null;
  } else if (worker === transWorker) {
    transWorker.terminate();
    transWorker = null;
  }
}

function getAsrWorker(): Worker {
  if (!asrWorker) {
    const w = new Worker(new URL("@/scripts/transcriber.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = route;
    w.onerror = () => failWorker(w, new Error("transcriber worker error"));
    w.onmessageerror = () => failWorker(w, new Error("transcriber worker message error"));
    asrWorker = w;
  }
  return asrWorker;
}

function getTransWorker(): Worker {
  if (!transWorker) {
    const w = new Worker(new URL("@/scripts/translation.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = route;
    w.onerror = () => failWorker(w, new Error("translation worker error"));
    w.onmessageerror = () => failWorker(w, new Error("translation worker message error"));
    transWorker = w;
  }
  return transWorker;
}

function send(worker: Worker, type: string, payload: any, transfer: Transferable[] = []): Promise<any> {
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, worker });
    worker.postMessage({ id, type, payload }, transfer);
  });
}

export interface EnsureOptions {
  webgpu?: boolean;
  onProgress?: (payload: any) => void;
}

export function ensureAsr(model: string, opts: EnsureOptions = {}): Promise<void> {
  onProgress.asr = opts.onProgress;
  return send(getAsrWorker(), "ensure-asr", { model, webgpu: opts.webgpu });
}

export function transcribe(audio: Float32Array, language?: string): Promise<any> {
  const copy = audio.slice(); // copia para no inutilizar session.audio
  return send(getAsrWorker(), "transcribe", { audio: copy, language }, [copy.buffer]);
}

// Libera el modelo de transcripción (mata el worker → ~150-290 MB de RAM). Se
// llama tras transcribir: el editor y el export no usan Whisper, y en móvil esa
// RAM residente hacía OOM al reproducir. Se recarga (desde caché) si se vuelve.
export function releaseAsr(): void {
  if (!asrWorker) return;
  for (const [id, p] of pending) {
    if (p.worker !== asrWorker) continue;
    p.reject(new Error("asr released"));
    pending.delete(id);
  }
  asrWorker.terminate();
  asrWorker = null;
}

// Libera el modelo de traducción (OPUS-MT fp32 ~300 MB). Igual que releaseAsr:
// no se usa en el editor/playback y esa RAM residente hacía OOM en móvil.
export function releaseTranslation(): void {
  if (!transWorker) return;
  for (const [id, p] of pending) {
    if (p.worker !== transWorker) continue;
    p.reject(new Error("translation released"));
    pending.delete(id);
  }
  transWorker.terminate();
  transWorker = null;
}

export function ensureTranslation(model: string, opts: { onProgress?: (p: any) => void } = {}): Promise<void> {
  onProgress.translation = opts.onProgress;
  return send(getTransWorker(), "ensure-translation", { model });
}

export function translate(texts: string[]): Promise<string[]> {
  return send(getTransWorker(), "translate", { texts });
}
