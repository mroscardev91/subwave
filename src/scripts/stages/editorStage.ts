// Editor: preview con overlay del subtítulo activo, lista de segmentos editable
// (texto + tiempos), timeline con scrubbing/playhead, undo/redo y estilo en vivo.

import { session } from "@/scripts/session";
import { formatTimecode } from "@/scripts/subtitles";
import * as segs from "@/scripts/editorSegments";
import * as history from "@/scripts/editorHistory";
import * as timeline from "@/scripts/timeline";
import { applyBubbleStyle, positionToAlign, type SubtitleFont, type SubtitlePosition } from "@/scripts/subtitleStyle";

let stage: HTMLElement;
let video: HTMLVideoElement;
let audio: HTMLAudioElement;
let media: HTMLMediaElement | null = null;
let overlay: HTMLElement;
let bubble: HTMLElement;
let listEl: HTMLElement;
let emptyEl: HTMLElement;
let undoBtn: HTMLButtonElement;
let redoBtn: HTMLButtonElement;
let wired = false;
let activeId: string | null = null;
let textDirty = false;

function q<T extends HTMLElement>(sel: string): T {
  return stage.querySelector<T>(sel)!;
}

export function initEditorStage(): void {
  if (wired) return;
  const root = document.querySelector<HTMLElement>('[data-stage="editor"]');
  if (!root) return;
  stage = root;

  video = q('[data-editor="video"]');
  audio = q('[data-editor="audio"]');
  overlay = q('[data-editor="overlay"]');
  bubble = q('[data-editor="bubble"]');
  listEl = q('[data-editor="segments"]');
  emptyEl = q('[data-editor="empty"]');
  undoBtn = q('[data-editor="undo"]');
  redoBtn = q('[data-editor="redo"]');

  timeline.initTimeline({
    track: q('[data-editor="timeline-track"]'),
    blocks: q('[data-editor="timeline-blocks"]'),
    playhead: q('[data-editor="timeline-playhead"]'),
    onSeek: seek,
  });

  undoBtn.addEventListener("click", doUndo);
  redoBtn.addEventListener("click", doRedo);

  document.addEventListener("keydown", (event) => {
    if (stage.hidden) return;
    const editing = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement;
    if (editing) return; // deja el undo nativo del campo de texto
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) doRedo();
    else doUndo();
  });

  for (const m of [video, audio]) {
    m.addEventListener("timeupdate", () => onTimeUpdate(m));
  }

  wireStyleControls();
  segs.onChange(onSegmentsChange);
  history.onChange(updateUndoRedo);

  wired = true;
}

/** Llamado al entrar en el editor con una transcripción nueva. */
export function enterEditor(): void {
  initEditorStage();
  segs.init();
  mountMedia();
  applyStyleToControls();
  applyStyle();
  renderList();
  timeline.renderBlocks();
  timeline.setPlayhead(0);
  activeId = null;
  updateOverlay();
  updateUndoRedo();
}

function mountMedia(): void {
  video.pause();
  audio.pause();
  const url = session.objectUrl;
  if (session.kind === "video" && url) {
    video.src = url;
    video.hidden = false;
    audio.hidden = true;
    media = video;
  } else if (url) {
    audio.src = url;
    audio.hidden = false;
    video.hidden = true;
    media = audio;
  } else {
    media = null;
    video.hidden = true;
    audio.hidden = true;
  }
}

function seek(time: number): void {
  if (media) media.currentTime = time;
  timeline.setPlayhead(time);
  refreshActive(time);
}

function onTimeUpdate(m: HTMLMediaElement): void {
  if (m !== media) return;
  timeline.setPlayhead(m.currentTime);
  refreshActive(m.currentTime);
}

function refreshActive(time: number): void {
  const active = segs.segmentAt(time);
  const id = active?.id ?? null;
  if (id !== activeId) {
    activeId = id;
    timeline.highlightActive(id);
    updateRowStates();
  }
  setBubble(active?.text ?? "");
}

