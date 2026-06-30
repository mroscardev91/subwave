// Estilo del subtítulo: presets (estilo subvid) que se aplican en vivo al
// overlay del preview y, más adelante, al export quemado.

export type SubtitleFont = "sans" | "serif" | "mono";
export type SubtitlePosition = "top" | "middle" | "bottom" | "custom";

export interface SubtitleStyle {
  font: SubtitleFont;
  weight: number; // 400..700
  size: number; // multiplicador del tamaño (1 = 100%); rango 0.7..1.6
  color: string; // hex del texto
  bg: string; // hex del fondo
  bgOpacity: number; // 0..1
  outline: boolean; // contorno/sombra del texto
  position: SubtitlePosition;
  customX: number; // posición libre (centro), 0..100 % del frame
  customY: number; // posición libre (centro), 0..100 % del frame
}

export const SIZE_MIN = 0.7;
export const SIZE_MAX = 1.6;
// Márgenes (fracción de la altura del frame) para arriba/abajo.
export const MARGIN_TOP = 0.08;
export const MARGIN_BOTTOM = 0.08;

export const defaultSubtitleStyle: SubtitleStyle = {
  font: "sans",
  weight: 600,
  size: 1,
  color: "#FFFFFF",
  bg: "#000000",
  bgOpacity: 0.55,
  outline: true,
  position: "bottom",
  customX: 50,
  customY: 90,
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
  el.style.fontFamily = FONT_STACK[style.font];
  el.style.fontWeight = String(style.weight);
  // fontSize lo fija el editor (updateBubbleFont) con la misma lógica que el export.
  el.style.lineHeight = "1.28";
  el.style.color = style.color;
  el.style.backgroundColor = style.bgOpacity > 0 ? hexToRgba(style.bg, style.bgOpacity) : "transparent";
  // Padding alineado con el export (vertical 0.3em total = padY 0.3·font;
  // horizontal 0.5em por lado = padX 0.5·font) para que la caja coincida.
  el.style.padding = style.bgOpacity > 0 ? "0.15em 0.5em" : "0";
  el.style.borderRadius = "0.3em";
  el.style.overflowWrap = "anywhere";
  el.style.whiteSpace = "pre-line";
  el.style.setProperty("text-wrap", "balance");
  // width:max-content + max-width 80% (vía clase): el bocadillo usa todo el ancho
  // disponible y reparte el texto en greedy como el export; sin esto, al ser
  // absoluto se encoge a una columna estrecha y salta a más líneas.
  el.style.width = "max-content";
  el.style.pointerEvents = "auto"; // arrastrable para posición libre
  el.style.cursor = "grab";
  el.style.touchAction = "none";
  el.style.textShadow = style.outline && style.bgOpacity === 0
    ? "0 1px 2px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)"
    : "none";
}

/**
 * Coloca el bocadillo (absoluto) dentro del overlay según la posición. Arriba con
 * margen del 8%, abajo con margen del 6% (anclado por su borde), centro al medio,
 * y "custom" en customX/customY (centro). Coincide con el cálculo del export.
 */
export function positionBubble(el: HTMLElement, style: SubtitleStyle): void {
  el.style.position = "absolute";
  el.style.left = "50%";
  if (style.position === "custom") {
    el.style.left = `${Math.min(100, Math.max(0, style.customX))}%`;
    el.style.top = `${Math.min(100, Math.max(0, style.customY))}%`;
    el.style.transform = "translate(-50%, -50%)";
  } else if (style.position === "top") {
    el.style.top = `${MARGIN_TOP * 100}%`;
    el.style.transform = "translate(-50%, 0)";
  } else if (style.position === "middle") {
    el.style.top = "50%";
    el.style.transform = "translate(-50%, -50%)";
  } else {
    el.style.top = `${(1 - MARGIN_BOTTOM) * 100}%`;
    el.style.transform = "translate(-50%, -100%)";
  }
}
