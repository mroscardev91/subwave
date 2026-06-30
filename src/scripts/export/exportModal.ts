// Modal de export: descarga .srt (siempre) y vídeo con subtítulos quemados
// (solo si la sesión es vídeo). Opera sobre la pista activa.

import { session } from "@/scripts/session";
import { toSrt } from "@/scripts/subtitles";
import { exportVideo } from "@/scripts/export/videoExport";

let overlay: HTMLElement;
let srtBtn: HTMLButtonElement;
let videoBtn: HTMLButtonElement;
let closeBtn: HTMLButtonElement;
let progress: HTMLElement;
let statusEl: HTMLElement;
let pctEl: HTMLElement;
let bar: HTMLElement;
let errorEl: HTMLElement;
let lastFocus: HTMLElement | null = null;
let exporting = false;

// Saca el resto de la app del orden de tabulación y del árbol de accesibilidad
// mientras el modal está abierto (trampa de foco para el diálogo modal).
function setBackgroundInert(on: boolean): void {
  for (const el of document.querySelectorAll("#app > main, #app > header")) {
    if (on) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function baseName(): string {
  return (session.file?.name ?? "subwave").replace(/\.[^.]+$/, "");
}
function activeLang(): string {
  return session.tracks[session.activeTrack]?.lang ?? "";
}

function open(): void {
  lastFocus = document.activeElement as HTMLElement;
  videoBtn.disabled = session.kind !== "video" || !session.objectUrl || !session.file;
  progress.hidden = true;
  errorEl.hidden = true;
  srtBtn.disabled = false;
  overlay.hidden = false;
  setBackgroundInert(true);
  closeBtn.focus();
}

function close(): void {
  if (exporting) return; // no cerrar a mitad de un render
  overlay.hidden = true;
  setBackgroundInert(false);
  lastFocus?.focus();
}

function setBar(ratio: number): void {
  const pct = Math.round(ratio * 100);
  bar.style.width = `${pct}%`;
  pctEl.textContent = `${pct}%`;
  bar.parentElement?.setAttribute("aria-valuenow", String(pct));
}

async function runVideo(): Promise<void> {
  if (exporting || session.kind !== "video" || !session.objectUrl || !session.file) return;
  exporting = true;
  const t = window.__I18N__.export;
  srtBtn.disabled = true;
  videoBtn.disabled = true;
  closeBtn.disabled = true;
  errorEl.hidden = true;
  progress.hidden = false;
  statusEl.textContent = t.rendering;
  setBar(0);
  progress.focus(); // el botón activo se deshabilita; mantén el foco dentro del diálogo
  try {
    const { blob, ext } = await exportVideo(
      { file: session.file, objectUrl: session.objectUrl },
      session.segments,
      session.style,
      setBar,
    );
    download(blob, `${baseName()}-${activeLang()}.${ext}`);
    progress.hidden = true;
  } catch {
    progress.hidden = true;
    errorEl.textContent = t.error;
    errorEl.hidden = false;
  } finally {
    srtBtn.disabled = false;
    videoBtn.disabled = session.kind !== "video";
    closeBtn.disabled = false;
    exporting = false;
    closeBtn.focus();
  }
}

export function initExportModal(): void {
  overlay = document.querySelector<HTMLElement>('[data-export="overlay"]')!;
  srtBtn = overlay.querySelector('[data-export="srt"]')!;
  videoBtn = overlay.querySelector('[data-export="video"]')!;
  closeBtn = overlay.querySelector('[data-export="close"]')!;
  progress = overlay.querySelector('[data-export="progress"]')!;
  statusEl = overlay.querySelector('[data-export="status"]')!;
  pctEl = overlay.querySelector('[data-export="pct"]')!;
  bar = overlay.querySelector('[data-export="bar"]')!;
  errorEl = overlay.querySelector('[data-export="error"]')!;

  document.querySelector('[data-editor="open-export"]')?.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (!overlay.hidden && e.key === "Escape") close();
  });

  srtBtn.addEventListener("click", () => {
    download(new Blob([toSrt(session.segments)], { type: "text/plain;charset=utf-8" }), `${baseName()}-${activeLang()}.srt`);
  });
  videoBtn.addEventListener("click", () => void runVideo());
}