function updateOverlay(): void {
  refreshActive(media?.currentTime ?? 0);
}

function setBubble(text: string): void {
  bubble.textContent = text;
  bubble.style.display = text ? "" : "none";
}

// ---- estilo ----

function styleEl<T extends HTMLElement>(name: string): T {
  return q<T>(`[data-style="${name}"]`);
}

function wireStyleControls(): void {
  styleEl<HTMLSelectElement>("font").addEventListener("change", (e) => {
    session.style.font = (e.target as HTMLSelectElement).value as SubtitleFont;
    applyStyle();
  });
  styleEl<HTMLInputElement>("size").addEventListener("input", (e) => {
    session.style.size = Number((e.target as HTMLInputElement).value);
    applyStyle();
  });
  styleEl<HTMLInputElement>("color").addEventListener("input", (e) => {
    session.style.color = (e.target as HTMLInputElement).value;
    applyStyle();
  });
  styleEl<HTMLInputElement>("bg").addEventListener("input", (e) => {
    session.style.bg = (e.target as HTMLInputElement).value;
    applyStyle();
  });
  styleEl<HTMLInputElement>("bgOpacity").addEventListener("input", (e) => {
    session.style.bgOpacity = Number((e.target as HTMLInputElement).value) / 100;
    applyStyle();
  });
  styleEl<HTMLInputElement>("outline").addEventListener("change", (e) => {
    session.style.outline = (e.target as HTMLInputElement).checked;
    applyStyle();
  });
  styleEl<HTMLSelectElement>("position").addEventListener("change", (e) => {
    session.style.position = (e.target as HTMLSelectElement).value as SubtitlePosition;
    applyStyle();
  });
}

function applyStyleToControls(): void {
  const s = session.style;
  styleEl<HTMLSelectElement>("font").value = s.font;
  styleEl<HTMLInputElement>("size").value = String(s.size);
  styleEl<HTMLInputElement>("color").value = s.color;
  styleEl<HTMLInputElement>("bg").value = s.bg;
  styleEl<HTMLInputElement>("bgOpacity").value = String(Math.round(s.bgOpacity * 100));
  styleEl<HTMLInputElement>("outline").checked = s.outline;
  styleEl<HTMLSelectElement>("position").value = s.position;
}

function applyStyle(): void {
  applyBubbleStyle(bubble, session.style);
  overlay.style.alignItems = positionToAlign(session.style.position);
}

// ---- lista de segmentos (editable) ----

