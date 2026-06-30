// Render del subtítulo sobre un canvas, aplicando el mismo estilo que la preview
// del editor — "lo que ves es lo que exportas". Se usa para quemar subtítulos
// en el vídeo (WebCodecs y MediaRecorder).

import { hexToRgba, SIZE_MIN, SIZE_MAX, MARGIN_TOP, MARGIN_BOTTOM, type SubtitleStyle, type SubtitleFont } from "@/scripts/subtitleStyle";

const FONT_STACK: Record<SubtitleFont, string> = {
  sans: "Outfit, ui-sans-serif, system-ui, sans-serif",
  serif: "Instrument Serif, ui-serif, Georgia, serif",
  mono: "JetBrains Mono, ui-monospace, monospace",
};

// Parte una palabra más ancha que maxWidth en trozos por caracteres (para que
// una palabra larga nunca se salga del frame), como hace subvid.
function splitLongWord(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const chunks: string[] = [];
  let cur = "";
  for (const ch of word) {
    if (cur && ctx.measureText(cur + ch).width > maxWidth) {
      chunks.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function wrap(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const words = paragraph.split(/\s+/).flatMap((w) => splitLongWord(ctx, w, maxWidth));
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Tamaño de fuente base = altura · 0.052 · size (modelo subvid). `size` es un
// multiplicador (1 = 100%). MAX_LINES limita el subtítulo a 2 líneas: si no cabe,
// se encoge la fuente hasta que entre (o hasta el mínimo).
const FONT_HEIGHT_RATIO = 0.052;
const MAX_WIDTH_RATIO = 0.8;
const MAX_LINES = 2;

/**
 * Elige el tamaño de fuente y el reparto en líneas para que el subtítulo quepa
 * en MAX_LINES líneas dentro del 80% del ancho. Misma lógica en preview y export
 * → lo que ves es lo que exportas. Deja `measure.font` fijado al valor elegido.
 */
export function fitSubtitle(
  measure: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  style: SubtitleStyle,
): { fontPx: number; lines: string[] } {
  const size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, style.size));
  const stack = FONT_STACK[style.font];
  const minFont = Math.max(8, Math.round(height * 0.034 * size));
  let fontPx = Math.max(1, Math.round(height * FONT_HEIGHT_RATIO * size));
  let lines: string[];
  for (;;) {
    measure.font = `${style.weight} ${fontPx}px ${stack}`;
    const maxTextW = Math.max(fontPx, width * MAX_WIDTH_RATIO - fontPx); // padX·2 = fontPx
    lines = wrap(measure, text.trim(), maxTextW);
    if (lines.length <= MAX_LINES || fontPx <= minFont) break;
    fontPx = Math.round(fontPx * 0.93);
  }
  return { fontPx, lines };
}

/**
 * Pinta el subtítulo activo (puede ser "") en el contexto del canvas del vídeo,
 * en como mucho 2 líneas, sin salirse del frame.
 */
export function drawSubtitle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  style: SubtitleStyle,
  width: number,
  height: number,
): void {
  if (!text.trim()) return;

  const { fontPx, lines } = fitSubtitle(ctx, text, width, height, style);
  const lineHeight = fontPx * 1.28;
  const padX = fontPx * 0.5;
  const padY = fontPx * 0.3;

  ctx.font = `${style.weight} ${fontPx}px ${FONT_STACK[style.font]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const maxBlockW = width * MAX_WIDTH_RATIO;
  const blockH = lines.length * lineHeight;

  // Baseline de la primera línea + centro horizontal según la posición. Coincide
  // con el posicionado de la preview (positionBubble): arriba 8%, abajo 6%,
  // centro al medio, "custom" centrado en customX/customY.
  let baseTop: number;
  let cx = width / 2;
  if (style.position === "custom") {
    cx = width * (Math.min(100, Math.max(0, style.customX)) / 100);
    baseTop = height * (Math.min(100, Math.max(0, style.customY)) / 100) - blockH / 2 + fontPx;
  } else if (style.position === "top") {
    baseTop = height * MARGIN_TOP + fontPx;
  } else if (style.position === "middle") {
    baseTop = (height - blockH) / 2 + fontPx;
  } else {
    baseTop = height - height * MARGIN_BOTTOM - (lines.length - 1) * lineHeight;
  }

  // Un único fondo para todo el bloque (como el bocadillo de la preview).
  if (style.bgOpacity > 0) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = Math.min(maxBlockW, widest + padX * 2);
    const boxY = baseTop - fontPx - padY / 2;
    const boxH = blockH + padY;
    const r = fontPx * 0.18;
    ctx.fillStyle = hexToRgba(style.bg, style.bgOpacity);
    roundRect(ctx, cx - boxW / 2, boxY, boxW, boxH, r);
    ctx.fill();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const baseline = baseTop + i * lineHeight;
    if (style.outline && style.bgOpacity === 0) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = Math.max(2, fontPx * 0.14);
      ctx.strokeText(line, cx, baseline);
    }
    ctx.fillStyle = style.color;
    ctx.fillText(line, cx, baseline);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
