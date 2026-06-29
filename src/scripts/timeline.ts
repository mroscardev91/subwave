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

function duration(): number {
  return session.duration || session.segments.at(-1)?.end || 1;
}

export function initTimeline(r: TimelineRefs): void {
  refs = r;
  r.track.addEventListener("click", (event) => {
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
    const block = document.createElement("button");
    block.type = "button";
    block.dataset.segId = s.id;
    block.className = `timeline-block${s.id === selected ? " is-selected" : ""}`;
    block.style.left = `${(s.start / d) * 100}%`;
    block.style.width = `${Math.max(1, ((s.end - s.start) / d) * 100)}%`;
    const label = s.text || formatTimecode(s.start);
    block.title = label;
    block.setAttribute("aria-label", label);
    block.textContent = s.text;
    block.addEventListener("click", (event) => {
      event.stopPropagation();
      segments.select(s.id);
      refs!.onSeek(s.start);
    });
    refs.blocks.appendChild(block);
  }
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
  block.textContent = text;
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
