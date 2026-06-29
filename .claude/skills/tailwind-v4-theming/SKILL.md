---
name: tailwind-v4-theming
description: Use cuando definas o cambies la identidad visual con Tailwind CSS 4 sin archivo de config, declarando tokens en @theme dentro de global.css. Para Subwave los tokens exactos están en BRANDING.md; esta skill explica el mecanismo y el sistema de dos modos (papel/agua profunda). Trigger: styles/global.css, @theme, tailwindcss, design tokens, colores de marca, dark mode, papel, agua profunda, aqua.
---

# Theming con Tailwind CSS 4 (Subwave)

En Tailwind v4 **no hay `tailwind.config.js`**: el tema se declara en CSS con `@theme`.

> **La fuente de verdad de los tokens de Subwave es `BRANDING.md`.** Copia de ahí el bloque
> `@theme` completo a `src/styles/global.css`. No inventes colores; usa esos hex.

## El sistema de dos modos (inspirado en subvid.app)

Subwave tiene dos superficies, como subvid:

- **Landing = papel editorial.** `--color-paper` (#F3F4F2), tinta casi negra, textura sutil,
  titulares en Instrument Serif. Aplica la clase `landing` al `<body>` de las páginas de marketing.
- **Editor = "agua profunda".** `--color-deep` (#070B10), superficies oscuras, y el **aqua**
  (`--color-aqua`, #2DE0CE) como **único** color de marca que destaca. Aplica la clase `editor`
  al `<body>` del editor.

El acento aqua es a Subwave lo que el lima es a subvid: un solo color, usado con contención.

## Cómo se usan los tokens

Los tokens de `@theme` generan utilidades automáticamente:

- `--color-aqua` → `bg-aqua`, `text-aqua`, `border-aqua`, `ring-aqua`
- `--color-deep` / `--color-paper` → `bg-deep`, `bg-paper`, `text-on-deep`, …
- `--font-display` → `font-display`  ·  `--radius-card` → `rounded-card`  ·  `--shadow-soft` → `shadow-soft`

```html
<!-- CTA de marca -->
<button class="bg-aqua text-deep rounded-pill px-5 py-2.5 font-medium hover:bg-aqua-deep transition">
  Generar subtítulos
</button>

<!-- Tarjeta en el editor (agua profunda) -->
<div class="bg-deep-soft text-on-deep rounded-card shadow-soft p-6">…</div>
```

## Reglas

- **Un solo color de acento (aqua).** La fuerza viene de la contención.
- El logo es la **onda con su sub-onda** (favicon ya en `public/favicon.svg`). Repite el motivo
  de onda/waveform en el hero, el dropzone y las transiciones.
- Números de la timeline con `font-mono` y `tabular-nums`.
- Foco siempre visible: `focus-visible:ring-2 ring-aqua`.
- Texto sobre aqua: usa `text-deep` (nunca negro puro genérico).
- Respeta `prefers-reduced-motion` (corta animaciones de onda).
- Para reskinear, edita SOLO los tokens en `global.css` (que vienen de BRANDING.md), nunca los componentes.
