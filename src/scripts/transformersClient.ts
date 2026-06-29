// Capa que habla con los workers de IA (transcripción y traducción) vía mensajes
// con `id`. El worker de traducción se crea lazy (solo si hace falta traducir).

let asrWorker: Worker | null = null;
let transWorker: Worker | null = null;
let reqId = 0;

interface Pending {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
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

// Si un worker no puede instanciarse/evaluarse, rechaza lo pendiente y resetea.
function failAll(error: Error): void {
  for (const p of pending.values()) p.reject(error);
  pending.clear();
  asrWorker?.terminate();
  transWorker?.terminate();
  asrWorker = null;
  transWorker = null;
}

function getAsrWorker(): Worker {
  if (!asrWorker) {
    asrWorker = new Worker(new URL("@/scripts/transcriber.worker.ts", import.meta.url), { type: "module" });
    asrWorker.onmessage = route;
    asrWorker.onerror = () => failAll(new Error("transcriber worker error"));
    asrWorker.onmessageerror = () => failAll(new Error("transcriber worker message error"));
  }
  return asrWorker;
}

function getTransWorker(): Worker {
  if (!transWorker) {
    transWorker = new Worker(new URL("@/scripts/translation.worker.ts", import.meta.url), { type: "module" });
    transWorker.onmessage = route;
    transWorker.onerror = () => failAll(new Error("translation worker error"));
    transWorker.onmessageerror = () => failAll(new Error("translation worker message error"));
  }
  return transWorker;
}

function send(worker: Worker, type: string, payload: any, transfer: Transferable[] = []): Promise<any> {
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
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

export function ensureTranslation(model: string, opts: { onProgress?: (p: any) => void } = {}): Promise<void> {
  onProgress.translation = opts.onProgress;
  return send(getTransWorker(), "ensure-translation", { model });
}

export function translate(texts: string[]): Promise<string[]> {
  return send(getTransWorker(), "translate", { texts });
}
