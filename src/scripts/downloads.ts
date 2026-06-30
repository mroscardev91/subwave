// Panel de modelos: muestra si los modelos de IA están cacheados y su tamaño
// aproximado, y permite borrarlos. transformers.js los guarda en la Cache API
// (nombre "transformers-cache"); borrarlos solo obliga a re-descargarlos.

const MODEL_CACHE_RE = /transformers|onnx|hugging|hf-/i;

async function modelCacheKeys(): Promise<string[]> {
  if (!("caches" in window)) return [];
  try {
    const names = (await caches.keys()).filter((k) => MODEL_CACHE_RE.test(k));
    // Solo cachés con contenido real: transformers.js crea la clave antes de
    // guardar nada, así que una descarga abortada deja una caché vacía.
    const withEntries: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      if ((await cache.keys()).length) withEntries.push(name);
    }
    return withEntries;
  } catch {
    return [];
  }
}

async function usedMB(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    return est?.usage ? Math.round(est.usage / (1024 * 1024)) : null;
  } catch {
    return null;
  }
}

export function initDownloads(): void {
  const panel = document.querySelector<HTMLElement>("[data-downloads]");
  if (!panel) return;
  const statusEl = panel.querySelector<HTMLElement>('[data-downloads="status"]')!;
  const clearBtn = panel.querySelector<HTMLButtonElement>('[data-downloads="clear"]')!;
  const t = () => window.__I18N__.downloads;

  async function refresh(): Promise<void> {
    const keys = await modelCacheKeys();
    if (!keys.length) {
      statusEl.textContent = t().empty;
      clearBtn.hidden = true;
      return;
    }
    const mb = await usedMB();
    statusEl.textContent = mb ? `${t().cached} · ~${mb} MB` : t().cached;
    clearBtn.hidden = false;
  }

  clearBtn.addEventListener("click", async () => {
    clearBtn.disabled = true;
    statusEl.textContent = t().clearing;
    const keys = await modelCacheKeys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    statusEl.textContent = t().cleared;
    clearBtn.hidden = true;
    clearBtn.disabled = false;
  });

  // Re-lee el estado cada vez que el panel reaparece (p. ej. al volver del editor
  // tras descargar/borrar modelos en la misma sesión SPA), no solo al cargar.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void refresh();
    }).observe(panel);
  } else {
    void refresh();
  }
}
