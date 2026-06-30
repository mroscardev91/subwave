// Estilo del subtítulo: presets (estilo subvid) que se aplican en vivo al
// overlay del preview y, más adelante, al export quemado.

export type SubtitleFont = "sans" | "serif" | "mono";
export type SubtitlePosition = "top" | "middle" | "bottom";

export interface SubtitleStyle {
  font: SubtitleFont;
  weight: number; // 400..700
  size: number; // multiplicador del tamaño (1 = 100%); rango 0.7..1.6
  color: string; // hex del texto
  bg: string; // hex del fondo
  bgOpacity: number; // 0..1
  outline: boolean; // contorno/sombra del texto
  position: SubtitlePosition;
}

export const SIZE_MIN = 0.7;
export const SIZE_MAX = 1.6;

export const defaultSubtitleStyle: SubtitleStyle = {
  font: "sans",
  weight: 600,
  size: 1,
  color: "#FFFFFF",
  bg: "#000000",
  bgOpacity: 0.55,
  outline: true,
  position: "bottom",
};

// Presets con la misma forma que las "plantillas" de subvid.
export interface StylePreset {
  id: string;
  style: SubtitleStyle;
}

const base = defaultSubtitleStyle;
export const stylePresets: StylePreset[] = [
  { id: "base", style: { ...base } },
  { id: "clean", style: { ...base, bgOpacity: 0, weight: 600 } },
  { id: "bold", style: { ...base, weight: 700, size: 1.12 } },
  { id: "pop", style: { ...base, color: "#FFE14D", weight: 700, bg: "#000000", bgOpacity: 0.65 } },
  { id: "neon", style: { ...base, color: "#2DE0CE", weight: 700, bgOpacity: 0 } },
  { id: "classic", style: { ...base, font: "serif", weight: 400, bgOpacity: 0.5 } },
  { id: "terminal", style: { ...base, font: "mono", weight: 500, color: "#3DD68C", bg: "#000000", bgOpacity: 0.75, outline: false } },
];

const FONT_STACK: Record<SubtitleFont, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-display)",
  mono: "var(--font-mono)",
};

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Estilo inline del "bocadillo" de texto del subtítulo en la preview. Igual que
 * subvid: el tamaño se acota con clamp(...,28px·size) para no desbordar en cajas
 * pequeñas (vídeo vertical), y las palabras largas se parten (overflow-wrap).
 */
export function applyBubbleStyle(el: HTMLElement, style: SubtitleStyle): void {
  const size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, style.size));
  el.style.fontFamily = FONT_STACK[style.font];
  el.style.fontWeight = String(style.weight);
  el.style.fontSize = `clamp(${Math.round(13 * size)}px, ${(2.4 * size).toFixed(2)}vw, ${Math.round(28 * size)}px)`;
  el.style.lineHeight = "1.28";
  el.style.color = style.color;
  el.style.backgroundColor = style.bgOpacity > 0 ? hexToRgba(style.bg, style.bgOpacity) : "transparent";
  el.style.padding = style.bgOpacity > 0 ? "0.22em 0.55em" : "0";
  el.style.borderRadius = "0.3em";
  el.style.overflowWrap = "anywhere";
  el.style.whiteSpace = "pre-line";
  el.style.setProperty("text-wrap", "balance");
  el.style.textShadow = style.outline && style.bgOpacity === 0
    ? "0 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)"
    : "none";
}

/** Alineación vertical del overlay según la posición. */
export function positionToAlign(position: SubtitlePosition): string {
  return position === "top" ? "flex-start" : position === "middle" ? "center" : "flex-end";
}
