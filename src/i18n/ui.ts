import type { Lang } from "./locales";

export interface UIStrings {
  meta: { title: string; description: string };
  nav: { how: string; privacy: string; start: string };
  hero: {
    badge: string;
    titleLead: string;
    titleEm: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    formats: string;
    caption: string;
  };
  steps: {
    title: string;
    lead: string;
    items: { title: string; body: string }[];
  };
  privacy: { title: string; body: string; points: string[] };
  footer: { tagline: string; note: string; rights: string };
  navLabel: string;
  langLabel: string;
  /** Strings serialized to window.__I18N__ for runtime scripts. */
  client: Record<string, string>;
}

export const ui: Record<Lang, UIStrings> = {
  en: {
    meta: {
      title: "Subwave — AI subtitles for any video",
      description:
        "Generate, edit and translate subtitles with AI right in your browser. From sound to text — no uploads, no servers, your file never leaves your device.",
    },
    nav: { how: "How it works", privacy: "Privacy", start: "Get started" },
    hero: {
      badge: "100% in your browser",
      titleLead: "From sound",
      titleEm: "to subtitles.",
      sub: "Generate, edit and translate captions with on-device AI. Your video never leaves your computer — no uploads, no servers, no API keys.",
      ctaPrimary: "Generate subtitles",
      ctaSecondary: "How it works",
      formats: "MP4 · MOV · WebM · MKV · MP3 · WAV · OGG",
      caption: "From sound to subtitles",
    },
    steps: {
      title: "Three steps, zero uploads",
      lead: "Everything runs locally. The only thing that ever downloads is the AI model — once.",
      items: [
        {
          title: "Drop your file",
          body: "Pick a video or audio file. It's read locally with the File API — nothing is sent anywhere.",
        },
        {
          title: "AI transcribes",
          body: "A Whisper model runs in your browser and turns speech into timed segments you can edit on a timeline.",
        },
        {
          title: "Edit & export",
          body: "Tweak text and timings, translate with NLLB, then export an .srt or a video with burned-in subtitles.",
        },
      ],
    },
    privacy: {
      title: "Privacy is the architecture",
      body: "Subwave has no backend. The AI models download once from Hugging Face and cache in your browser. After that, everything — transcription, translation, export — happens on your device.",
      points: ["No uploads", "No servers", "No accounts", "No tracking"],
    },
    footer: {
      tagline: "From sound to subtitles.",
      note: "Your video stays put.",
      rights: "Open, private, on-device.",
    },
    navLabel: "Primary",
    langLabel: "Language",
    client: {
      appName: "Subwave",
    },
  },

  es: {
    meta: {
      title: "Subwave — Subtítulos con IA para cualquier vídeo",
      description:
        "Genera, edita y traduce subtítulos con IA en tu navegador. Del audio al texto: sin subidas ni servidores, tu archivo nunca sale de tu equipo.",
    },
    nav: { how: "Cómo funciona", privacy: "Privacidad", start: "Empezar" },
    hero: {
      badge: "100% en tu navegador",
      titleLead: "Del audio",
      titleEm: "al texto.",
      sub: "Genera, edita y traduce subtítulos con IA local. Tu vídeo nunca sale de tu equipo: sin subidas, sin servidores, sin API keys.",
      ctaPrimary: "Generar subtítulos",
      ctaSecondary: "Cómo funciona",
      formats: "MP4 · MOV · WebM · MKV · MP3 · WAV · OGG",
      caption: "Del audio al texto",
    },
    steps: {
      title: "Tres pasos, cero subidas",
      lead: "Todo corre en local. Lo único que se descarga es el modelo de IA, y solo una vez.",
      items: [
        {
          title: "Suelta tu archivo",
          body: "Elige un vídeo o audio. Se lee en local con la File API: no se envía nada a ningún sitio.",
        },
        {
          title: "La IA transcribe",
          body: "Un modelo Whisper corre en tu navegador y convierte la voz en segmentos con tiempos que editas en una timeline.",
        },
        {
          title: "Edita y exporta",
          body: "Ajusta texto y tiempos, traduce con NLLB y exporta un .srt o un vídeo con los subtítulos quemados.",
        },
      ],
    },
    privacy: {
      title: "La privacidad es la arquitectura",
      body: "Subwave no tiene backend. Los modelos de IA se descargan una vez desde Hugging Face y se cachean en tu navegador. A partir de ahí todo —transcripción, traducción, export— ocurre en tu equipo.",
      points: ["Sin subidas", "Sin servidores", "Sin cuentas", "Sin rastreo"],
    },
    footer: {
      tagline: "Del audio al texto.",
      note: "Tu vídeo se queda.",
      rights: "Abierto, privado, en tu dispositivo.",
    },
    navLabel: "Principal",
    langLabel: "Idioma",
    client: {
      appName: "Subwave",
    },
  },
};
