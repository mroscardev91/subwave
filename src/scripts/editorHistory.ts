// Historial undo/redo del editor. Guarda instantáneas (copias) del estado
// editable: los segmentos de la pista activa y el estilo del subtítulo. La cima
// de `past` es siempre el estado actual.

import type { Segment } from "@/scripts/subtitles";
import type { SubtitleStyle } from "@/scripts/subtitleStyle";

export interface EditorSnapshot {
  segments: Segment[];
  style: SubtitleStyle;
}

const MAX = 100;
let past: EditorSnapshot[] = [];
let future: EditorSnapshot[] = [];
const listeners: (() => void)[] = [];

function clone(s: EditorSnapshot): EditorSnapshot {
  return { segments: s.segments.map((seg) => ({ ...seg })), style: { ...s.style } };
}

/** Inicializa el historial con el estado base (tras transcribir). */
export function reset(snap: EditorSnapshot): void {
  past = [clone(snap)];
  future = [];
  notify();
}

function sameAsTop(snap: EditorSnapshot): boolean {
  const top = past[past.length - 1];
  return !!top && JSON.stringify(top) === JSON.stringify(snap);
}

/** Registra una nueva instantánea tras una edición (ignora si no cambió nada). */
export function record(snap: EditorSnapshot): void {
  if (sameAsTop(snap)) return; // acción no-op: no ensucia el historial
  past.push(clone(snap));
  if (past.length > MAX) past.shift();
  future = [];
  notify();
}

export function canUndo(): boolean {
  return past.length > 1;
}
export function canRedo(): boolean {
  return future.length > 0;
}

export function undo(): EditorSnapshot | null {
  if (past.length <= 1) return null;
  future.push(past.pop()!);
  notify();
  return clone(past[past.length - 1]);
}

export function redo(): EditorSnapshot | null {
  const next = future.pop();
  if (!next) return null;
  past.push(next);
  notify();
  return clone(next);
}

export function onChange(fn: () => void): void {
  listeners.push(fn);
}
function notify(): void {
  for (const l of listeners) l();
}
