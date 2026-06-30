// Worker de traducción: modelos OPUS-MT (Helsinki-NLP) con transformers.js.
// Son open-source y ligeros (~75 MB), corren en WASM en el navegador (gratis,
// sin servidor) y generan bien — a diferencia de NLLB-600M, que no cabe en el
// heap WASM y da generación vacía en WebGPU. Cada par de idiomas es un modelo;
// se cargan lazy y se cachean en IndexedDB.

import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;
// Backend ONNX wasm self-hosteado (public/ort/), no desde el CDN de jsdelivr.
env.backends.onnx.wasm.wasmPaths = "/ort/";

// `any` acotado a la frontera con la librería ML.
let translator: any = null;
let loadedModel = "";
let loadingPromise: Promise<void> | null = null;
let loadingModel = "";

const post = (msg: any, transfer: Transferable[] = []) => (self as Window & typeof globalThis).postMessage(msg, transfer);

async function ensure(model: string): Promise<void> {
  if (translator && loadedModel === model) return;
  // Comparte la carga en vuelo si llega otra petición del mismo modelo.
  if (loadingPromise && loadingModel === model) return loadingPromise;
  loadingModel = model;
  loadingPromise = load(model);
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

async function load(model: string): Promise<void> {
  translator = await pipeline("translation", model, {
    // fp32 sin cuantizar: las variantes q8/int8 de estos modelos usan un op
    // MatMulNBits (4-bit) que el onnxruntime-web incluido no puede cargar
    // (falta el tensor de escala). OPUS-MT es pequeño (~300MB fp32) y cabe en WASM.
    dtype: "fp32",
    progress_callback: (p: any) => post({ type: "progress", key: "translation", payload: p }),
  });
  loadedModel = model;
}

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === "ensure-translation") {
      await ensure(payload.model);
      post({ id, type: "done" });
    } else if (type === "translate") {
      // OPUS-MT es bilingüe fijo: no necesita src/tgt. Traducimos línea a línea.
      const results: string[] = [];
      for (const text of payload.texts as string[]) {
        const trimmed = text.trim();
        if (!trimmed) {
          results.push("");
          continue;
        }
        const o = await translator(trimmed);
        const t = Array.isArray(o) ? o[0]?.translation_text : o?.translation_text;
        results.push(String(t ?? ""));
      }
      post({ id, type: "done", result: results });
    }
  } catch (error: any) {
    post({ id, type: "error", error: String(error?.message ?? error) });
  }
};
