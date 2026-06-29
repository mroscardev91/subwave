// Timeline: pinta los segmentos como bloques proporcionales a la duración, un
// playhead sincronizado con la reproducción, y permite hacer scrubbing (click
// para buscar) y seleccionar un segmento.

import { session } from "@/scripts/session";
import * as segments from "@/scripts/editorSegments";

interface TimelineRefs {
  track: HTMLElement;
  blocks: HTMLElement;
  playhead: HTMLElement;
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
    block.style.width = `${Math.max(0.6, ((s.end - s.start) / d) * 100)}%`;
    block.title = s.text;
    block.setAttribute("aria-label", s.text);
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
  refs.playhead.style.left = `${Math.min(100, Math.max(0, (time / duration()) * 100))}%`;
}

/** Resalta el bloque del segmento que suena ahora. */
export function highlightActive(id: string | null): void {
  if (!refs) return;
  for (const el of refs.blocks.querySelectorAll<HTMLElement>(".timeline-block")) {
    el.classList.toggle("is-active", el.dataset.segId === id);
  }
}
