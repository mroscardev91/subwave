# BRANDING.md — Subwave

Identidad de **Subwave**: subtítulos con IA, 100% en el navegador. Del audio al texto.
Receta: landing de papel editorial + editor oscuro + un
único acento neón), llevada a un concepto de **onda/waveform** y a un acento **aqua**.

## Nombre y concepto

**Subwave** = *sub* (subtítulo) + *wave* (la onda de audio). Tu app convierte una **onda de
sonido en texto**, y la forma de onda es justo lo que enseña el editor. De ahí sale todo: el
logo es una onda, el editor es "agua profunda", el acento es el aqua de una onda iluminada.

El matiz de *"sub"* (debajo) se dibuja con una **segunda onda más tenue bajo la principal**:
una onda y su "sub-onda". Eso es el logo.

> Nota: "Subwave" es un nombre concurrido fuera de los subtítulos (Garmin SubWave™ de sonar,
> un GPS SubWAVE™, un DJ de drum & bass). No hay choque con ningún producto de subtítulos, pero
> el SEO será ruidoso. Perfecto para un proyecto indie; tenlo en cuenta si algún día lo registras.

## Posicionamiento

- **ES:** Genera, edita y traduce subtítulos con IA en tu navegador. Del audio al texto, sin que tu archivo salga de tu equipo.
- **EN:** Generate, edit and translate subtitles with AI in your browser. From sound to text — your file never leaves your device.

## Taglines

- "Del audio al texto." / "From sound to subtitles."
- "Subtítulos con IA, en tu navegador." / "AI subtitles, right in your browser."
- "Tu vídeo no se sube. Se queda." / "Your video stays put."

## Voz

Clara y directa (sin palabros), cálida y de tú, honesta con la privacidad sin meter miedo,
y con criterio técnico (tu usuario suele saber). Frases cortas, voz activa. Nada de "IA
revolucionaria", "sin esfuerzo mágico" ni dark patterns.

## Logo

**La marca de onda.** Dos ondas que fluyen: una **onda aqua brillante** y, debajo, una
**sub-onda más tenue** (el "sub" de Subwave). Lee como sonido/agua y encierra el nombre.

- **Favicon / isotipo:** las dos ondas dentro de un cuadrado redondeado "agua profunda"
  (`#070B10`), ondas en aqua. Escala perfecto (ver `favicon.svg`).
- **Lockup horizontal:** isotipo a la izquierda + wordmark **"Subwave"** en Outfit 600,
  tracking ajustado.
- **Concepto extendido:** la onda se aplana hacia la derecha hasta convertirse en una **línea
  de texto** (la base de un subtítulo): "onda → texto". Úsalo en el hero y en transiciones.
- **Animación:** la onda ondula en reposo; al "transcribir", la cresta recorre la onda de
  izquierda a derecha y se resuelve en líneas de subtítulo. Respeta `prefers-reduced-motion`.
- **Color del logo:** ondas aqua sobre oscuro; sobre papel, ondas en tinta con la cresta aqua.

## Color

Dos modos:

- **Landing = papel editorial.** Fondo papel cálido-neutro, tinta casi negra, textura sutil.
- **Editor = "agua profunda".** Casi negro azulado, superficies oscuras, y el **aqua** como
  único color de marca que destaca.

| Token | Hex | Uso |
| --- | --- | --- |
| `paper` | `#F3F4F2` | Fondo de la landing |
| `paper-soft` | `#FAFAF8` | Tarjetas sobre papel |
| `ink` | `#15171A` | Texto principal (papel) |
| `ink-soft` | `#5E6470` | Texto secundario (papel) |
| `line` | `#DADBD8` | Bordes finos (papel) |
| `deep` | `#070B10` | Fondo del editor (agua profunda) |
| `deep-soft` | `#0E141B` | Tarjetas/superficies del editor |
| `on-deep` | `#EEF2F0` | Texto sobre oscuro |
| `on-deep-soft` | `#8A93A0` | Texto secundario sobre oscuro |
| `aqua` | `#2DE0CE` | **Acento único**: CTA, foco, onda, progreso |
| `aqua-deep` | `#15B5A6` | Sub-onda, hover, bordes de acento |
| `aqua-soft` | `#DFF8F4` | Tinte suave de acento sobre papel |
| `success` | `#3DD68C` | Estado "listo" |
| `alert` | `#FF6B6B` | Errores / no soportado |

