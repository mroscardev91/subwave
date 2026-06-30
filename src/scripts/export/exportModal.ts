// Controles de export en la barra superior del editor (estilo subvid, inline):
// descargar .srt, formato (MP4/WebM), calidad y descargar vídeo con subtítulos
// quemados. Sin modal: el progreso/errores se muestran en un estado aria-live.

import { session } from "@/scripts/session";
import { toSrt } from "@/scripts/subtitles";
import { exportVideo, type ExportFormat, type ExportQuality } from "@/scripts/export/videoExport";

let srtBtn: HTMLButtonElement;
let videoBtn: HTMLButtonElement;
let formatSel: HTMLSelectElement;
let qualitySel: HTMLSelectElement;
let statusEl: HTMLElement;
let exporting = false;

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

function setBusy(busy: boolean): void {
  exporting = busy;
  srtBtn.disabled = busy;
  videoBtn.disabled = busy || session.kind !== "video" || !session.objectUrl || !session.file;
  formatSel.disabled = busy;
  qualitySel.disabled = busy;
}

async function runVideo(): Promise<void> {
  if (exporting || session.kind !== "video" || !session.objectUrl || !session.file) return;
  const t = window.__I18N__.export;
  setBusy(true);
  statusEl.textContent = `${t.generating} 0%`;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const { blob, ext } = await exportVideo(
      { file: session.file, objectUrl: session.objectUrl },
      session.segments,
      session.style,
      { format: formatSel.value as ExportFormat, quality: qualitySel.value as ExportQuality },
      (ratio) => {
        statusEl.textContent = `${t.generating} ${Math.round(ratio * 100)}%`;
      },
    );
    download(blob, `${baseName()}-${activeLang()}.${ext}`);
    statusEl.textContent = "";
  } catch {
    statusEl.textContent = t.error;
  } finally {
    setBusy(false);
  }
}

export function initExportModal(): void {
  srtBtn = document.querySelector('[data-export="srt"]')!;
  if (!srtBtn) return;
  videoBtn = document.querySelector('[data-export="video"]')!;
  formatSel = document.querySelector('[data-export="format"]')!;
  qualitySel = document.querySelector('[data-export="quality"]')!;
  statusEl = document.querySelector('[data-export="status"]')!;

  srtBtn.addEventListener("click", () => {
    download(new Blob([toSrt(session.segments)], { type: "text/plain;charset=utf-8" }), `${baseName()}-${activeLang()}.srt`);
  });
  videoBtn.addEventListener("click", () => void runVideo());
}
