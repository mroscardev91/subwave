// Estado y operaciones de edición de los segmentos: selección, edición de texto
// y de tiempos, y aplicación de instantáneas de undo/redo. Notifica cambios para
// que la UI (lista, timeline, overlay) se repinte.

import { session } from "@/scripts/session";
import type { Segment } from "@/scripts/subtitles";
import * as history from "@/scripts/editorHistory";

let selectedId: string | null = null;
const listeners: (() => void)[] = [];

export function init(): void {
  history.reset(session.segments);
  selectedId = session.segments[0]?.id ?? null;
}

export function getSelectedId(): string | null {
  return selectedId;
}

export function select(id: string | null): void {
  if (selectedId === id) return;
  selectedId = id;
  emit();
}

// Edición de texto en vivo (sin snapshot por tecla); el snapshot se hace al
// confirmar (commit), p. ej. al salir del campo.
// No emite: el editor parchea el overlay y el bloque de la timeline en vivo,
// para no reconstruir toda la timeline en cada tecla.
export function setText(id: string, text: string): void {
  const seg = session.segments.find((s) => s.id === id);
  if (!seg || seg.text === text) return;
  seg.text = text;
}

/** Registra una instantánea del estado actual (al confirmar una edición). */
export function commit(): void {
  history.record(session.segments);
}

export function updateTiming(id: string, start: number, end: number): void {
  const seg = session.segments.find((s) => s.id === id);
  if (!seg) return;
  // No negativos y end >= start; bajar end por debajo de start NO arrastra start.
  seg.start = Math.max(0, start);
  seg.end = Math.max(seg.start, end);
  history.record(session.segments);
  emit();
}

let counter = 0;

/** Añade una línea tras la seleccionada (o al final). Devuelve su id. */
export function addSegment(): string {
  const idx = selectedId ? session.segments.findIndex((s) => s.id === selectedId) : session.segments.length - 1;
  const prev = session.segments[idx];
  const start = prev ? prev.end : 0;
  const seg = { id: `seg-new-${++counter}`, start, end: start + 2, text: "" };
  session.segments.splice(idx + 1, 0, seg);
  selectedId = seg.id;
  history.record(session.segments);
  emit();
  return seg.id;
}

export function removeSegment(id: string): void {
  const idx = session.segments.findIndex((s) => s.id === id);
  if (idx < 0) return;
  session.segments.splice(idx, 1);
  if (selectedId === id) {
    selectedId = session.segments[Math.min(idx, session.segments.length - 1)]?.id ?? null;
  }
  history.record(session.segments);
  emit();
}

/** Reemplaza los segmentos (al deshacer/rehacer). */
export function applySnapshot(segs: Segment[]): void {
  session.segments = segs;
  if (selectedId && !segs.some((s) => s.id === selectedId)) {
    selectedId = segs[0]?.id ?? null;
  }
  emit();
}

export function segmentAt(time: number): Segment | null {
  const list = session.segments;
  // Caso normal: el intervalo [start, end) contiene el tiempo.
  const within = list.find((s) => time >= s.start && time < s.end);
  if (within) return within;
  // Segmento degenerado (end <= start, p. ej. último chunk de Whisper sin fin):
  // activo desde su start hasta que empieza el siguiente (o el final).
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.end > s.start) continue;
    const next = list[i + 1];
    if (time >= s.start && (!next || time < next.start)) return s;
  }
  return null;
}

export function onChange(fn: () => void): void {
  listeners.push(fn);
}
function emit(): void {
  for (const l of listeners) l();
}
