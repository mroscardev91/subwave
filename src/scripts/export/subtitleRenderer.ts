// Render del subtítulo sobre un canvas, aplicando el mismo estilo que la preview
// del editor — "lo que ves es lo que exportas". Se usa para quemar subtítulos
// en el vídeo (WebCodecs y MediaRecorder).

import { hexToRgba, type SubtitleStyle, type SubtitleFont } from "@/scripts/subtitleStyle";

const FONT_STACK: Record<SubtitleFont, string> = {
  sans: "Outfit, ui-sans-serif, system-ui, sans-serif",
  serif: "Instrument Serif, ui-serif, Georgia, serif",
  mono: "JetBrains Mono, ui-monospace, monospace",
};

function wrap(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
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

// Proporción del tamaño de fuente respecto a la altura del frame (modelo subvid:
// fontPx = altura · 0.052 · size). `size` es un multiplicador (1 = 100%).
const FONT_HEIGHT_RATIO = 0.052;
const MAX_WIDTH_RATIO = 0.8;

/**
 * Pinta el subtítulo activo (puede ser "") en el contexto del canvas del vídeo.
 * La fuente se escala con la altura del frame (igual que la preview del editor),
 * así "lo que ves es lo que exportas" y el texto nunca se sale del frame.
 */
export function drawSubtitle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  style: SubtitleStyle,
  width: number,
  height: number,
): void {
  if (!text.trim()) return;

  const fontPx = Math.round(height * FONT_HEIGHT_RATIO * style.size);
  const lineHeight = fontPx * 1.28;
  const padX = fontPx * 0.5;
  const padY = fontPx * 0.3;

  ctx.font = `${style.weight} ${fontPx}px ${FONT_STACK[style.font]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const maxBlockW = width * MAX_WIDTH_RATIO;
  const maxTextW = Math.max(fontPx, maxBlockW - padX * 2);
  const lines = wrap(ctx, text.trim(), maxTextW);
  const blockH = lines.length * lineHeight;

  // Baseline de la primera línea según la posición; en "bottom" el bloque crece
  // hacia arriba desde el margen inferior (6%), así nunca rebasa el frame.
  let baseTop: number;
  if (style.position === "top") baseTop = height * 0.08 + fontPx;
  else if (style.position === "middle") baseTop = (height - blockH) / 2 + fontPx;
  else baseTop = height - height * 0.06 - (lines.length - 1) * lineHeight;

  const cx = width / 2;

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
