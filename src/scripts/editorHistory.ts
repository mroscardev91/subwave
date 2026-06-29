// Historial undo/redo para los segmentos. Guarda instantáneas (copias) de la
// lista; la cima de `past` es siempre el estado actual.

import type { Segment } from "@/scripts/subtitles";

const MAX = 100;
let past: Segment[][] = [];
let future: Segment[][] = [];
const listeners: (() => void)[] = [];

function clone(segs: Segment[]): Segment[] {
  return segs.map((s) => ({ ...s }));
}

/** Inicializa el historial con el estado base (tras transcribir). */
export function reset(segs: Segment[]): void {
  past = [clone(segs)];
  future = [];
  notify();
}

/** Registra una nueva instantánea tras una edición. */
export function record(segs: Segment[]): void {
  past.push(clone(segs));
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

export function undo(): Segment[] | null {
  if (past.length <= 1) return null;
  future.push(past.pop()!);
  notify();
  return clone(past[past.length - 1]);
}

export function redo(): Segment[] | null {
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
