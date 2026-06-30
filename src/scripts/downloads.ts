// Panel "Cargando modelos" (badge arriba a la derecha): muestra en vivo el
// progreso de carga del core FFmpeg y del modelo Whisper (vía modelLoader), el
// tamaño en caché de cada modelo, y permite borrarlos. transformers.js guarda los
// pesos en la Cache API; borrarlos solo obliga a re-descargarlos al siguiente uso.

import { subscribeModels, getModelsState, type ModelsState, type ModelKey, type ModelStatus } from "@/scripts/modelLoader";

const MODEL_CACHE_RE = /transformers|onnx|hugging|hf-/i;

function prettySize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface ModelSizes {
  whisper: number;
  translation: number;
  total: number;
}

async function modelCacheNames(): Promise<string[]> {
  if (!("caches" in window)) return [];
  try {
    return (await caches.keys()).filter((k) => MODEL_CACHE_RE.test(k));
  } catch {
    return [];
  }
}

// Suma los bytes en caché agrupados por modelo (a partir de la URL de cada
// recurso). El tamaño viene de content-length o, si falta, del propio blob.
async function modelSizes(): Promise<ModelSizes> {
  const sizes: ModelSizes = { whisper: 0, translation: 0, total: 0 };
  for (const name of await modelCacheNames()) {
    const cache = await caches.open(name);
    for (const req of await cache.keys()) {
      const res = await cache.match(req);
      if (!res) continue;
      const len = Number(res.headers.get("content-length")) || (await res.clone().blob()).size;
      sizes.total += len;
      const url = req.url.toLowerCase();
      if (url.includes("whisper")) sizes.whisper += len;
      else if (/opus-mt|marian|nllb|translation/.test(url)) sizes.translation += len;
    }
  }
  return sizes;
}

