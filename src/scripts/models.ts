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
 * dtype de Whisper. Siempre fp32: el `_quantized` (q8) de estos modelos usa
 * MatMulNBits y el onnxruntime-web incluido (1.26.0-dev) NO lo carga
 * ("Missing required scale ... MatMulNBits"), igual que con OPUS-MT. No hay
 * versión de transformers.js con un ORT estable que lo arregle. Se deja fp32
 * (lo que sí funciona) y se acota la RAM con el modelo tiny en móvil.
 */
export function pickAsrDtype(): "fp32" {
  return "fp32";
}