function renderList(): void {
  if (session.segments.length === 0) {
    listEl.replaceChildren();
    emptyEl.textContent = window.__I18N__.editor.empty;
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  const t = window.__I18N__.editor;
  const selected = segs.getSelectedId();
  listEl.replaceChildren();

  for (const s of session.segments) {
    const li = document.createElement("li");
    li.dataset.segId = s.id;
    li.className = `seg-row rounded-lg border border-transparent bg-on-deep-soft/10 p-2.5${s.id === selected ? " is-selected" : ""}`;

    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-2";

    const seek = document.createElement("button");
    seek.type = "button";
    seek.dataset.segSeek = "";
    seek.className = "rounded px-1 font-mono text-xs text-aqua focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua";
    seek.textContent = formatTimecode(s.start);
    seek.addEventListener("click", () => {
      segs.select(s.id);
      seekTo(s.start);
    });

    const times = document.createElement("div");
    times.className = "flex items-center gap-1";
    const startIn = numberInput(s.start, t.segStart, "start");
    const endIn = numberInput(s.end, t.segEnd, "end");
    startIn.addEventListener("focus", () => segs.select(s.id));
    endIn.addEventListener("focus", () => segs.select(s.id));
    const commitTiming = () => {
      // Campo vacío / no numérico → restaura, no apliques 0.
      if (startIn.value === "" || endIn.value === "" || !Number.isFinite(startIn.valueAsNumber) || !Number.isFinite(endIn.valueAsNumber)) {
        syncTimingInputs(s.id, startIn, endIn);
        return;
      }
      segs.updateTiming(s.id, startIn.valueAsNumber, endIn.valueAsNumber);
    };
    startIn.addEventListener("change", commitTiming);
    endIn.addEventListener("change", commitTiming);
    times.append(startIn, endIn);

    row.append(seek, times);

    const text = document.createElement("textarea");
    text.dataset.segText = "";
    text.rows = 2;
    text.value = s.text;
    text.setAttribute("aria-label", window.__I18N__.editor.segText);
    text.className = "mt-2 w-full resize-none rounded-lg border border-on-deep-soft/20 bg-deep px-2.5 py-1.5 text-sm text-on-deep focus-visible:outline-none focus-visible:border-aqua focus-visible:ring-2 focus-visible:ring-aqua";
    text.addEventListener("focus", () => segs.select(s.id));
    text.addEventListener("input", () => {
      segs.setText(s.id, text.value);
      textDirty = true;
    });
    text.addEventListener("change", () => {
      if (textDirty) {
        segs.commit();
        textDirty = false;
      }
    });

    li.append(row, text);
    listEl.appendChild(li);
  }
  updateRowStates();
}

function numberInput(value: number, label: string, field: "start" | "end"): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.1";
  input.value = String(value);
  input.dataset.segField = field;
  input.setAttribute("aria-label", label);
  input.className = "w-16 rounded-lg border border-on-deep-soft/20 bg-deep px-2 py-1 font-mono text-xs text-on-deep focus-visible:outline-none focus-visible:border-aqua focus-visible:ring-2 focus-visible:ring-aqua";
  return input;
}

function syncTimingInputs(id: string, startIn: HTMLInputElement, endIn: HTMLInputElement): void {
  const seg = session.segments.find((s) => s.id === id);
  if (!seg) return;
  startIn.value = String(seg.start);
  endIn.value = String(seg.end);
}

/** Refresca selección/activo y los chips de tiempo sin reconstruir (preserva foco). */
function updateRowStates(): void {
  const selected = segs.getSelectedId();
  for (const li of listEl.querySelectorAll<HTMLElement>(".seg-row")) {
    const id = li.dataset.segId;
    li.classList.toggle("is-selected", id === selected);
    li.classList.toggle("is-active", id === activeId);
    const seg = session.segments.find((s) => s.id === id);
    if (!seg) continue;
    const chip = li.querySelector<HTMLElement>("[data-seg-seek]");
    if (chip) chip.textContent = formatTimecode(seg.start);
    // Resincroniza los inputs con el modelo (refleja el clamp), sin tocar el foco.
    for (const input of li.querySelectorAll<HTMLInputElement>("[data-seg-field]")) {
      if (input === document.activeElement) continue;
      input.value = String(input.dataset.segField === "start" ? seg.start : seg.end);
    }
  }
}

function onSegmentsChange(): void {
  updateRowStates();
  timeline.renderBlocks();
  updateOverlay();
}

// ---- undo/redo ----

function doUndo(): void {
  const snap = history.undo();
  if (!snap) return;
  segs.applySnapshot(snap);
  renderList();
  timeline.renderBlocks();
  applyStyleToControls();
  updateOverlay();
  focusAfterHistory();
}

function doRedo(): void {
  const snap = history.redo();
  if (!snap) return;
  segs.applySnapshot(snap);
  renderList();
  timeline.renderBlocks();
  applyStyleToControls();
  updateOverlay();
  focusAfterHistory();
}

// Tras reconstruir la lista (y posiblemente deshabilitar el botón con foco),
// devuelve el foco a un control estable.
function focusAfterHistory(): void {
  if (!undoBtn.disabled) undoBtn.focus();
  else if (!redoBtn.disabled) redoBtn.focus();
  else stage.querySelector<HTMLElement>("[data-stage-heading]")?.focus();
}

function updateUndoRedo(): void {
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}

// helper para evitar choque de nombre con el `seek` local del listado
function seekTo(time: number): void {
  seek(time);
}
