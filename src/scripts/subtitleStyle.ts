// Estilo del subtítulo: presets que se aplican en vivo al overlay del preview y,
// más adelante, al export quemado.

export type SubtitleFont = "sans" | "serif" | "mono";
export type SubtitlePosition = "top" | "middle" | "bottom";

export interface SubtitleStyle {
  font: SubtitleFont;
  size: number; // px (relativo al preview)
  color: string; // hex del texto
  bg: string; // hex del fondo
  bgOpacity: number; // 0..1
  outline: boolean; // contorno/sombra del texto
  position: SubtitlePosition;
}

export const defaultSubtitleStyle: SubtitleStyle = {
  font: "sans",
  size: 28,
  color: "#FFFFFF",
  bg: "#000000",
  bgOpacity: 0.55,
  outline: true,
  position: "bottom",
};

const FONT_STACK: Record<SubtitleFont, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-display)",
  mono: "var(--font-mono)",
};

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Estilo inline del "bocadillo" de texto del subtítulo. */
export function applyBubbleStyle(el: HTMLElement, style: SubtitleStyle): void {
  el.style.fontFamily = FONT_STACK[style.font];
  el.style.fontSize = `${style.size}px`;
  el.style.color = style.color;
  el.style.backgroundColor = style.bgOpacity > 0 ? hexToRgba(style.bg, style.bgOpacity) : "transparent";
  el.style.padding = style.bgOpacity > 0 ? "0.15em 0.5em" : "0";
  el.style.textShadow = style.outline
    ? "0 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)"
    : "none";
}

/** Alineación vertical del overlay según la posición. */
export function positionToAlign(position: SubtitlePosition): string {
  return position === "top" ? "flex-start" : position === "middle" ? "center" : "flex-end";
}
