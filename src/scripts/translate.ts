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

// Pivote de traducción: OPUS-MT (Xenova) solo publica pares hacia/desde inglés,
// no pares directos entre lenguas no inglesas (p. ej. es↔fr no existe). Cuando ni
// origen ni destino son inglés, se traduce en dos saltos pasando por inglés.
const PIVOT = "en";

export function translationModel(srcCode: string, tgtCode: string): string {
  return `Xenova/opus-mt-${srcCode}-${tgtCode}`;
}

// Carga el modelo del par y traduce los textos (un salto).
async function translateHop(texts: string[], srcCode: string, tgtCode: string, cb: TranslateCallbacks): Promise<string[]> {
  cb.onPhase?.("loading");
  await ensureTranslation(translationModel(srcCode, tgtCode), { onProgress: cb.onProgress });
  cb.onPhase?.("translating");
  return translate(texts);
}

export async function translateSegments(
  segments: Segment[],
  srcCode: string,
  tgtCode: string,
  cb: TranslateCallbacks = {},
): Promise<Segment[]> {
  // Congela la fuente: el usuario podría editar la pista durante la traducción.
  const src = segments.map((s) => ({ ...s }));
  let texts = src.map((s) => s.text);

  if (srcCode !== PIVOT && tgtCode !== PIVOT) {
    texts = await translateHop(texts, srcCode, PIVOT, cb); // origen → inglés
    texts = await translateHop(texts, PIVOT, tgtCode, cb); // inglés → destino
  } else {
    texts = await translateHop(texts, srcCode, tgtCode, cb);
  }

  // Mismos tiempos, texto traducido. Ids propios de la pista.
  return src.map((s, i) => ({ id: `${tgtCode}-${i}`, start: s.start, end: s.end, text: texts[i] || s.text }));
}
