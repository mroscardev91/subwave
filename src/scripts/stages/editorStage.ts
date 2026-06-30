// Editor (layout estilo subvid): preview centrado con overlay del subtítulo
// activo, barra de reproducción propia, panel de tarjetas a la derecha
// (play + tiempos + texto + borrar + añadir línea), presets de estilo y timeline
// con el texto en los bloques. Undo/redo y estilo en vivo.

import { session, setActiveTrack, addTrack } from "@/scripts/session";
import { formatTimecode, formatTimecodeFull, parseTimecode } from "@/scripts/subtitles";
import * as segs from "@/scripts/editorSegments";
import * as history from "@/scripts/editorHistory";
import * as timeline from "@/scripts/timeline";
import { translateSegments } from "@/scripts/translate";
import { languageOptions, langLabel } from "@/scripts/languages";
import { applyBubbleStyle, positionBubble, stylePresets, type SubtitleFont, type SubtitlePosition } from "@/scripts/subtitleStyle";
import { fitSubtitle } from "@/scripts/export/subtitleRenderer";

const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const measureCtx = measureCanvas?.getContext("2d") ?? null;

let stage: HTMLElement;
let video: HTMLVideoElement;
let audio: HTMLAudioElement;
let media: HTMLMediaElement | null = null;
let previewEl: HTMLElement;
let overlay: HTMLElement;
let bubble: HTMLElement;
let previewHint: HTMLElement;
let listEl: HTMLElement;
let emptyEl: HTMLElement;
let countEl: HTMLElement;
let undoBtn: HTMLButtonElement;
let redoBtn: HTMLButtonElement;
let playBtn: HTMLButtonElement;
let timeEl: HTMLElement;
let filenameEl: HTMLElement;
let customPanel: HTMLElement;
let customizeBtn: HTMLButtonElement;
let tracksEl: HTMLElement;
let addLangSel: HTMLSelectElement;
let trackStatusEl: HTMLElement;
let wired = false;
let activeId: string | null = null;

function q<T extends HTMLElement>(sel: string): T {
  return stage.querySelector<T>(sel)!;
}

// Popover de estilo ("Personalizar"): visibilidad + estado ARIA en sincronía.
function setCustomPanel(open: boolean): void {
  customPanel.hidden = !open;
  customizeBtn.setAttribute("aria-expanded", String(open));
}

export function initEditorStage(): void {
  if (wired) return;
  const root = document.querySelector<HTMLElement>('[data-stage="editor"]');
  if (!root) return;
  stage = root;

  video = q('[data-editor="video"]');
  audio = q('[data-editor="audio"]');
  previewEl = q('[data-editor="preview"]');
  overlay = q('[data-editor="overlay"]');
  bubble = q('[data-editor="bubble"]');
  previewHint = q('[data-editor="preview-hint"]');
  listEl = q('[data-editor="segments"]');
  emptyEl = q('[data-editor="empty"]');
  countEl = q('[data-editor="count"]');
  undoBtn = q('[data-editor="undo"]');
  redoBtn = q('[data-editor="redo"]');
  playBtn = q('[data-editor="play"]');
  timeEl = q('[data-editor="time"]');
  filenameEl = q('[data-editor="filename"]');
  customPanel = q('[data-editor="custom"]');
  tracksEl = q('[data-editor="tracks"]');
  addLangSel = q('[data-editor="add-lang"]');
  trackStatusEl = q('[data-editor="track-status"]');

  timeline.initTimeline({
    track: q('[data-editor="timeline-track"]'),
    blocks: q('[data-editor="timeline-blocks"]'),
    playhead: q('[data-editor="timeline-playhead"]'),
    ruler: q('[data-editor="timeline-ruler"]'),
    onSeek: seek,
  });

  undoBtn.addEventListener("click", doUndo);
  redoBtn.addEventListener("click", doRedo);
  playBtn.addEventListener("click", togglePlay);
  q('[data-editor="preview"]').addEventListener("click", (e) => {
    if (e.target === playBtn || playBtn.contains(e.target as Node)) return;
    togglePlay();
  });
  q('[data-editor="add-line"]').addEventListener("click", () => {
    const id = segs.addSegment();
    renderList();
    timeline.renderBlocks();
    const li = listEl.querySelector<HTMLElement>(`.seg-row[data-seg-id="${id}"]`);
    li?.scrollIntoView({ block: "nearest" });
    li?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  });
  addLangSel.addEventListener("change", () => {
    const code = addLangSel.value;
    addLangSel.value = "";
    if (code) void addLanguage(code);
  });
  customizeBtn = q('[data-editor="customize-toggle"]');
  customizeBtn.addEventListener("click", () => setCustomPanel(customPanel.hidden));

  document.addEventListener("keydown", (event) => {
    if (stage.hidden) return;
    // Escape cierra el popover de estilo y devuelve el foco al botón.
    if (event.key === "Escape" && !customPanel.hidden) {
      event.preventDefault();
      setCustomPanel(false);
      customizeBtn.focus();
      return;
    }
    const editing = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement;
    if (editing) return;
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) doRedo();
    else doUndo();
  });

  for (const m of [video, audio]) {
    m.addEventListener("timeupdate", () => onTimeUpdate(m));
    m.addEventListener("play", updatePlayIcon);
    m.addEventListener("pause", updatePlayIcon);
    m.addEventListener("loadedmetadata", () => onLoadedMeta(m));
  }

  wireStyleControls();
  wirePresets();
  segs.onChange(onSegmentsChange);
  history.onChange(updateUndoRedo);

  // Reajusta el overlay del subtítulo a la caja del vídeo cuando cambia el tamaño.
  new ResizeObserver(() => layoutOverlay()).observe(previewEl);

  wired = true;
}