Regla de oro: **un solo color de marca (aqua)**. La fuerza viene de la contención, igual que
El aqua sobre "agua profunda" es el momento de marca.

### Tokens para `src/styles/global.css` (Tailwind v4)

```css
@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap");
@import "tailwindcss";

@theme {
  /* Papel (landing) */
  --color-paper:        #F3F4F2;
  --color-paper-soft:   #FAFAF8;
  --color-ink:          #15171A;
  --color-ink-soft:     #5E6470;
  --color-line:         #DADBD8;

  /* Agua profunda (editor) */
  --color-deep:         #070B10;
  --color-deep-soft:    #0E141B;
  --color-on-deep:      #EEF2F0;
  --color-on-deep-soft: #8A93A0;

  /* Acento único */
  --color-aqua:         #2DE0CE;
  --color-aqua-deep:    #15B5A6;
  --color-aqua-soft:    #DFF8F4;

  /* Estado */
  --color-success:      #3DD68C;
  --color-alert:        #FF6B6B;

  /* Tipografía */
  --font-display: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans:    "Outfit", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Forma */
  --radius-card: 18px;
  --radius-pill: 999px;
  --shadow-soft: 0 4px 18px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.05);
}

@layer base {
  html { color-scheme: light; }
  body {
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
  /* Textura de papel sutil en la landing */
  body.landing {
    background:
      radial-gradient(circle at 0% 0%, rgba(0,0,0,0.035), transparent 46%),
      repeating-linear-gradient(0deg, rgba(0,0,0,0.018) 0, rgba(0,0,0,0.018) 1px, transparent 1px, transparent 7px),
      linear-gradient(180deg, var(--color-paper), #EFF1EE);
    background-attachment: fixed;
  }
  /* El editor invierte a "agua profunda" */
  body.editor { background: var(--color-deep); color: var(--color-on-deep); }
  h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.01em; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
}
```

Genera utilidades: `bg-aqua`, `text-aqua`, `border-aqua`, `bg-deep`, `text-on-deep`,
`rounded-card`, `shadow-soft`, `font-display`, etc.

## Tipografía

Dúo tipográfico editorial:

- **Display:** Instrument Serif (titulares, hero) — serif elegante con cursiva.
- **UI / cuerpo:** Outfit (300–600) — sans geométrica limpia.
- **Timecodes:** JetBrains Mono con `tabular-nums` para que la timeline no "baile".

Sentence case en la UI. Foco siempre visible: `focus-visible:ring-2 ring-aqua`.

## Bloque BRAND para `PROMPT.md`

```
APP_NAME   = "Subwave"
DOMAIN     = "subwave.pro"   # ajusta a tu URL real (p. ej. subwave-app.vercel.app)
TAGLINE_ES = "Del audio al texto. Subtítulos con IA en tu navegador, sin que tu vídeo salga de tu equipo."
TAGLINE_EN = "From sound to subtitles. AI captions in your browser — your video never leaves your device."
VIBE       = "Landing de papel editorial (Instrument Serif + Outfit, textura sutil) y editor oscuro 'agua profunda' con un único acento aqua eléctrico. Motivo de onda/waveform por toda la marca; el logo es una onda con su sub-onda debajo."
```

## Meta / OG (para `src/i18n/ui.ts`)

```
EN  title: "Subwave — AI subtitles for any video"
    desc:  "Generate, edit and translate subtitles with AI right in your browser. From sound to text — no uploads, no servers, your file never leaves your device."
ES  title: "Subwave — Subtítulos con IA para cualquier vídeo"
    desc:  "Genera, edita y traduce subtítulos con IA en tu navegador. Del audio al texto: sin subidas ni servidores, tu archivo nunca sale de tu equipo."
```

## Assets incluidos

- `public/favicon.svg` — isotipo de onda sobre agua profunda.
- `public/og.svg` — tarjeta social 1200×630 (rasterízala a PNG para máxima compatibilidad).
