// Punto de entrada de la SPA. Cablea las acciones declaradas con [data-action]
// a la navegación de stageManager. Las etapas se montan en el HTML estático;
// aquí solo se orquesta la transición entre ellas.

import { init, enterApp, exitApp, next, back, goTo, type StageName } from "@/scripts/stageManager";
import { initUploadStage } from "@/scripts/stages/uploadStage";
import { initConfigStage, ASR_MODEL } from "@/scripts/stages/configStage";
import { initEditorStage } from "@/scripts/stages/editorStage";
import { initExportControls } from "@/scripts/export/exportBar";
import { initDownloads } from "@/scripts/downloads";
import { ensureAsr } from "@/scripts/transformersClient";

function onReady(fn: () => void): void {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

// Precarga el modelo de transcripción en segundo plano al ENTRAR a la app (no en
// la landing: así no se bajan ~150 MB a quien solo mira). Para cuando el usuario
// suba el archivo y configure, ya estará cacheado en IndexedDB → la transcripción
// no espera la descarga. Idempotente y deduplicado en el worker.
let prefetched = false;
function prefetchModels(): void {
  if (prefetched) return;
  // Respeta Save-Data / ahorro de datos: no bajar pesos sin acción explícita.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  prefetched = true;
  const run = () => void ensureAsr(ASR_MODEL, { webgpu: false }).catch(() => {});
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else setTimeout(run, 1000);
}

onReady(() => {
  init();
  initUploadStage();
  initConfigStage();
  initEditorStage();
  initExportControls();
  initDownloads();

  document.addEventListener("click", (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!trigger) return;

    switch (trigger.dataset.action) {
      case "start":
        event.preventDefault();
        enterApp();
        prefetchModels(); // entra a la app → empieza a bajar el modelo en background
        break;
      case "home":
        event.preventDefault();
        exitApp();
        break;
      case "next":
        event.preventDefault();
        next();
        break;
      case "back":
        event.preventDefault();
        back();
        break;
      case "goto":
        event.preventDefault();
        goTo(trigger.dataset.target as StageName);
        break;
    }
  });
});
