// Traduce los segmentos de una pista a otro idioma con OPUS-MT, conservando los
// tiempos. Se usa al configurar (si el idioma de salida difiere) y al añadir un
// idioma en el editor. Cada par de idiomas es un modelo Xenova/opus-mt-{src}-{tgt}.

import { ensureTranslation, translate } from "@/scripts/transformersClient";
import type { Segment } from "@/scripts/subtitles";

export type TranslatePhase = "loading" | "translating";

export interface TranslateCallbacks {
  onPhase?: (phase: TranslatePhase) => void;
  onProgress?: (payload: any) => void;
}

export function translationModel(srcCode: string, tgtCode: string): string {
  return `Xenova/opus-mt-${srcCode}-${tgtCode}`;
}

export async function translateSegments(
  segments: Segment[],
  srcCode: string,
  tgtCode: string,
  cb: TranslateCallbacks = {},
): Promise<Segment[]> {
  cb.onPhase?.("loading");
  await ensureTranslation(translationModel(srcCode, tgtCode), { onProgress: cb.onProgress });

  cb.onPhase?.("translating");
  // Congela la fuente: el usuario podría editar la pista durante la traducción.
  const src = segments.map((s) => ({ ...s }));
  const translated = await translate(src.map((s) => s.text));

  // Mismos tiempos, texto traducido. Ids propios de la pista.
  return src.map((s, i) => ({ id: `${tgtCode}-${i}`, start: s.start, end: s.end, text: translated[i] || s.text }));
}
