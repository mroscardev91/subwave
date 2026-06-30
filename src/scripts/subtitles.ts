// Modelo de subtítulos y utilidades de tiempo. Un subtítulo es un segmento con
// tiempo de inicio/fin (segundos) y texto.

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
}

// Troceo estilo subvid. Una pausa larga corta el trozo aunque sea corto.
const SILENCE_BREAK_SECONDS = 0.55;

interface Word {
  text: string;
  start: number;
  end: number;
}

// ¿Los chunks de Whisper son por palabra? (>82% son una sola palabra).
function isWordLevelChunks(chunks: any[]): boolean {
  const texts = chunks.map((c) => String(c?.text ?? "").trim()).filter(Boolean);
  if (texts.length < 2) return false;
  const single = texts.filter((t) => !/\s/.test(t)).length;
  return single / texts.length > 0.82;
}

// Límites de línea según el aspect ratio: vídeos verticales (<1) acortan las
// líneas proporcionalmente para que el texto quepa en el frame estrecho.
function lineLimits(aspectRatio: number): { maxChars: number; maxWords: number } {
  const ratio = Math.min(1, aspectRatio * 1.2);
  return { maxChars: Math.max(24, Math.round(46 * ratio)), maxWords: Math.max(4, Math.round(8 * ratio)) };
}

function normWord(c: any, i: number): Word | null {
  const text = String(c?.text ?? "").trim();
  if (!text) return null;
  const r = Array.isArray(c?.timestamp) ? c.timestamp : [i * 2, i * 2 + 2];
  const start = Number.isFinite(r[0]) ? r[0] : i * 2;
  const end = Number.isFinite(r[1]) ? r[1] : start + 2;
  return { text, start, end: Math.max(start + 0.08, end) };
}

function wordsText(ws: Word[]): string {
  return ws.map((w) => w.text).join(" ");
}

// Agrupa palabras en trozos cortos (estilo subvid): corta por nº de palabras,
// longitud, pausa o fin de frase suave.
function groupWords(chunks: any[], aspectRatio: number): Segment[] {
  const { maxChars, maxWords } = lineLimits(aspectRatio);
  const words = chunks
    .map((c, i) => normWord(c, i))
    .filter((w): w is Word => !!w)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let line: Word[] = [];
  const flush = () => {
    if (!line.length) return;
    const start = line[0].start;
    const end = Math.max(start + 0.35, line[line.length - 1].end);
    segments.push({ id: `seg-${segments.length}`, start, end, text: wordsText(line) });
    line = [];
  };

  for (const w of words) {
    if (line.length) {
      const prev = line[line.length - 1];
      const silence = w.start - prev.end;
      const nextText = wordsText([...line, w]);
      const nextDuration = w.end - line[0].start;
      if (silence > SILENCE_BREAK_SECONDS || line.length >= maxWords || nextText.length > maxChars || nextDuration > 5.2) {
        flush();
      }
    }
    line.push(w);
    const text = wordsText(line);
    const duration = line[line.length - 1].end - line[0].start;
    // Fin de frase suave: cierra antes si ya hay frase legible.
    if (/[.!?…]$/.test(w.text) && line.length >= 3 && duration >= 1.1 && text.length >= 18) flush();
  }
  flush();
  return segments;
}

// Convierte la salida de Whisper (transformers.js) en segmentos. Con
// return_timestamps:"word" los chunks son por palabra y se agrupan en trozos
// cortos como subvid; si no, se usan los chunks (frase) directamente.
// `any` acotado a la frontera con la librería ML.
export function segmentsFromAsr(output: any, options: { aspectRatio?: number } = {}): Segment[] {
  const aspectRatio = options.aspectRatio || 16 / 9;
  const chunks = output?.chunks;
  if (Array.isArray(chunks) && chunks.length > 0) {
    if (isWordLevelChunks(chunks)) return groupWords(chunks, aspectRatio);
    return chunks
      .map((c: any, i: number) => {
        const r = Array.isArray(c?.timestamp) ? c.timestamp : [i * 2, i * 2 + 2];
        const start = Number.isFinite(r[0]) ? r[0] : i * 2;
        const end = Number.isFinite(r[1]) ? r[1] : start + 2;
        return { id: `seg-${i}`, start, end: Math.max(start + 0.35, end), text: String(c?.text ?? "").trim() };
      })
      .filter((s: Segment) => s.text.length > 0);
  }
  const text = String(output?.text ?? "").trim();
  return text ? [{ id: "seg-0", start: 0, end: 6, text }] : [];
}

/** "m:ss" para etiquetas cortas (regla de la timeline). */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "m:ss.ss" para los inputs de tiempo de las tarjetas (estilo subvid). */
export function formatTimecodeFull(seconds: number): string {
  // Redondea a centésimas ANTES de separar minutos para que 59.999 -> 1:00.00.
  const cs = Math.round(Math.max(0, seconds) * 100);
  const m = Math.floor(cs / 6000);
  const rest = (cs - m * 6000) / 100;
  return `${m}:${rest.toFixed(2).padStart(5, "0")}`;
}

function srtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

/**
 * Segmento activo en `time`. Fuente única para preview y export quemado.
 * Caso normal: el intervalo [start, end) contiene el tiempo. Para segmentos
 * degenerados (end <= start, p. ej. el último chunk de Whisper sin fin) usa el
 * inicio del siguiente como fin implícito, igual que la preview.
 */
export function segmentAt(segments: Segment[], time: number): Segment | null {
  const within = segments.find((s) => time >= s.start && time < s.end);
  if (within) return within;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s.end > s.start) continue;
    const next = segments[i + 1];
    if (time >= s.start && (!next || time < next.start)) return s;
  }
  return null;
}

/** Fin efectivo de un segmento (resuelve degenerados como la preview). */
function effectiveEnd(segments: Segment[], i: number): number {
  const s = segments[i];
  if (s.end > s.start) return s.end;
  const next = segments[i + 1];
  return next && next.start > s.start ? next.start : s.start + 2;
}

/** Serializa segmentos a SubRip (.srt). */
export function toSrt(segments: Segment[]): string {
  const visible = segments.filter((s) => s.text.trim().length > 0);
  return visible
    .map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(effectiveEnd(visible, i))}\n${s.text.trim()}\n`)
    .join("\n");
}

/** Parsea "m:ss.ss" | "ss.ss" | "ss" a segundos. */
export function parseTimecode(value: string): number | null {
  const str = value.trim();
  if (str === "") return null;
  if (str.includes(":")) {
    const [m, s] = str.split(":");
    const min = parseInt(m, 10);
    const sec = parseFloat(s);
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return null;
    return min * 60 + sec;
  }
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : null;
}