// Sitúa el overlay del subtítulo sobre la caja real del vídeo (letterbox de
// object-contain), no sobre todo el contenedor: así el subtítulo queda dentro
// del frame y con el mismo recorte/posición que la exportación. Para audio (sin
// frame) cubre todo el preview.
function layoutOverlay(): void {
  if (media === video && !video.hidden && video.videoWidth && video.videoHeight) {
    const cW = previewEl.clientWidth;
    const cH = previewEl.clientHeight;
    const ar = video.videoWidth / video.videoHeight;
    let w = cW;
    let h = cW / ar;
    if (h > cH) {
      h = cH;
      w = cH * ar;
    }
    overlay.style.left = `${Math.round((cW - w) / 2)}px`;
    overlay.style.top = `${Math.round((cH - h) / 2)}px`;
    overlay.style.width = `${Math.round(w)}px`;
    overlay.style.height = `${Math.round(h)}px`;
  } else {
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
  }
  updateBubbleFont();
}

export function enterEditor(): void {
  initEditorStage();
  segs.init();
  setCustomPanel(false); // entra con la preview despejada
  mountMedia();
  renderTracks();
  applyStyle();
  applyStyleToControls();
  renderList();
  timeline.renderRuler();
  timeline.renderBlocks();
  timeline.setPlayhead(0);
  activeId = null;
  updateOverlay();
  updateUndoRedo();
  updateTime();
  updatePlayIcon();
  if (session.file) filenameEl.textContent = `${session.file.name} · ${fmtSize(session.file.size)}`;
}

function fmtSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function mountMedia(): void {
  video.pause();
  audio.pause();
  const url = session.objectUrl;
  if (session.kind === "video" && url) {
    video.src = url;
    video.hidden = false;
    audio.hidden = true;
    previewHint.hidden = true;
    media = video;
  } else if (url) {
    audio.src = url;
    audio.hidden = true;
    video.hidden = true;
    previewHint.hidden = false;
    media = audio;
  } else {
    media = null;
    video.hidden = true;
    audio.hidden = true;
    previewHint.hidden = false;
  }
  layoutOverlay();
}

// ---- reproducción ----

function togglePlay(): void {
  if (!media) return;
  if (media.paused) void media.play();
  else media.pause();
}

function updatePlayIcon(): void {
  const playing = !!media && !media.paused;
  playBtn.querySelector<HTMLElement>('[data-icon="play"]')!.hidden = playing;
  playBtn.querySelector<HTMLElement>('[data-icon="pause"]')!.hidden = !playing;
  const t = window.__I18N__.editor;
  playBtn.setAttribute("aria-label", playing ? t.mediaPause : t.mediaPlay);
}

function updateTime(): void {
  const cur = media?.currentTime ?? 0;
  timeEl.textContent = `${formatTimecode(cur)} / ${formatTimecode(session.duration)}`;
}

// La duración real del medio manda: sincroniza session.duration para que la
// regla, el playhead y el tiempo usen una sola fuente.
function onLoadedMeta(m: HTMLMediaElement): void {
  if (m === media && Number.isFinite(m.duration) && m.duration > 0) {
    session.duration = m.duration;
    timeline.renderRuler();
    timeline.renderBlocks();
    timeline.setPlayhead(m.currentTime);
  }
  if (m === media && m === video) layoutOverlay(); // ya conocemos las dimensiones del frame
  updateTime();
}

function seek(time: number): void {
  if (media) media.currentTime = time;
  timeline.setPlayhead(time);
  refreshActive(time);
  updateTime();
}

