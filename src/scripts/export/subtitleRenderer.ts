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

/**
 * Pinta el subtítulo activo (puede ser "") en el contexto del canvas del vídeo.
 * `refHeight` es la altura (px) del frame mostrado en la preview del editor: al
 * escalar la fuente con `height / refHeight`, el subtítulo quemado queda en la
 * misma proporción que el bocadillo de la preview ("lo que ves es lo que exportas").
 */
export function drawSubtitle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  style: SubtitleStyle,
  width: number,
  height: number,
  refHeight: number,
): void {
  if (!text.trim()) return;

  const fontPx = Math.round(style.size * (height / refHeight));
  const lineHeight = Math.round(fontPx * 1.25);
  const padX = Math.round(fontPx * 0.5);
  const padY = Math.round(fontPx * 0.18);
  const margin = Math.round(height * 0.06);

  ctx.font = `${style.weight} ${fontPx}px ${FONT_STACK[style.font]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const maxWidth = width * 0.9;
  const lines = wrap(ctx, text.trim(), maxWidth - padX * 2);
  const blockH = lines.length * lineHeight;

  let top: number;
  if (style.position === "top") top = margin;
  else if (style.position === "middle") top = (height - blockH) / 2;
  else top = height - margin - blockH;

  const cx = width / 2;

  // Un único fondo para todo el bloque (como el bocadillo de la preview): evita
  // que los rects por línea se solapen y dupliquen el alfa entre líneas.
  if (style.bgOpacity > 0) {
    const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.fillStyle = hexToRgba(style.bg, style.bgOpacity);
    ctx.fillRect(cx - maxW / 2 - padX, top - padY, maxW + padX * 2, blockH + padY * 2);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const baseline = top + i * lineHeight + fontPx;
    if (style.outline) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.95)";
      ctx.lineWidth = Math.max(2, fontPx * 0.12);
      ctx.strokeText(line, cx, baseline);
    }
    ctx.fillStyle = style.color;
    ctx.fillText(line, cx, baseline);
  }
}
