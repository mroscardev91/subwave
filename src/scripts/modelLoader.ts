// Estado de carga de los modelos/binarios de IA para el panel "Cargando modelos"
// (StatusDock). Calienta el core FFmpeg y el modelo Whisper al ENTRAR a la app
// (no en la landing), reporta progreso en vivo y avisa a los suscriptores.

import { ensureAsr } from "@/scripts/transformersClient";
import { ASR_MODEL } from "@/scripts/models";
import { preloadCore } from "@/scripts/media/audio";

export type ModelKey = "ffmpeg" | "whisper" | "translation";
export type ModelStatus = "idle" | "loading" | "ready";

export interface ModelState {
  status: ModelStatus;
  loaded: number; // bytes descargados (si se conocen)
  total: number; // bytes totales (si se conocen)
}

export type ModelsState = Record<ModelKey, ModelState>;

const state: ModelsState = {
  ffmpeg: { status: "idle", loaded: 0, total: 0 },
  whisper: { status: "idle", loaded: 0, total: 0 },
  translation: { status: "idle", loaded: 0, total: 0 },
};

const listeners = new Set<(s: ModelsState) => void>();

function emit(): void {
  for (const cb of listeners) cb(state);
}

function set(key: ModelKey, patch: Partial<ModelState>): void {
  Object.assign(state[key], patch);
  emit();
}

/** Suscríbete a los cambios de estado (te llama ya con el estado actual). */
export function subscribeModels(cb: (s: ModelsState) => void): () => void {
  listeners.add(cb);
  cb(state);
  return () => listeners.delete(cb);
}

export function getModelsState(): ModelsState {
  return state;
}

/** Marca el estado del modelo de traducción (se carga bajo demanda al traducir). */
export function setTranslationStatus(status: ModelStatus): void {
  set("translation", { status });
}

/** El core FFmpeg quedó listo por uso real (extracción), no solo por el warm. */
export function markFfmpegReady(): void {
  if (state.ffmpeg.status !== "ready") set("ffmpeg", { status: "ready" });
}

// Suma loaded/total de los archivos que transformers.js va descargando.
function aggregate(files: Map<string, { loaded: number; total: number }>): { loaded: number; total: number } {
  let loaded = 0;
  let total = 0;
  for (const f of files.values()) {
    loaded += f.loaded;
    total += f.total;
  }
  return { loaded, total };
}

let started = false;

/** Calienta FFmpeg + Whisper en segundo plano (idempotente, respeta Save-Data). */
export function warmModels(): void {
  if (started) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  started = true;
  const run = () => {
    void warmFfmpeg();
    void warmWhisper();
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else setTimeout(run, 1000);
}

async function warmFfmpeg(): Promise<void> {
  if (state.ffmpeg.status !== "idle") return;
  set("ffmpeg", { status: "loading" });
  try {
    await preloadCore();
    set("ffmpeg", { status: "ready" });
  } catch {
    set("ffmpeg", { status: "idle" });
  }
}

async function warmWhisper(): Promise<void> {
  if (state.whisper.status !== "idle") return;
  set("whisper", { status: "loading" });
  const files = new Map<string, { loaded: number; total: number }>();
  try {
    await ensureAsr(ASR_MODEL, {
      webgpu: false,
      onProgress: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (p?.status === "progress" && p.file) {
          files.set(p.file, { loaded: p.loaded || 0, total: p.total || 0 });
          const { loaded, total } = aggregate(files);
          set("whisper", { status: "loading", loaded, total });
        }
      },
    });
    set("whisper", { status: "ready" });
  } catch {
    set("whisper", { status: "idle" });
  }
}