export function initDownloads(): void {
  const root = document.querySelector<HTMLElement>("[data-downloads]");
  if (!root) return;
  const toggle = root.querySelector<HTMLButtonElement>('[data-downloads="toggle"]')!;
  const panel = root.querySelector<HTMLElement>('[data-downloads="panel"]')!;
  const titleEl = root.querySelector<HTMLElement>('[data-downloads="title"]')!;
  const summary = root.querySelector<HTMLElement>('[data-downloads="summary"]')!;
  const bar = root.querySelector<HTMLElement>('[data-downloads="bar"]')!;
  const sizeEls: Record<ModelKey, HTMLElement> = {
    ffmpeg: root.querySelector<HTMLElement>('[data-downloads="ffmpeg"]')!,
    whisper: root.querySelector<HTMLElement>('[data-downloads="whisper"]')!,
    translation: root.querySelector<HTMLElement>('[data-downloads="translation"]')!,
  };
  const rows: Record<ModelKey, HTMLElement> = {
    ffmpeg: root.querySelector<HTMLElement>('li[data-model="ffmpeg"]')!,
    whisper: root.querySelector<HTMLElement>('li[data-model="whisper"]')!,
    translation: root.querySelector<HTMLElement>('li[data-model="translation"]')!,
  };
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-downloads="clear"]')!;
  const liveRegion = root.querySelector<HTMLElement>('[data-downloads="live"]')!;
  const d = () => window.__I18N__.downloads;

  let live: ModelsState = getModelsState();
  let cache: ModelSizes = { whisper: 0, translation: 0, total: 0 };
  let ffmpegSize = 0;
  let announced = ""; // último estado anunciado al lector de pantalla

  const setRow = (key: ModelKey, status: ModelStatus, sizeText: string) => {
    rows[key].dataset.status = status;
    sizeEls[key].textContent = sizeText;
  };

  function progress(m: { status: ModelStatus; loaded: number; total: number }): number {
    if (m.status === "ready") return 1;
    if (m.status === "loading") return m.total > 0 ? Math.min(0.99, m.loaded / m.total) : 0.12;
    return 0;
  }

  function render(): void {
    const t = d();

    // FFmpeg core (sin tamaño en Cache API: se sirve estático; HEAD da los bytes).
    const ffText = live.ffmpeg.status === "ready" ? (ffmpegSize ? prettySize(ffmpegSize) : "") : live.ffmpeg.status === "idle" ? t.pending : "";
    setRow("ffmpeg", live.ffmpeg.status, ffText);

    // Whisper: estado desde vivo O caché (un modelo ya cacheado se ve "listo").
    const wStatus: ModelStatus = live.whisper.status === "ready" || cache.whisper > 0 ? "ready" : live.whisper.status;
    let whisperText = "";
    if (wStatus === "ready") whisperText = cache.whisper ? prettySize(cache.whisper) : live.whisper.total ? prettySize(live.whisper.total) : "";
    else if (wStatus === "loading") whisperText = live.whisper.total > 0 ? prettySize(live.whisper.loaded) : "";
    else whisperText = t.pending;
    setRow("whisper", wStatus, whisperText);

    // Traducción: bajo demanda; "listo" si ya está en caché.
    const tStatus: ModelStatus = cache.translation > 0 ? "ready" : live.translation.status;
    setRow("translation", tStatus, tStatus === "ready" ? prettySize(cache.translation) : t.pending);

    const loading = live.ffmpeg.status === "loading" || wStatus === "loading" || tStatus === "loading";
    const warmedReady = live.ffmpeg.status === "ready" && wStatus === "ready";
    const state = loading ? "loading" : warmedReady || cache.total > 0 ? "ready" : "idle";
    root.dataset.state = state;

    const ratio = loading ? (progress(live.ffmpeg) + progress({ ...live.whisper, status: wStatus })) / 2 : state === "ready" ? 1 : 0;
    bar.style.width = `${Math.round(ratio * 100)}%`;
    titleEl.textContent = loading ? t.loading : t.title;
    summary.textContent = state === "ready" ? t.ready : "";

    // Anuncia al lector de pantalla solo en transiciones de estado (no cada %).
    const msg = state === "loading" ? t.loading : state === "ready" ? t.ready : "";
    if (msg && msg !== announced) liveRegion.textContent = msg;
    announced = msg;

    clearBtn.hidden = cache.total === 0;
    clearBtn.disabled = false;
    clearBtn.textContent = cache.total ? `${t.clear} (${prettySize(cache.total)})` : t.clear;
  }

  async function refreshCache(): Promise<void> {
    cache = await modelSizes();
    render();
  }

  async function fetchFfmpegSize(): Promise<void> {
    if (ffmpegSize) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}ffmpeg/ffmpeg-core.wasm`, { method: "HEAD" });
      ffmpegSize = Number(res.headers.get("content-length")) || 0;
      render();
    } catch {
      /* sin tamaño: se omite */
    }
  }

  // Estado en vivo del cargador → re-render inmediato.
  subscribeModels((s) => {
    live = s;
    if (s.ffmpeg.status === "ready") void fetchFfmpegSize();
    if (s.whisper.status === "ready") void refreshCache(); // ya cacheado: tamaño real
    render();
  });

  function open(show: boolean): void {
    // Al cerrar, si el foco estaba dentro, devuélvelo al disparador.
    if (!show && panel.contains(document.activeElement)) toggle.focus();
    panel.hidden = !show;
    toggle.setAttribute("aria-expanded", String(show));
    if (show) void refreshCache();
  }

  toggle.addEventListener("click", () => open(panel.hidden));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) open(false);
  });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !root.contains(e.target as Node)) open(false);
  });

  clearBtn.addEventListener("click", async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = d().clearing;
    await Promise.all((await modelCacheNames()).map((k) => caches.delete(k)));
    cache = { whisper: 0, translation: 0, total: 0 };
    render();
    summary.textContent = d().cleared;
    liveRegion.textContent = d().cleared;
  });

  void refreshCache(); // estado inicial del badge (verde si ya hay modelos cacheados)
}
