// Timeline: bloques de segmentos (con su texto) proporcionales a la duración,
// regla de tiempo, playhead sincronizado y scrubbing (click para buscar).

import { session } from "@/scripts/session";
import { formatTimecode } from "@/scripts/subtitles";
import * as segments from "@/scripts/editorSegments";

interface TimelineRefs {
  track: HTMLElement;
  blocks: HTMLElement;
  playhead: HTMLElement;
  ruler: HTMLElement;
  onSeek: (time: number) => void;
}

let refs: TimelineRefs | null = null;
// Tras un arrastre, suprime el click de scrub que el navegador dispara al soltar.
let suppressSeekUntil = 0;

function duration(): number {
  return session.duration || session.segments.at(-1)?.end || 1;
}

export function initTimeline(r: TimelineRefs): void {
  refs = r;
  r.track.addEventListener("click", (event) => {
    if (performance.now() < suppressSeekUntil) {
      suppressSeekUntil = 0;
      return;
    }
    const rect = r.track.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    r.onSeek(Math.max(0, Math.min(1, ratio)) * duration());
  });
  // Scrubbing por teclado (el track es role="slider").
  r.track.addEventListener("keydown", (event) => {
    const d = duration();
    const cur = (Number(r.track.getAttribute("aria-valuenow")) / 100) * d;
    const step = Math.max(0.1, d / 100);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = cur + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = cur - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = d;
    if (next === null) return;
    event.preventDefault();
    r.onSeek(Math.max(0, Math.min(d, next)));
  });
}

function niceStep(d: number): number {
  const target = d / 8; // ~8 marcas
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s >= target) ?? 600;
}

export function renderRuler(): void {
  if (!refs) return;
  const d = duration();
  const step = niceStep(d);
  refs.ruler.replaceChildren();
  for (let t = 0; t <= d; t += step) {
    const pct = (t / d) * 100;
    const tick = document.createElement("span");
    tick.className = "absolute font-mono text-[10px] tabular-nums";
    tick.style.left = `${pct}%`;
    // Evita que la última etiqueta se salga del track.
    if (pct > 92) tick.style.transform = "translateX(-100%)";
    tick.textContent = formatTimecode(t);
    refs.ruler.appendChild(tick);
  }
}

export function renderBlocks(): void {
  if (!refs) return;
  const d = duration();
  const selected = segments.getSelectedId();
  refs.blocks.replaceChildren();

  for (const s of session.segments) {
    const block = document.createElement("div");
    block.dataset.segId = s.id;
    block.tabIndex = 0;
    block.setAttribute("role", "button");
    block.className = `timeline-block${s.id === selected ? " is-selected" : ""}`;
    block.style.left = `${(s.start / d) * 100}%`;
    block.style.width = `${Math.max(1, ((s.end - s.start) / d) * 100)}%`;
    const label = s.text || formatTimecode(s.start);
    block.title = label;
    block.setAttribute("aria-label", label);

    const txt = document.createElement("span");
    txt.className = "tl-text";
    txt.textContent = s.text;
    const lh = document.createElement("span");
    lh.className = "tl-handle tl-handle-l";
    lh.setAttribute("aria-hidden", "true");
    const rh = document.createElement("span");
    rh.className = "tl-handle tl-handle-r";
    rh.setAttribute("aria-hidden", "true");
    block.append(txt, lh, rh);

    const activate = () => {
      segments.select(s.id);
      refs!.onSeek(s.start);
    };
    block.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
    block.addEventListener("click", (event) => {
      event.stopPropagation(); // no propagar al scrub del track
      activate();
    });
    lh.addEventListener("pointerdown", (e) => startDrag(s, block, "l", e));
    rh.addEventListener("pointerdown", (e) => startDrag(s, block, "r", e));
    block.addEventListener("pointerdown", (e) => {
      if (e.target === lh || e.target === rh) return;
      startDrag(s, block, "move", e);
    });

    refs.blocks.appendChild(block);
  }
}

// Arrastre del bloque: mover (todo el bloque) o redimensionar (bordes), que
// edita los tiempos del segmento. Commit (con snapshot de undo) al soltar.
function startDrag(seg: { id: string; start: number; end: number }, block: HTMLElement, mode: "move" | "l" | "r", e: PointerEvent): void {
  if (!refs || e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const trackW = refs.track.getBoundingClientRect().width || 1;
  const d = duration();
  const startX = e.clientX;
  const orig = { start: seg.start, end: seg.end };
  const cur = { ...orig };
  const MIN = 0.1;
  let moved = false;
  let done = false;
  // setPointerCapture garantiza recibir pointerup aunque se suelte fuera de la
  // ventana; los listeners van en el bloque (capturado), no en window.
  try {
    block.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura igualmente funciona dentro de la ventana */
  }

  const onMove = (ev: PointerEvent) => {
    if (Math.abs(ev.clientX - startX) > 3) moved = true;
    const dt = ((ev.clientX - startX) / trackW) * d;
    let ns = orig.start;
    let ne = orig.end;
    if (mode === "move") {
      ns = orig.start + dt;
      ne = orig.end + dt;
      if (ns < 0) { ne -= ns; ns = 0; }
    } else if (mode === "l") {
      ns = Math.max(0, Math.min(orig.end - MIN, orig.start + dt));
    } else {
      ne = Math.max(orig.start + MIN, orig.end + dt);
    }
    cur.start = ns;
    cur.end = ne;
    block.style.left = `${(ns / d) * 100}%`;
    block.style.width = `${Math.max(0.5, ((ne - ns) / d) * 100)}%`;
  };
  // Finaliza una sola vez (pointerup confirma; cancel/pérdida de captura limpia).
  const finish = (commit: boolean) => {
    if (done) return;
    done = true;
    block.removeEventListener("pointermove", onMove);
    block.removeEventListener("pointerup", onPointerUp);
    block.removeEventListener("pointercancel", onCancel);
    block.removeEventListener("lostpointercapture", onCancel);
    if (commit && moved) {
      suppressSeekUntil = performance.now() + 300; // ignora el click de scrub
      segments.select(seg.id);
      segments.updateTiming(seg.id, cur.start, cur.end); // reconstruye + snapshot
    }
  };
  const onPointerUp = () => finish(true);
  const onCancel = () => finish(false);
  block.addEventListener("pointermove", onMove);
  block.addEventListener("pointerup", onPointerUp);
  block.addEventListener("pointercancel", onCancel);
  block.addEventListener("lostpointercapture", onCancel);
}

export function setPlayhead(time: number): void {
  if (!refs) return;
  const pct = Math.min(100, Math.max(0, (time / duration()) * 100));
  refs.playhead.style.left = `${pct}%`;
  refs.track.setAttribute("aria-valuenow", String(Math.round(pct)));
  refs.track.setAttribute("aria-valuetext", formatTimecode(time));
}

/** Actualiza solo el texto de un bloque (edición de texto en vivo, sin reconstruir). */
export function updateBlockText(id: string, text: string): void {
  if (!refs) return;
  const block = refs.blocks.querySelector<HTMLElement>(`.timeline-block[data-seg-id="${id}"]`);
  if (!block) return;
  const label = text || "";
  const txt = block.querySelector<HTMLElement>(".tl-text");
  if (txt) txt.textContent = text;
  block.title = label;
  block.setAttribute("aria-label", label);
}

/** Resalta el bloque del segmento que suena ahora. */
export function highlightActive(id: string | null): void {
  if (!refs) return;
  for (const el of refs.blocks.querySelectorAll<HTMLElement>(".timeline-block")) {
    el.classList.toggle("is-active", el.dataset.segId === id);
  }
}
