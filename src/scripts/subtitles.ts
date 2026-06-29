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
        const end = c?.timestamp?.[1] ?? start;
        return { id: `seg-${i}`, start, end, text: String(c?.text ?? "").trim() };
      })
      .filter((s: Segment) => s.text.length > 0);
  }
  const text = String(output?.text ?? "").trim();
  return text ? [{ id: "seg-0", start: 0, end: 0, text }] : [];
}

/** "m:ss" para la lista de segmentos del editor. */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
