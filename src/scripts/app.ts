// Punto de entrada de la SPA. Cablea las acciones declaradas con [data-action]
// a la navegación de stageManager. Las etapas se montan en el HTML estático;
// aquí solo se orquesta la transición entre ellas.

import { init, enterApp, exitApp, next, back, goTo, type StageName } from "@/scripts/stageManager";
import { initUploadStage } from "@/scripts/stages/uploadStage";
import { initConfigStage } from "@/scripts/stages/configStage";
import { initEditorStage } from "@/scripts/stages/editorStage";

function onReady(fn: () => void): void {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

onReady(() => {
  init();
  initUploadStage();
  initConfigStage();
  initEditorStage();

  document.addEventListener("click", (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!trigger) return;

    switch (trigger.dataset.action) {
      case "start":
        event.preventDefault();
        enterApp();
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
