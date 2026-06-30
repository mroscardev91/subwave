// Export de vídeo con subtítulos quemados. Dos caminos:
//   A (preferido) — WebCodecs + mediabunny → MP4. Determinista y rápido; vive
//     en videoExportMp4.ts.
//   B (fallback universal) — canvas + MediaRecorder → WebM. Reproduce el vídeo
//     en tiempo real, dibuja cada frame + el subtítulo activo en un canvas y
//     graba el stream. Más lento y requiere la pestaña en primer plano.
// exportVideo() detecta soporte de WebCodecs y elige A; si A falla, cae a B.

import { drawSubtitle } from "@/scripts/export/subtitleRenderer";
import { segmentAt, wordsForSegment, type Segment } from "@/scripts/subtitles";
import type { SubtitleStyle } from "@/scripts/subtitleStyle";

export interface VideoExportResult {
  blob: Blob;
  ext: string;
}

export interface VideoExportSource {
  file: Blob;
  objectUrl: string;
}

export type ExportFormat = "mp4" | "webm";
export type ExportQuality = "optimized" | "high" | "lossless";
export interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
}

// Bitrate del WebM (Camino B, MediaRecorder) según la calidad.
const WEBM_BITRATE: Record<ExportQuality, number> = {
  optimized: 2_500_000,
  high: 6_000_000,
  lossless: 16_000_000,
};

const hasWebCodecs = "VideoEncoder" in globalThis && "VideoFrame" in globalThis;

export async function exportVideo(
  source: VideoExportSource,
  segments: Segment[],
  style: SubtitleStyle,
  opts: ExportOptions,
  onProgress: (ratio: number) => void,
): Promise<VideoExportResult> {
  // MP4 si lo pide y hay WebCodecs; si falla, cae al WebM universal.
  if (opts.format === "mp4" && hasWebCodecs) {
    try {
      const { exportMp4 } = await import("@/scripts/export/videoExportMp4");
      return await exportMp4(source.file, segments, style, opts.quality, onProgress);
    } catch (err) {
      console.warn("[export] MP4 (WebCodecs) falló; se cae a WebM:", err);
      onProgress(0);
    }
  }
  return exportWebm(source.objectUrl, segments, style, opts.quality, onProgress);
}

// Camino B — canvas + MediaRecorder → WebM.
async function exportWebm(
  objectUrl: string,
  segments: Segment[],
  style: SubtitleStyle,
  quality: ExportQuality,
  onProgress: (ratio: number) => void,
): Promise<VideoExportResult> {
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = false; // necesario: un elemento muteado no emite audio por Web Audio
  video.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("could not load video"));
  });

  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream();
  // Captura el audio original SIN reproducirlo por los altavoces: el elemento se
  // enruta por Web Audio a un MediaStreamDestination y NO a la salida por
  // defecto, así que se graba en silencio (en lugar de sonar todo el clip).
  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    const srcNode = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    srcNode.connect(dest);
    for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
  } catch {
    /* sin audio (p. ej. el vídeo no trae pista): se graba solo vídeo */
  }

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: WEBM_BITRATE[quality] });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = () => reject(new Error("recording failed"));
  });

  const duration = video.duration || segments.at(-1)?.end || 1;

  video.currentTime = 0;
  await video.play();
  recorder.start();

  const draw = () => {
    ctx.drawImage(video, 0, 0, width, height);
    const seg = segmentAt(segments, video.currentTime);
    drawSubtitle(ctx, seg?.text ?? "", style, width, height, seg ? { words: wordsForSegment(seg), time: video.currentTime } : null);
    onProgress(Math.min(1, video.currentTime / duration));
    if (video.ended) {
      if (recorder.state !== "inactive") recorder.stop();
    } else {
      requestAnimationFrame(draw);
    }
  };
  requestAnimationFrame(draw);

  const blob = await finished;
  void audioCtx?.close();
  onProgress(1);
  return { blob, ext: "webm" };
}
