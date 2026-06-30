// Camino A — WebCodecs + mediabunny → MP4 (rápido, determinista).
// Demuxea el vídeo de entrada, decodifica cada frame a un canvas, pinta encima
// el subtítulo activo y lo re-encodea; el audio original se copia tal cual (sin
// transcodificar). No reproduce el <video> en tiempo real, así que funciona en
// pestañas en segundo plano y no depende de la velocidad de reproducción.

import {
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  CanvasSink,
  CanvasSource,
  EncodedPacketSink,
  EncodedAudioPacketSource,
  ALL_FORMATS,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
} from "mediabunny";

import { drawSubtitle } from "@/scripts/export/subtitleRenderer";
import { segmentAt, wordsForSegment } from "@/scripts/subtitles";
import type { Segment } from "@/scripts/subtitles";
import type { SubtitleStyle } from "@/scripts/subtitleStyle";
import type { VideoExportResult } from "@/scripts/export/videoExport";

export async function exportMp4(
  file: Blob,
  segments: Segment[],
  style: SubtitleStyle,
  onProgress: (ratio: number) => void,
): Promise<VideoExportResult> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("no video track");

    const width = videoTrack.displayWidth;
    const height = videoTrack.displayHeight;
    const duration = (await input.computeDuration()) || segments.at(-1)?.end || 1;

    const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1", "hevc", "vp8"], { width, height });
    if (!codec) throw new Error("no encodable video codec");

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;

    const format = new Mp4OutputFormat();
    const output = new Output({ format, target: new BufferTarget() });
    const videoSource = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource);

    // Copia del audio original (sin transcodificar) si el formato MP4 lo admite.
    const audioTrack = await input.getPrimaryAudioTrack();
    const audioCodec = audioTrack ? await audioTrack.getCodec() : null;
    const audioSource =
      audioTrack && audioCodec && format.getSupportedAudioCodecs().includes(audioCodec)
        ? new EncodedAudioPacketSource(audioCodec)
        : null;
    if (audioSource) output.addAudioTrack(audioSource);

    await output.start();

    // Vídeo: cada frame decodificado → dibuja frame + subtítulo → encodea.
    const sink = new CanvasSink(videoTrack, { poolSize: 2 });
    for await (const frame of sink.canvases()) {
      ctx.drawImage(frame.canvas, 0, 0, width, height);
      const seg = segmentAt(segments, frame.timestamp);
      drawSubtitle(ctx, seg?.text ?? "", style, width, height, seg ? { words: wordsForSegment(seg), time: frame.timestamp } : null);
      await videoSource.add(frame.timestamp, frame.duration);
      onProgress(Math.min(0.99, frame.timestamp / duration));
    }

    // Audio: copia los paquetes encodeados en orden de decodificación.
    if (audioSource && audioTrack) {
      const audioSink = new EncodedPacketSink(audioTrack);
      const decoderConfig = await audioTrack.getDecoderConfig();
      let first = true;
      for await (const packet of audioSink.packets()) {
        await audioSource.add(packet, first ? { decoderConfig: decoderConfig! } : undefined);
        first = false;
      }
    }

    await output.finalize();
    onProgress(1);

    const buffer = (output.target as BufferTarget).buffer!;
    return { blob: new Blob([buffer], { type: "video/mp4" }), ext: "mp4" };
  } finally {
    input.dispose();
  }
}
