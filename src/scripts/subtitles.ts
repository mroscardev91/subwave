// Modelo de subtítulos y utilidades de tiempo. Un subtítulo es un segmento con
// tiempo de inicio/fin (segundos) y texto.

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
}

// Límite de un subtítulo agrupado: hasta ~2 líneas y unos pocos segundos.
const MAX_SEGMENT_CHARS = 84;
const MAX_SEGMENT_SECONDS = 6;
// Fin de frase (incluye terminadores CJK/fullwidth y árabe; permite un cierre
// de comilla/paréntesis tras el signo).
const SENTENCE_END = /[.!?…。！？؟](["'»)\]]+)?$/;

// Convierte la salida de Whisper (transformers.js) en segmentos. Con
// return_timestamps:true viene `chunks: [{ timestamp: [start, end], text }]`,
// que suelen ser trozos cortos; los agrupamos en FRASES (cortando en
// puntuación de fin de frase, o al superar el límite de longitud/duración)
// para no partir una frase a la mitad, como hace subvid.
// `any` acotado a la frontera con la librería ML.
export function segmentsFromAsr(output: any): Segment[] {
  const chunks = output?.chunks;
  if (Array.isArray(chunks) && chunks.length > 0) {
    const segments: Segment[] = [];
    let text = "";
    let start: number | null = null;
    let end = 0;

    const flush = () => {
      const t = text.trim();
      if (t) segments.push({ id: `seg-${segments.length}`, start: start ?? 0, end, text: t });
      text = "";
      start = null;
    };

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const cStart = c?.timestamp?.[0] ?? end;
      // Whisper suele dar end=null en el último chunk; usa el inicio del
      // siguiente para que el segmento tenga duración visible.
      const next = chunks[i + 1]?.timestamp?.[0];
      const cEnd = c?.timestamp?.[1] ?? (typeof next === "number" ? next : cStart);
      if (start === null) start = cStart;
      text += c?.text ?? "";
      end = cEnd;

      const t = text.trim();
      if (SENTENCE_END.test(t) || t.length >= MAX_SEGMENT_CHARS || end - (start ?? 0) >= MAX_SEGMENT_SECONDS) {
        flush();
      }
    }
    flush();
    return segments;
  }
  const text = String(output?.text ?? "").trim();
  return text ? [{ id: "seg-0", start: 0, end: 0, text }] : [];
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
