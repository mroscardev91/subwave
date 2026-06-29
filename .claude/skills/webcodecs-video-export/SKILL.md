---
name: webcodecs-video-export
description: Use cuando exportes un vídeo con subtítulos quemados (hard-coded) en el navegador usando WebCodecs + mediabunny, con fallback a canvas + MediaRecorder. Cubre el render de subtítulos sobre cada frame, el muxing a MP4, el progreso y la detección de soporte. Trigger: export/videoExport.ts, export/subtitleRenderer.ts, mediabunny, WebCodecs, VideoEncoder, MediaRecorder, quemar subtítulos, burn-in.
---

# Export de vídeo con subtítulos quemados

Dos caminos. Detecta soporte y elige el mejor disponible.

## Camino A — WebCodecs + mediabunny (rápido, preferido)

`mediabunny` orquesta el muxing a MP4 usando `VideoEncoder`/`AudioEncoder` de WebCodecs.
La idea: por cada frame del vídeo, lo dibujas en un canvas, **pintas encima el subtítulo
activo**, y entregas ese canvas como frame al encoder; el audio original se copia.

Pipeline conceptual:

1. Demux del vídeo de entrada (mediabunny) → pista de vídeo + pista de audio.
2. Por cada frame de vídeo:
   - `ctx.drawImage(frame, …)` en un `OffscreenCanvas` del tamaño del vídeo.
   - Busca el segmento de subtítulo cuyo `[start, end]` contiene el timestamp del frame.
   - Renderiza el texto con el estilo actual (ver `subtitleRenderer.ts`).
   - Encola el canvas como `VideoFrame` al `VideoEncoder`.
3. Copia/transcodifica el audio.
4. mediabunny muxea todo a MP4 y entrega un `Blob` para descargar.

Reporta progreso por frame procesado (`framesHechos / framesTotales`).

> `mediabunny` debe ir **excluido de `optimizeDeps`** en Vite y necesitas `worker: { format: "es" }`.

## Camino B — canvas + MediaRecorder (fallback universal)

Cuando WebCodecs no está disponible (Safari antiguo, etc.):

```ts
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
const stream = canvas.captureStream(30);            // vídeo desde el canvas
// añade el audio del <video> al stream si quieres conservarlo
const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
const chunks: Blob[] = [];
rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

video.play();
const draw = () => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawSubtitle(ctx, subtitleAt(video.currentTime), style); // pinta el subtítulo
  if (!video.ended) requestAnimationFrame(draw);
  else rec.stop();
};
rec.start();
requestAnimationFrame(draw);
// onstop → new Blob(chunks, { type: "video/webm" })
```

Es más lento (corre en tiempo real) y produce WebM, no MP4. Avísalo al usuario.

## Detección de soporte

```ts
const hasWebCodecs = "VideoEncoder" in globalThis && "VideoFrame" in globalThis;
```

Elige Camino A si `hasWebCodecs` (y mediabunny carga); si no, Camino B.

## Render del subtítulo (`subtitleRenderer.ts`)

Función pura que pinta el subtítulo activo en un `CanvasRenderingContext2D` aplicando el estilo:

- **fuente** (familia, tamaño relativo a la altura del vídeo, peso, cursiva)
- **color** del texto y **opacidad**
- **fondo** (caja semitransparente) y/o **contorno** (`strokeText` + `lineWidth`)
- **posición** (top/middle/bottom, márgenes) y **alineación**
- Multi-línea: parte por `\n`, mide con `ctx.measureText`, centra cada línea.

Mantenla idéntica a la previsualización en vivo del editor: el mismo módulo de render debería
servir para la preview en pantalla y para el export, así "lo que ves es lo que exportas".

## Errores comunes

- **Desincronización A/V**: usa los timestamps reales de los frames, no un contador asumido a 30 fps.
- **Texto borroso**: dibuja a la resolución nativa del vídeo, no a la del canvas escalado en CSS.
- **MediaRecorder cuelga**: asegúrate de `rec.stop()` en `video.ended` y de manejar `onerror`.
- **Sin audio en el export**: conecta explícitamente la pista de audio al stream/encoder.
