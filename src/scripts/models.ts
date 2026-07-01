// Constantes/selección de modelos de IA. Módulo hoja (sin dependencias de la app)
// para que la etapa de configuración y el cargador lo importen sin ciclos.

const ASR_DESKTOP = "Xenova/whisper-base"; // ~280 MB fp32, más preciso
const ASR_MOBILE = "Xenova/whisper-tiny"; // ~150 MB fp32, cabe en RAM de móvil

/**
 * Dispositivo con poca RAM / táctil → mitigaciones (modelo ligero + quantizado,
 * sin warm). Sesga a "constrained" a propósito: un falso positivo solo usa el
 * modelo ligero, nunca provoca OOM. Cubre iPad con teclado/trackpad (reporta
 * pointer:fine) y iPadOS enmascarado como Mac.
 */
export function isConstrainedDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (typeof nav.maxTouchPoints === "number" && nav.maxTouchPoints > 0) return true;
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(nav.userAgent || "")) return true;
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

/** Modelo de transcripción según el dispositivo (tiny en móvil, base en escritorio). */
export function pickAsrModel(): string {
  return isConstrainedDevice() ? ASR_MOBILE : ASR_DESKTOP;
}

/**
 * dtype de Whisper por dispositivo: q8 en móvil (~4× menos RAM que fp32, evita el
 * OOM en la inferencia; usa MatMulInteger/DynamicQuantize, sí soportados por el
 * ORT-web incluido — a diferencia de q4/q4f16 de OPUS-MT que usan MatMulNBits).
 * fp32 en escritorio (más preciso y hay RAM de sobra).
 */
export function pickAsrDtype(): "q8" | "fp32" {
  return isConstrainedDevice() ? "q8" : "fp32";
}
