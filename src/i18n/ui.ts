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
  app: {
    steps: { upload: string; config: string; editor: string };
    back: string;
    restart: string;
    privateChip: string;
    upload: { title: string; lead: string; cta: string; browse: string; formats: string; privacy: string; chooseAnother: string; next: string };
    config: { title: string; lead: string; source: string; target: string; autodetect: string; sameAsAudio: string; note: string; transcribe: string };
    editor: {
      title: string;
      lead: string;
      segments: string;
      preview: string;
      timeline: string;
      style: string;
      export: string;
      undo: string;
      redo: string;
      tracks: string;
      addLanguage: string;
      addLine: string;
      customize: string;
      animation: string;
      srtBtn: string;
      videoBtn: string;
      format: string;
      quality: string;
      qOptimized: string;
      qHigh: string;
      qLossless: string;
      presets: {
        base: string;
        clean: string;
        bold: string;
        pop: string;
        neon: string;
        classic: string;
        terminal: string;
      };
      styleBar: {
        font: string;
        size: string;
        color: string;
        background: string;
        opacity: string;
        outline: string;
        position: string;
        top: string;
        middle: string;
        bottom: string;
        custom: string;
        sans: string;
        serif: string;
        mono: string;
      };
    };
    exportModal: {
      title: string;
      srt: string;
      srtHint: string;
      video: string;
      videoHint: string;
      webmNote: string;
      close: string;
    };
  };
  /** Strings serialized to window.__I18N__ for runtime scripts. */
  client: {
    appName: string;
    upload: {
      loadingEngine: string;
      extracting: string;
      ready: string;
      kindVideo: string;
      kindAudio: string;
      errorNoAudio: string;
      errorUnsupported: string;
      errorGeneric: string;
    };
    config: {
      preparing: string;
      downloading: string;
      transcribing: string;
      downloadingTr: string;
      translating: string;
      errorGeneric: string;
    };
    editor: {
      empty: string;
      segStart: string;
      segEnd: string;
      segText: string;
      play: string;
      delete: string;
      line: string;
      lines: string;
      mediaPlay: string;
      mediaPause: string;
      original: string;
    };
    export: {
      rendering: string;
      error: string;
      generating: string;
    };
  };
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
          body: "Tweak text and timings, translate it on-device, then export an .srt or a video with burned-in subtitles.",
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
    app: {
      steps: { upload: "Upload", config: "Configure", editor: "Edit" },
      back: "Back",
      restart: "Start over",
      privateChip: "Private · on-device",
      upload: {
        title: "Add your media",
        lead: "Drop a video or audio file. It's read locally — nothing is uploaded.",
        cta: "Drop your file here",
        browse: "Browse files",
        formats: "MP4 · MOV · WebM · MKV · MP3 · WAV · OGG",
        privacy: "Processed on your device. Nothing leaves your browser.",
        chooseAnother: "Choose another file",
        next: "Continue",
      },
      config: {
        title: "Set your languages",
        lead: "Pick the spoken language, then a subtitle language. Choose a different one to translate it on-device.",
        source: "Spoken language",
        target: "Subtitle language",
        autodetect: "Auto-detect",
        sameAsAudio: "Same as audio",
        note: "To translate, pick the spoken language (auto-detect can't translate) and a different subtitle language.",
        transcribe: "Transcribe",
      },
      editor: {
        title: "Edit your subtitles",
        lead: "Tweak text and timings, style the captions, and play to preview.",
        segments: "Segments",
        preview: "Preview",
        timeline: "Timeline",
        style: "Subtitle style",
        export: "Export",
        undo: "Undo",
        redo: "Redo",
        tracks: "Subtitles",
        addLanguage: "Add language",
        addLine: "Add line",
        customize: "Customize",
        animation: "Animation",
        srtBtn: "Download subtitles (.srt)",
        videoBtn: "Download video",
        format: "Format",
        quality: "Quality",
        qOptimized: "Optimized",
        qHigh: "High",
        qLossless: "Lossless",
        presets: {
          base: "Base",
          clean: "Clean",
          bold: "Bold",
          pop: "Pop",
          neon: "Neon",
          classic: "Classic",
          terminal: "Terminal",
        },
        styleBar: {
          font: "Font",
          size: "Size",
          color: "Text",
          background: "Background",
          opacity: "Opacity",
          outline: "Outline",
          position: "Position",
          top: "Top",
          middle: "Middle",
          bottom: "Bottom",
          custom: "Custom",
          sans: "Sans",
          serif: "Serif",
          mono: "Mono",
        },
      },
      exportModal: {
        title: "Export",
        srt: "Subtitles (.srt)",
        srtHint: "A standard subtitle file for any player or editor.",
        video: "Video with subtitles",
        videoHint: "Your video with the captions burned in.",
        webmNote: "Exports as MP4 (WebM on older browsers).",
        close: "Close",
      },
    },
    client: {
      appName: "Subwave",
      upload: {
        loadingEngine: "Loading audio engine…",
        extracting: "Extracting audio…",
        ready: "Audio ready",
        kindVideo: "Video",
        kindAudio: "Audio",
        errorNoAudio: "That file has no audio track.",
        errorUnsupported: "Unsupported file type.",
        errorGeneric: "Couldn't process that file. Try another.",
      },
      config: {
        preparing: "Preparing…",
        downloading: "Downloading the AI model…",
        transcribing: "Transcribing…",
        downloadingTr: "Downloading the translation model…",
        translating: "Translating…",
        errorGeneric: "Transcription failed. Please try again.",
      },
      editor: {
        empty: "No subtitle lines yet. Add one to start.",
        segStart: "Start",
        segEnd: "End",
        segText: "Subtitle text",
        play: "Play from here",
        delete: "Delete line",
        line: "line",
        lines: "lines",
        mediaPlay: "Play",
        mediaPause: "Pause",
        original: "Original",
      },
      export: {
        rendering: "Rendering video…",
        error: "Export failed. Please try again.",
        generating: "Generating",
      },
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
          body: "Ajusta texto y tiempos, traduce en tu dispositivo y exporta un .srt o un vídeo con los subtítulos quemados.",
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
    app: {
      steps: { upload: "Subir", config: "Configurar", editor: "Editar" },
      back: "Atrás",
      restart: "Empezar de nuevo",
      privateChip: "Privado · en tu equipo",
      upload: {
        title: "Añade tu archivo",
        lead: "Suelta un vídeo o audio. Se lee en local: no se sube nada.",
        cta: "Suelta tu archivo aquí",
        browse: "Buscar archivo",
        formats: "MP4 · MOV · WebM · MKV · MP3 · WAV · OGG",
        privacy: "Se procesa en tu dispositivo. Nada sale de tu navegador.",
        chooseAnother: "Elegir otro archivo",
        next: "Continuar",
      },
      config: {
        title: "Elige los idiomas",
        lead: "Indica el idioma hablado y luego el de los subtítulos. Elige uno distinto para traducir en tu dispositivo.",
        source: "Idioma hablado",
        target: "Idioma de subtítulos",
        autodetect: "Autodetectar",
        sameAsAudio: "Igual que el audio",
        note: "Para traducir, indica el idioma hablado (autodetectar no puede traducir) y un idioma de subtítulos distinto.",
        transcribe: "Transcribir",
      },
      editor: {
        title: "Edita tus subtítulos",
        lead: "Ajusta texto y tiempos, dale estilo y reproduce para previsualizar.",
        segments: "Segmentos",
        preview: "Vista previa",
        timeline: "Línea de tiempo",
        style: "Estilo de subtítulo",
        export: "Exportar",
        undo: "Deshacer",
        redo: "Rehacer",
        tracks: "Subtítulos",
        addLanguage: "Añadir idioma",
        addLine: "Añadir línea",
        customize: "Personalizar",
        animation: "Animación",
        srtBtn: "Descargar subtítulos (.srt)",
        videoBtn: "Descargar vídeo",
        format: "Formato",
        quality: "Calidad",
        qOptimized: "Optimizado",
        qHigh: "Alta",
        qLossless: "Sin pérdida",
        presets: {
          base: "Base",
          clean: "Limpio",
          bold: "Negrita",
          pop: "Pop",
          neon: "Neón",
          classic: "Clásico",
          terminal: "Terminal",
        },
        styleBar: {
          font: "Fuente",
          size: "Tamaño",
          color: "Texto",
          background: "Fondo",
          opacity: "Opacidad",
          outline: "Contorno",
          position: "Posición",
          top: "Arriba",
          middle: "Centro",
          bottom: "Abajo",
          custom: "Libre",
          sans: "Sans",
          serif: "Serif",
          mono: "Mono",
        },
      },
      exportModal: {
        title: "Exportar",
        srt: "Subtítulos (.srt)",
        srtHint: "Un archivo de subtítulos estándar para cualquier reproductor o editor.",
        video: "Vídeo con subtítulos",
        videoHint: "Tu vídeo con los subtítulos quemados.",
        webmNote: "Se exporta en MP4 (WebM en navegadores antiguos).",
        close: "Cerrar",
      },
    },
    client: {
      appName: "Subwave",
      upload: {
        loadingEngine: "Cargando motor de audio…",
        extracting: "Extrayendo audio…",
        ready: "Audio listo",
        kindVideo: "Vídeo",
        kindAudio: "Audio",
        errorNoAudio: "Ese archivo no tiene pista de audio.",
        errorUnsupported: "Tipo de archivo no soportado.",
        errorGeneric: "No se pudo procesar el archivo. Prueba con otro.",
      },
      config: {
        preparing: "Preparando…",
        downloading: "Descargando el modelo de IA…",
        transcribing: "Transcribiendo…",
        downloadingTr: "Descargando el modelo de traducción…",
        translating: "Traduciendo…",
        errorGeneric: "La transcripción falló. Inténtalo de nuevo.",
      },
      editor: {
        empty: "Aún no hay líneas. Añade una para empezar.",
        segStart: "Inicio",
        segEnd: "Fin",
        segText: "Texto del subtítulo",
        play: "Reproducir desde aquí",
        delete: "Eliminar línea",
        line: "línea",
        lines: "líneas",
        mediaPlay: "Reproducir",
        mediaPause: "Pausar",
        original: "Original",
      },
      export: {
        rendering: "Renderizando vídeo…",
        error: "El export falló. Inténtalo de nuevo.",
        generating: "Generando",
      },
    },
  },
};
