// Controles de export en la barra superior del editor (inline):
// descargar .srt, formato (MP4/WebM), calidad y descargar vídeo con subtítulos
// quemados. Sin modal: el progreso/errores se muestran en un estado aria-live.

import { session } from "@/scripts/session";
import { toSrt, toVtt, toAss } from "@/scripts/subtitles";
import { exportVideo, type ExportFormat, type ExportQuality } from "@/scripts/export/videoExport";

let subBtn: HTMLButtonElement;
let subFormatSel: HTMLSelectElement;
let videoBtn: HTMLButtonElement;
let formatSel: HTMLSelectElement;
let qualitySel: HTMLSelectElement;
let statusEl: HTMLElement;
let exporting = false;

const SUB_SERIALIZERS = {
  srt: { ext: "srt", mime: "text/plain;charset=utf-8", run: () => toSrt(session.segments) },
  vtt: { ext: "vtt", mime: "text/vtt;charset=utf-8", run: () => toVtt(session.segments) },
  ass: { ext: "ass", mime: "text/plain;charset=utf-8", run: () => toAss(session.segments, session.style) },
} as const;

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
  subBtn.disabled = busy;
  subFormatSel.disabled = busy;
  videoBtn.disabled = busy || session.kind !== "video" || !session.objectUrl || !session.file;
  formatSel.disabled = busy;
  qualitySel.disabled = busy;
}

// Resincroniza el estado (el botón de vídeo se deshabilita en sesiones de solo
// audio). Se llama al entrar al editor, cuando ya se conoce session.kind.
export function refreshExportControls(): void {
  if (subBtn) setBusy(false);
}

async function runVideo(): Promise<void> {
  if (exporting || session.kind !== "video" || !session.objectUrl || !session.file) return;
  const t = window.__I18N__.export;
  setBusy(true);
  statusEl.textContent = `${t.generating} 0%`;
  let lastPct = 0;
  try {
    // Asegura que Outfit esté cargada para el canvas del export (mismo reparto
    // en líneas que la preview).
    if (document.fonts?.ready) await document.fonts.ready;
    const { blob, ext } = await exportVideo(
      { file: session.file, objectUrl: session.objectUrl },
      session.segments,
      session.style,
      { format: formatSel.value as ExportFormat, quality: qualitySel.value as ExportQuality },
      (ratio) => {
        const pct = Math.round(ratio * 100);
        if (pct === lastPct) return; // no inundar la región aria-live con el mismo %
        lastPct = pct;
        statusEl.textContent = `${t.generating} ${pct}%`;
      },
    );
    download(blob, `${baseName()}-${activeLang()}.${ext}`);
    statusEl.textContent = "";
  } catch {
    statusEl.textContent = t.error;
  } finally {
    setBusy(false);
    if (!videoBtn.disabled) videoBtn.focus(); // devuelve el foco tras el export
  }
}

export function initExportControls(): void {
  subBtn = document.querySelector<HTMLButtonElement>('[data-export="sub"]')!;
  if (!subBtn) return;
  subFormatSel = document.querySelector<HTMLSelectElement>('[data-export="subformat"]')!;
  videoBtn = document.querySelector<HTMLButtonElement>('[data-export="video"]')!;
  formatSel = document.querySelector<HTMLSelectElement>('[data-export="format"]')!;
  qualitySel = document.querySelector<HTMLSelectElement>('[data-export="quality"]')!;
  statusEl = document.querySelector<HTMLElement>('[data-export="status"]')!;

  subBtn.addEventListener("click", () => {
    const fmt = (subFormatSel.value as keyof typeof SUB_SERIALIZERS) in SUB_SERIALIZERS ? (subFormatSel.value as keyof typeof SUB_SERIALIZERS) : "srt";
    const { ext, mime, run } = SUB_SERIALIZERS[fmt];
    download(new Blob([run()], { type: mime }), `${baseName()}-${activeLang()}.${ext}`);
  });
  videoBtn.addEventListener("click", () => void runVideo());
}
