// Worker de transcripción (ASR). Carga Whisper con transformers.js y corre la
// inferencia fuera del hilo principal. Los pesos se cachean en IndexedDB tras la
// 1ª descarga. WebGPU es opt-in con fallback a WASM (estable y compatible).

import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true; // cachea pesos en IndexedDB
// Backend ONNX wasm self-hosteado (public/ort/), no desde el CDN de jsdelivr:
// transformers.js solo pone el default del CDN si wasmPaths está vacío.
env.backends.onnx.wasm.wasmPaths = "/ort/";

// `any` acotado a la frontera con la librería ML.
let recognizer: any = null;
let loadedModel = "";

const post = (msg: any, transfer: Transferable[] = []) => (self as Window & typeof globalThis).postMessage(msg, transfer);

async function ensure(model: string, webgpu: boolean): Promise<void> {
  if (recognizer && loadedModel === model) return;
  const common = {
    progress_callback: (p: any) => post({ type: "progress", key: "asr", payload: p }),
  };

  // WebGPU acelera pero su detección es frágil: si falla, caemos a WASM.
  if (webgpu && (self as any).navigator?.gpu) {
    try {
      recognizer = await pipeline("automatic-speech-recognition", model, { ...common, device: "webgpu", dtype: "fp32" });
      loadedModel = model;
      return;
    } catch {
      recognizer = null;
    }
  }

  recognizer = await pipeline("automatic-speech-recognition", model, { ...common, dtype: "fp32" });
  loadedModel = model;
}

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === "ensure-asr") {
      await ensure(payload.model, !!payload.webgpu);
      post({ id, type: "done" });
    } else if (type === "transcribe") {
      const output = await recognizer(payload.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: payload.language, // undefined → autodetectar
        return_timestamps: "word", // por palabra → trozos cortos
        task: "transcribe",
      });
      post({ id, type: "done", result: output });
    }
  } catch (error: any) {
    post({ id, type: "error", error: String(error?.message ?? error) });
  }
};
