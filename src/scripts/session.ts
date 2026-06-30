// Estado de la sesión de trabajo, compartido entre etapas (upload → config →
// editor → export). Nada de esto sale del navegador.

import type { Segment } from "@/scripts/subtitles";
import { defaultSubtitleStyle, type SubtitleStyle } from "@/scripts/subtitleStyle";
import { clearWaveCache } from "@/scripts/timeline";

export type MediaKind = "video" | "audio";

export interface SubtitleTrack {
  lang: string; // código corto, "auto" si se autodetectó
  segments: Segment[];
}

export interface MediaSession {
  file: File | null;
  kind: MediaKind | null;
  /** blob: URL para previsualizar el medio (local, nunca se sube). */
  objectUrl: string | null;
  /** PCM mono 16 kHz listo para Whisper. */
  audio: Float32Array | null;
  sampleRate: number;
  duration: number;
  /** Idioma hablado (código Whisper) o null para autodetectar. */
  sourceLang: string | null;
  /** Idioma de los subtítulos de salida. */
  targetLang: string | null;
  /** Segmentos de la pista activa (alias de tracks[activeTrack].segments). */
  segments: Segment[];
  /** Pistas de subtítulos (una por idioma). */
  tracks: SubtitleTrack[];
  activeTrack: number;
  /** Estilo de subtítulo aplicado en el editor y el export. */
  style: SubtitleStyle;
}

export const session: MediaSession = {
  file: null,
  kind: null,
  objectUrl: null,
  audio: null,
  sampleRate: 16000,
  duration: 0,
  sourceLang: null,
  targetLang: null,
  segments: [],
  tracks: [],
  activeTrack: 0,
  style: { ...defaultSubtitleStyle },
};

export function setTracks(tracks: SubtitleTrack[]): void {
  session.tracks = tracks;
  session.activeTrack = Math.max(0, tracks.length - 1);
  session.segments = tracks[session.activeTrack]?.segments ?? [];
}

export function setActiveTrack(index: number): void {
  if (index < 0 || index >= session.tracks.length) return;
  session.activeTrack = index;
  session.segments = session.tracks[index].segments;
}

export function addTrack(track: SubtitleTrack): number {
  session.tracks.push(track);
  return session.tracks.length - 1;
}

export function setFile(file: File, kind: MediaKind): void {
  resetMedia();
  session.file = file;
  session.kind = kind;
  session.objectUrl = URL.createObjectURL(file);
}

export function setAudio(audio: Float32Array, sampleRate: number, duration: number): void {
  session.audio = audio;
  session.sampleRate = sampleRate;
  session.duration = duration;
}

export function resetMedia(): void {
  if (session.objectUrl) URL.revokeObjectURL(session.objectUrl);
  clearWaveCache(); // suelta los picos cacheados (buffer PCM grande)
  session.file = null;
  session.kind = null;
  session.objectUrl = null;
  session.audio = null;
  session.sampleRate = 16000;
  session.duration = 0;
  session.sourceLang = null;
  session.targetLang = null;
  session.segments = [];
  session.tracks = [];
  session.activeTrack = 0;
  session.style = { ...defaultSubtitleStyle };
}
