// Modelo de subtítulos y utilidades de tiempo. Un subtítulo es un segmento con
// tiempo de inicio/fin (segundos) y texto.

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
}

// Convierte la salida de Whisper (transformers.js) en segmentos. Con
// return_timestamps:true viene `chunks: [{ timestamp: [start, end], text }]`.
// `any` acotado a la frontera con la librería ML.
export function segmentsFromAsr(output: any): Segment[] {
  const chunks = output?.chunks;
  if (Array.isArray(chunks) && chunks.length > 0) {
    return chunks
      .map((c: any, i: number) => {
        const start = c?.timestamp?.[0] ?? 0;
        // Whisper suele dar end=null en el último chunk; usa el inicio del
        // siguiente para que el segmento tenga duración visible.
        const next = chunks[i + 1]?.timestamp?.[0];
        const end = c?.timestamp?.[1] ?? (typeof next === "number" ? next : start);
        return { id: `seg-${i}`, start, end, text: String(c?.text ?? "").trim() };
      })
      .filter((s: Segment) => s.text.length > 0);
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
