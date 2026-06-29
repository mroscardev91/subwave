// Estado de la sesión de trabajo, compartido entre etapas (upload → config →
// editor → export). Nada de esto sale del navegador.

export type MediaKind = "video" | "audio";

export interface MediaSession {
  file: File | null;
  kind: MediaKind | null;
  /** blob: URL para previsualizar el medio (local, nunca se sube). */
  objectUrl: string | null;
  /** PCM mono 16 kHz listo para Whisper. */
  audio: Float32Array | null;
  sampleRate: number;
  duration: number;
}

export const session: MediaSession = {
  file: null,
  kind: null,
  objectUrl: null,
  audio: null,
  sampleRate: 16000,
  duration: 0,
};

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
  session.file = null;
  session.kind = null;
  session.objectUrl = null;
  session.audio = null;
  session.sampleRate = 16000;
  session.duration = 0;
}