function onTimeUpdate(m: HTMLMediaElement): void {
  if (m !== media) return;
  timeline.setPlayhead(m.currentTime);
  refreshActive(m.currentTime);
  updateTime();
}

function refreshActive(time: number): void {
  const active = segs.segmentAt(time);
  const id = active?.id ?? null;
  if (id !== activeId) {
    activeId = id;
    timeline.highlightActive(id);
    updateRowStates();
    // Sigue la reproducción: trae la tarjeta activa a la vista (suave).
    if (id) listEl.querySelector<HTMLElement>(`.seg-row[data-seg-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
  }
  setBubble(active?.text ?? "");
}

function updateOverlay(): void {
  refreshActive(media?.currentTime ?? 0);
}

function setBubble(text: string): void {
  bubble.textContent = text;
  bubble.style.display = text ? "" : "none";
  if (text) updateBubbleFont();
}

// Tamaño de fuente del bocadillo de la preview con la MISMA lógica que el export
// (fitSubtitle): se encoge hasta caber en 2 líneas dentro de la caja del vídeo.
function updateBubbleFont(): void {
  const text = bubble.textContent ?? "";
  if (!measureCtx || !text) return;
  const w = parseFloat(overlay.style.width) || previewEl.clientWidth;
  const h = parseFloat(overlay.style.height) || previewEl.clientHeight;
  if (!w || !h) return;
  const { fontPx } = fitSubtitle(measureCtx, text, w, h, session.style);
  bubble.style.fontSize = `${fontPx}px`;
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
  for (const btn of stage.querySelectorAll<HTMLButtonElement>("[data-pos]")) {
    btn.addEventListener("click", () => {
      session.style.position = btn.dataset.pos as SubtitlePosition;
      applyStyle();
    });
  }
  initBubbleDrag();
}

function setActivePosition(): void {
  for (const btn of stage.querySelectorAll<HTMLButtonElement>("[data-pos]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.pos === session.style.position));
  }
}

// Arrastrar el bocadillo lo coloca libremente (posición "custom"). customX/customY
// son el centro en % de la caja del vídeo (overlay).
function initBubbleDrag(): void {
  bubble.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation(); // no disparar play/pause del preview
    const ov = overlay.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const offX = e.clientX - (b.left + b.width / 2);
    const offY = e.clientY - (b.top + b.height / 2);
    let done = false;
    try {
      bubble.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura igual funciona dentro de la ventana */
    }
    const onMove = (ev: PointerEvent) => {
      bubble.style.cursor = "grabbing";
      const cx = ev.clientX - offX;
      const cy = ev.clientY - offY;
      session.style.position = "custom";
      session.style.customX = Math.min(100, Math.max(0, ((cx - ov.left) / ov.width) * 100));
      session.style.customY = Math.min(100, Math.max(0, ((cy - ov.top) / ov.height) * 100));
      positionBubble(bubble, session.style);
      setActivePosition();
    };
    const finish = () => {
      if (done) return;
      done = true;
      bubble.style.cursor = "grab";
      bubble.removeEventListener("pointermove", onMove);
      bubble.removeEventListener("pointerup", finish);
      bubble.removeEventListener("pointercancel", finish);
      refreshPresetChips();
    };
    bubble.addEventListener("pointermove", onMove);
    bubble.addEventListener("pointerup", finish);
    bubble.addEventListener("pointercancel", finish);
  });
}

function refreshPresetChips(): void {
  const active = activePresetId();
  for (const chip of stage.querySelectorAll<HTMLElement>("[data-preset]")) {
    const on = chip.dataset.preset === active;
    chip.classList.toggle("is-active", on);
    chip.setAttribute("aria-pressed", String(on));
  }
}

function wirePresets(): void {
  for (const chip of stage.querySelectorAll<HTMLElement>("[data-preset]")) {
    chip.addEventListener("click", () => {
      const preset = stylePresets.find((p) => p.id === chip.dataset.preset);
      if (!preset) return;
      session.style = { ...preset.style };
      applyStyle();
      applyStyleToControls();
    });
  }
}

function activePresetId(): string | null {
  const s = session.style;
  const match = stylePresets.find(
    (p) =>
      p.style.font === s.font &&
      p.style.weight === s.weight &&
      p.style.size === s.size &&
      p.style.color.toLowerCase() === s.color.toLowerCase() &&
      p.style.bg.toLowerCase() === s.bg.toLowerCase() &&
      p.style.bgOpacity === s.bgOpacity &&
      p.style.outline === s.outline &&
      p.style.position === s.position,
  );
  return match?.id ?? null;
}

function applyStyleToControls(): void {
  const s = session.style;
  styleEl<HTMLSelectElement>("font").value = s.font;
  styleEl<HTMLInputElement>("size").value = String(s.size);
  styleEl<HTMLInputElement>("color").value = s.color;
  styleEl<HTMLInputElement>("bg").value = s.bg;
  styleEl<HTMLInputElement>("bgOpacity").value = String(Math.round(s.bgOpacity * 100));
  styleEl<HTMLInputElement>("outline").checked = s.outline;
  setActivePosition();
  refreshPresetChips();
}

function applyStyle(): void {
  applyBubbleStyle(bubble, session.style);
  positionBubble(bubble, session.style);
  updateBubbleFont(); // recalcula el tamaño (encaje en 2 líneas) según el estilo
  setActivePosition();
  refreshPresetChips();
}

// ---- tarjetas de segmento ----

function renderList(): void {
  const t = window.__I18N__.editor;
  if (session.segments.length === 0) {
    listEl.replaceChildren();
    emptyEl.textContent = t.empty;
    emptyEl.hidden = false;
    countEl.textContent = linesLabel(0);
    return;
  }
  emptyEl.hidden = true;
  const selected = segs.getSelectedId();
  listEl.replaceChildren();

  for (const s of session.segments) {
    const li = document.createElement("li");
    li.dataset.segId = s.id;
    li.className = `seg-row rounded-lg border border-transparent bg-deep p-2.5${s.id === selected ? " is-selected" : ""}`;

    const head = document.createElement("div");
    head.className = "flex items-center gap-1.5";

    const play = iconButton(playIcon(), t.play);
    play.addEventListener("click", () => {
      segs.select(s.id);
      seek(s.start);
      void media?.play();
    });

    const startIn = tcInput(s.start, t.segStart, "start");
    const arrow = document.createElement("span");
    arrow.className = "text-on-deep-soft";
    arrow.textContent = "→";
    const endIn = tcInput(s.end, t.segEnd, "end");

    const commitTiming = () => {
      const a = parseTimecode(startIn.value);
      const b = parseTimecode(endIn.value);
      if (a === null || b === null) {
        syncTimingInputs(s.id, startIn, endIn);
        return;
      }
      segs.updateTiming(s.id, a, b);
    };
    startIn.addEventListener("focus", () => segs.select(s.id));
    endIn.addEventListener("focus", () => segs.select(s.id));
    startIn.addEventListener("change", commitTiming);
    endIn.addEventListener("change", commitTiming);

    const del = iconButton(closeIcon(), t.delete);
    del.classList.add("ml-auto");
    del.addEventListener("click", () => {
      segs.removeSegment(s.id);
      renderList();
      timeline.renderBlocks();
      focusSelectedCard();
    });

    head.append(play, startIn, arrow, endIn, del);

    const text = document.createElement("textarea");
    text.dataset.segText = "";
    text.rows = 2;
    text.value = s.text;
    text.setAttribute("aria-label", t.segText);
    text.className = "mt-2 w-full resize-none rounded-lg border border-on-deep-soft/20 bg-deep-soft px-2.5 py-1.5 text-sm text-on-deep focus-visible:outline-none focus-visible:border-aqua focus-visible:ring-2 focus-visible:ring-aqua";
    let dirty = false;
    text.addEventListener("focus", () => segs.select(s.id));
    text.addEventListener("input", () => {
      segs.setText(s.id, text.value);
      timeline.updateBlockText(s.id, text.value); // parcheo en vivo, sin reconstruir
      updateOverlay();
      dirty = true;
    });
    text.addEventListener("change", () => {
      if (dirty) {
        segs.commit();
        dirty = false;
      }
    });

    li.append(head, text);
    listEl.appendChild(li);
  }

  countEl.textContent = linesLabel(session.segments.length);
  updateRowStates();
}

function iconButton(svg: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.title = label;
  b.className = "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-on-deep-soft transition hover:bg-on-deep-soft/15 hover:text-on-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua";
  b.innerHTML = svg;
  return b;
}
function playIcon(): string {
  return '<svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true"><path d="M4 3l9 5-9 5z" fill="currentColor"/></svg>';
}
function closeIcon(): string {
  return '<svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
}

function tcInput(value: number, label: string, field: "start" | "end"): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = formatTimecodeFull(value);
  input.dataset.segField = field;
  input.setAttribute("aria-label", label);
  input.className = "w-[4.5rem] rounded border border-on-deep-soft/20 bg-deep-soft px-1.5 py-1 text-center font-mono text-xs tabular-nums text-on-deep focus-visible:outline-none focus-visible:border-aqua focus-visible:ring-2 focus-visible:ring-aqua";
  return input;
}

function focusSelectedCard(): void {
  const id = segs.getSelectedId();
  const li = id ? listEl.querySelector<HTMLElement>(`.seg-row[data-seg-id="${id}"]`) : null;
  const btn = li?.querySelector<HTMLButtonElement>("button");
  if (btn) btn.focus();
  else stage.querySelector<HTMLButtonElement>('[data-editor="add-line"]')?.focus();
}

function syncTimingInputs(id: string, startIn: HTMLInputElement, endIn: HTMLInputElement): void {
  const seg = session.segments.find((s) => s.id === id);
  if (!seg) return;
  startIn.value = formatTimecodeFull(seg.start);
  endIn.value = formatTimecodeFull(seg.end);
}

function updateRowStates(): void {
  const selected = segs.getSelectedId();
  for (const li of listEl.querySelectorAll<HTMLElement>(".seg-row")) {
    const id = li.dataset.segId;
    li.classList.toggle("is-selected", id === selected);
    li.classList.toggle("is-active", id === activeId);
    const seg = session.segments.find((s) => s.id === id);
    if (!seg) continue;
    for (const input of li.querySelectorAll<HTMLInputElement>("[data-seg-field]")) {
      if (input === document.activeElement) continue;
      input.value = formatTimecodeFull(input.dataset.segField === "start" ? seg.start : seg.end);
    }
  }
}

function linesLabel(n: number): string {
  const t = window.__I18N__.editor;
  return `${n} ${n === 1 ? t.line : t.lines}`;
}

function onSegmentsChange(): void {
  updateRowStates();
  timeline.renderBlocks();
  countEl.textContent = linesLabel(session.segments.length);
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

function focusAfterHistory(): void {
  if (!undoBtn.disabled) undoBtn.focus();
  else if (!redoBtn.disabled) redoBtn.focus();
  else stage.querySelector<HTMLElement>("[data-stage-heading]")?.focus();
}

function updateUndoRedo(): void {
  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();
}

// ---- pistas multi-idioma ----

function renderTracks(): void {
  tracksEl.replaceChildren();
  session.tracks.forEach((tr, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    const on = i === session.activeTrack;
    tab.setAttribute("aria-pressed", String(on));
    tab.className = `rounded-pill px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua ${on ? "bg-aqua text-deep" : "bg-deep text-on-deep-soft hover:text-on-deep"}`;
    tab.textContent = tr.lang === "auto" ? window.__I18N__.editor.original : langLabel(tr.lang);
    tab.addEventListener("click", () => switchTrack(i));
    tracksEl.appendChild(tab);
  });

  // Opciones del selector: idiomas aún no presentes.
  const present = new Set(session.tracks.map((t) => t.lang));
  for (const opt of [...addLangSel.querySelectorAll("option")]) {
    if (opt.value !== "") opt.remove();
  }
  for (const l of languageOptions) {
    if (present.has(l.code)) continue;
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = l.label;
    addLangSel.appendChild(opt);
  }
  // Solo se puede traducir si conocemos el idioma de origen (no "auto").
  const source = session.tracks[0];
  addLangSel.disabled = !source || source.lang === "auto";
}

function switchTrack(index: number): void {
  if (index === session.activeTrack) return;
  setActiveTrack(index);
  segs.init();
  renderTracks();
  renderList();
  timeline.renderRuler();
  timeline.renderBlocks();
  timeline.setPlayhead(media?.currentTime ?? 0);
  activeId = null;
  updateOverlay();
  updateUndoRedo();
  tracksEl.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
}

async function addLanguage(code: string): Promise<void> {
  const source = session.tracks[0];
  if (!source) return;
  const c = window.__I18N__.config;
  addLangSel.disabled = true;
  trackStatusEl.textContent = c.preparing;
  trackStatusEl.focus(); // el botón pulsado se deshabilita; ancla el foco y anuncia
  try {
    const translated = await translateSegments(source.segments, source.lang, code, {
      onPhase: (phase) => {
        trackStatusEl.textContent = phase === "loading" ? c.downloadingTr : c.translating;
      },
    });
    const idx = addTrack({ lang: code, segments: translated });
    setActiveTrack(idx);
    segs.init();
    trackStatusEl.textContent = "";
    renderTracks();
    renderList();
    timeline.renderBlocks();
    activeId = null;
    updateOverlay();
    updateUndoRedo();
    tracksEl.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  } catch {
    trackStatusEl.textContent = "";
    renderTracks();
    addLangSel.focus();
  }
}
