// Constantes/selección de modelos de IA. Módulo hoja (sin dependencias de la app)
// para que la etapa de configuración y el cargador lo importen sin ciclos.

const ASR_DESKTOP = "Xenova/whisper-base"; // ~280 MB fp32, más preciso
const ASR_MOBILE = "Xenova/whisper-tiny"; // ~150 MB fp32, cabe en RAM de móvil

/** Dispositivo con poca RAM / táctil: aplica mitigaciones (modelo ligero, sin warm). */
export function isConstrainedDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 4) return true;
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

/** Modelo de transcripción según el dispositivo (tiny en móvil, base en escritorio). */
export function pickAsrModel(): string {
  return isConstrainedDevice() ? ASR_MOBILE : ASR_DESKTOP;
}
