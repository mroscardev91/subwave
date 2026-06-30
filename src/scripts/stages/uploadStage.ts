// Etapa de upload: drag & drop / selección de archivo, validación de tipo y
// extracción de audio (FFmpeg WASM) con progreso. Habilita "Continuar" solo
// cuando el audio está listo. El archivo nunca se sube: se lee en local.

import { extractAudio, NoAudioError, type ExtractPhase } from "@/scripts/media/audio";
import { session, setFile, setAudio, resetMedia, type MediaKind } from "@/scripts/session";

const VIDEO_EXT = ["mp4", "mov", "webm", "mkv"];
const AUDIO_EXT = ["mp3", "wav", "ogg"];

// Aviso suave (no bloquea): archivos grandes/largos tardan y consumen RAM al
// procesarse en el navegador.
const WARN_BYTES = 500 * 1024 * 1024; // 500 MB
const WARN_SECONDS = 30 * 60; // 30 min

// Token de generación: cada selección/reset lo incrementa; una extracción en
// curso descarta su resultado si el token cambió (evita "completados zombi").
let activeJob = 0;

function detectKind(file: File): MediaKind | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && VIDEO_EXT.includes(ext)) return "video";
  if (ext && AUDIO_EXT.includes(ext)) return "audio";
  return null;
}

function fmtTime(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function initUploadStage(): void {
  const stage = document.querySelector<HTMLElement>('[data-stage="upload"]');
  if (!stage) return;

  const t = window.__I18N__.upload;
  const q = <T extends HTMLElement>(sel: string) => stage.querySelector<T>(sel)!;

  const dropzone = q<HTMLLabelElement>('[data-upload="dropzone"]');
  const input = q<HTMLInputElement>("#file-input");
  const selected = q('[data-upload="selected"]');
  const previewVideo = q<HTMLVideoElement>('[data-upload="preview-video"]');
  const previewAudio = q('[data-upload="preview-audio"]');
  const nameEl = q('[data-upload="name"]');
  const metaEl = q('[data-upload="meta"]');
  const resetBtn = q('[data-upload="reset"]');
  const progress = q('[data-upload="progress"]');
  const statusEl = q('[data-upload="status"]');
  const pctEl = q('[data-upload="pct"]');
  const barTrack = q('[data-upload="bar-track"]');
  const bar = q<HTMLElement>('[data-upload="bar"]');
  const ready = q('[data-upload="ready"]');
  const readyText = q('[data-upload="ready-text"]');
  const readyDur = q('[data-upload="ready-dur"]');
  const errorBox = q('[data-upload="error"]');
  const errorText = q('[data-upload="error-text"]');
  const warnBox = q('[data-upload="warn"]');
  const warnText = q('[data-upload="warn-text"]');
  const continueBtn = q<HTMLButtonElement>("#upload-continue");

  const showWarn = () => {
    warnText.textContent = t.warnLarge;
    warnBox.hidden = false;
  };

  const setBar = (ratio: number) => {
    const pct = Math.round(ratio * 100);
    bar.style.width = `${pct}%`;
    barTrack.setAttribute("aria-valuenow", String(pct));
  };

  function showError(message: string): void {
    progress.hidden = true;
    ready.hidden = true;
    errorText.textContent = message;
    errorBox.hidden = false;
    continueBtn.disabled = true;
  }

  function reset(): void {
    activeJob++; // descarta cualquier extracción en curso
    resetMedia();
    input.value = "";
    selected.hidden = true;
    previewVideo.hidden = true;
    previewVideo.removeAttribute("src");
    previewAudio.hidden = true;
    progress.hidden = true;
    ready.hidden = true;
    errorBox.hidden = true;
    warnBox.hidden = true;
    resetBtn.disabled = false;
    dropzone.hidden = false;
    continueBtn.disabled = true;
    input.focus(); // devuelve el foco al selector de archivo
  }

  async function onSelect(file: File): Promise<void> {
    const job = ++activeJob;
    warnBox.hidden = true; // se reevalúa por tamaño/duración en cada selección
    const kind = detectKind(file);
    if (!kind) {
      // Show the selected panel just to host the error + "choose another".
      dropzone.hidden = true;
      selected.hidden = false;
      nameEl.textContent = file.name;
      metaEl.textContent = fmtSize(file.size);
      showError(t.errorUnsupported);
      nameEl.focus();
      return;
    }

    setFile(file, kind);
    dropzone.hidden = true;
    selected.hidden = false;
    errorBox.hidden = true;
    ready.hidden = true;
    warnBox.hidden = true;
    nameEl.textContent = file.name;
    metaEl.textContent = `${fmtSize(file.size)} · ${kind === "video" ? t.kindVideo : t.kindAudio}`;
    nameEl.focus();
    if (file.size > WARN_BYTES) showWarn(); // por tamaño (la duración se sabe tras extraer)

    if (kind === "video") {
      previewVideo.src = session.objectUrl!;
      previewVideo.hidden = false;
      previewAudio.hidden = true;
    } else {
      previewAudio.hidden = false;
      previewVideo.hidden = true;
    }

    // Mientras se extrae, bloquea "elegir otro" para no lanzar una 2ª extracción
    // concurrente sobre el mismo FFmpeg (comparten rutas en MEMFS).
    resetBtn.disabled = true;
    continueBtn.disabled = true;
    progress.hidden = false;
    statusEl.textContent = t.loadingEngine;
    pctEl.textContent = "";
    setBar(0.05);

    try {
      const result = await extractAudio(file, {
        onPhase: (phase: ExtractPhase) => {
          if (phase === "extracting") {
            statusEl.textContent = t.extracting;
            setBar(0);
            pctEl.textContent = "0%";
          }
        },
        onProgress: (ratio) => {
          setBar(ratio);
          pctEl.textContent = `${Math.round(ratio * 100)}%`;
        },
      });

      if (job !== activeJob) return; // superado por un reset/nueva selección
      setAudio(result.audio, result.sampleRate, result.duration);
      if (result.duration > WARN_SECONDS) showWarn(); // por duración real
      progress.hidden = true;
      ready.hidden = false;
      readyText.textContent = t.ready;
      readyDur.textContent = `· ${fmtTime(result.duration)}`;
      resetBtn.disabled = false;
      continueBtn.disabled = false;
    } catch (err) {
      if (job !== activeJob) return;
      resetBtn.disabled = false;
      showError(err instanceof NoAudioError ? t.errorNoAudio : t.errorGeneric);
    }
  }

  // File picker
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) void onSelect(file);
  });

  // Drag & drop on the dropzone
  const setDragging = (on: boolean) => dropzone.classList.toggle("is-dragging", on);
  dropzone.addEventListener("dragenter", (e) => { e.preventDefault(); setDragging(true); });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); setDragging(true); });
  dropzone.addEventListener("dragleave", () => setDragging(false));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void onSelect(file);
  });

  // Prevent the browser from navigating when a file is dropped outside the zone.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  resetBtn.addEventListener("click", reset);
}
