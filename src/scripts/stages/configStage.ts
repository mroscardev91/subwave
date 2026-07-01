// Etapa de configuración: idioma hablado / de subtítulos y disparo de la
// transcripción (descarga del modelo con progreso → Whisper → segmentos →
// editor). La traducción OPUS-MT (cuando los idiomas difieren) llega en el Hito 6.

import { ensureAsr, transcribe, releaseAsr, releaseTranslation } from "@/scripts/transformersClient";
import { segmentsFromAsr } from "@/scripts/subtitles";
import { session, setTracks } from "@/scripts/session";
import { translateSegments } from "@/scripts/translate";
import { goTo, getCurrent } from "@/scripts/stageManager";
import { enterEditor } from "@/scripts/stages/editorStage";
import { pickAsrModel, pickAsrDtype } from "@/scripts/models";
import { markWhisperReady } from "@/scripts/modelLoader";

export function initConfigStage(): void {
  const stage = document.querySelector<HTMLElement>('[data-stage="config"]');
  if (!stage) return;

  const t = window.__I18N__.config;
  const q = <T extends HTMLElement>(sel: string) => stage.querySelector<T>(sel)!;

  const form = q('[data-config="form"]');
  const sourceSel = q<HTMLSelectElement>("#cfg-source");
  const targetSel = q<HTMLSelectElement>("#cfg-target");
  const backBtn = q<HTMLButtonElement>('[data-action="back"]');
  const transcribeBtn = q<HTMLButtonElement>("#config-transcribe");
  const progress = q('[data-config="progress"]');
  const statusEl = q('[data-config="status"]');
  const pctEl = q('[data-config="pct"]');
  const barTrack = q('[data-config="bar-track"]');
  const bar = q<HTMLElement>('[data-config="bar"]');
  const errorBox = q('[data-config="error"]');
  const errorText = q('[data-config="error-text"]');

  const setBar = (ratio: number | null) => {
    if (ratio === null) {
      bar.style.width = "100%";
      barTrack.removeAttribute("aria-valuenow");
      pctEl.textContent = "";
      return;
    }
    const pct = Math.round(ratio * 100);
    bar.style.width = `${pct}%`;
    barTrack.setAttribute("aria-valuenow", String(pct));
    pctEl.textContent = `${pct}%`;
  };

  function setBusy(busy: boolean): void {
    transcribeBtn.disabled = busy;
    backBtn.disabled = busy;
    sourceSel.disabled = busy;
    targetSel.disabled = busy;
  }

  async function run(): Promise<void> {
    if (!session.audio) return; // gated by upload; nothing to transcribe

    session.sourceLang = sourceSel.value === "auto" ? null : sourceSel.value;
    session.targetLang = targetSel.value || null;

    setBusy(true);
    errorBox.hidden = true;
    form.hidden = true;
    progress.hidden = false;
    statusEl.textContent = t.preparing;
    setBar(0);
    statusEl.focus(); // el botón pulsado se deshabilita; no pierdas el foco

    try {
      // Modelo + dtype según el dispositivo: whisper-tiny q8 en móvil (menos RAM,
      // evita OOM), base fp32 en escritorio (más preciso).
      await ensureAsr(pickAsrModel(), {
        dtype: pickAsrDtype(),
        // WASM a propósito: Whisper en WebGPU (transformers.js) es inestable según
        // GPU/driver y puede generar salida vacía sin lanzar, lo que rompería la
        // transcripción de forma silenciosa. El worker conserva la rama WebGPU
        // (con caída a WASM) para activarla con webgpu:true cuando madure.
        webgpu: false,
        onProgress: (p) => {
          if (p?.status === "progress" && typeof p.progress === "number") {
            statusEl.textContent = t.downloading;
            setBar(p.progress / 100);
          }
        },
      });

      // La inferencia no reporta progreso fino: barra indeterminada (llena).
      statusEl.textContent = t.transcribing;
      setBar(null);

      const output = await transcribe(session.audio, session.sourceLang ?? undefined);
      markWhisperReady(); // refleja en el panel (en móvil no hubo warm)
      releaseAsr(); // libera el modelo (~150-290 MB): el editor no lo usa
      const srcCode = session.sourceLang ?? "auto";

      // Aspect ratio del vídeo → trozos más cortos en vertical.
      let aspectRatio = 16 / 9;
      if (session.kind === "video" && session.objectUrl) {
        const v = document.createElement("video");
        v.src = session.objectUrl;
        v.muted = true;
        try {
          await new Promise<void>((res, rej) => {
            v.onloadedmetadata = () => res();
            v.onerror = () => rej(new Error("meta"));
            setTimeout(() => rej(new Error("timeout")), 4000);
          });
          if (v.videoWidth && v.videoHeight) aspectRatio = v.videoWidth / v.videoHeight;
        } catch {
          /* usa el valor por defecto */
        }
      }
      const tracks = [{ lang: srcCode, segments: segmentsFromAsr(output, { aspectRatio }) }];

      // Si el idioma de salida difiere (y conocemos el de origen), traduce con OPUS-MT.
      if (session.targetLang && session.targetLang !== srcCode && srcCode !== "auto") {
        const translated = await translateSegments(tracks[0].segments, srcCode, session.targetLang, {
          onPhase: (phase) => {
            statusEl.textContent = phase === "loading" ? t.downloadingTr : t.translating;
            setBar(phase === "loading" ? 0 : null);
          },
          onProgress: (p) => {
            if (p?.status === "progress" && typeof p.progress === "number") setBar(p.progress / 100);
          },
        });
        tracks.push({ lang: session.targetLang, segments: translated });
      }
      releaseTranslation(); // libera OPUS-MT (~300 MB) antes de editar/reproducir
      setTracks(tracks);

      // Restaura el formulario por si se vuelve a esta etapa.
      progress.hidden = true;
      form.hidden = false;
      setBusy(false);

      // Si el usuario navegó fuera durante la transcripción, no secuestres la
      // navegación llevándolo al editor.
      if (getCurrent() !== "config") return;
      enterEditor();
      goTo("editor");
    } catch (err) {
      // Libera los modelos pesados aunque falle (p. ej. OOM en la inferencia):
      // no deben quedar residentes al volver al formulario / cambiar de etapa.
      releaseAsr();
      releaseTranslation();
      progress.hidden = true;
      form.hidden = false;
      setBusy(false);
      console.error("[config] transcription failed:", err);
      // Muestra el detalle en pantalla (diagnóstico en móvil, sin consola).
      const detail = err instanceof Error ? err.message : String(err);
      errorText.textContent = detail ? `${t.errorGeneric} [${detail}]` : t.errorGeneric;
      errorBox.hidden = false;
      errorBox.focus();
    }
  }

  transcribeBtn.addEventListener("click", () => void run());

  // La traducción (OPUS-MT) necesita un idioma de origen conocido. Con
  // autodetectar no se puede, así que se deshabilita el destino.
  function syncTarget(): void {
    const auto = sourceSel.value === "auto";
    targetSel.disabled = auto;
    if (auto) targetSel.value = "";
  }
  sourceSel.addEventListener("change", syncTarget);
  syncTarget();
}
