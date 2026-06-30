// Panel de modelos (badge arriba a la derecha): muestra qué modelos de IA hay en
// caché y su tamaño, y permite borrarlos. transformers.js los guarda en la Cache
// API; borrarlos solo obliga a re-descargarlos al siguiente uso.

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
  const summary = root.querySelector<HTMLElement>('[data-downloads="summary"]')!;
  const whisperEl = root.querySelector<HTMLElement>('[data-downloads="whisper"]')!;
  const translationEl = root.querySelector<HTMLElement>('[data-downloads="translation"]')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-downloads="clear"]')!;
  const d = () => window.__I18N__.downloads;

  async function refresh(): Promise<void> {
    const s = await modelSizes();
    whisperEl.textContent = s.whisper ? prettySize(s.whisper) : d().pending;
    translationEl.textContent = s.translation ? prettySize(s.translation) : d().pending;
    summary.textContent = s.total ? d().ready : d().empty;
    root.dataset.state = s.total ? "ready" : "idle";
    clearBtn.hidden = !s.total;
    clearBtn.disabled = false;
    clearBtn.textContent = s.total ? `${d().clear} (${prettySize(s.total)})` : d().clear;
  }

  function open(show: boolean): void {
    panel.hidden = !show;
    toggle.setAttribute("aria-expanded", String(show));
    if (show) void refresh();
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
    await refresh();
    summary.textContent = d().cleared;
  });

  void refresh(); // estado inicial del badge (verde si ya hay modelos)
}
