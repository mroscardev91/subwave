# LÉEME — cómo montar Subwave de principio a fin

Guía corta y directa. Sigue los pasos en orden.

## 0) Qué necesitas instalado

- **Node.js ≥ 22.12** → comprueba con `node -v`.
- **pnpm** → `npm install -g pnpm` (o `corepack enable`).
- **Claude Code** → la herramienta de Anthropic en terminal (`claude`). Si no la tienes, instálala y haz login.
- **Git** + una cuenta de **GitHub** (gratis) y otra de **Vercel** (gratis) para desplegar.

No necesitas comprar dominio. Vercel te da un subdominio `.vercel.app` gratis con HTTPS.

## 1) Crea la carpeta y mete el kit dentro

```sh
mkdir subwave && cd subwave
# Descomprime aquí el contenido de subwave-kit.zip
```

Tras descomprimir, tu carpeta debe quedar EXACTAMENTE así:

```
subwave/
├── CLAUDE.md            ← memoria del proyecto (Claude Code la lee sola)
├── PROMPT.md            ← el prompt que vas a pegar en Claude Code
├── LEEME.md             ← esto que estás leyendo
├── BRANDING.md          ← la marca + el bloque @theme para los colores
├── astro.config.mjs     ← config de Astro (estático, listo para Vercel)
├── vercel.json          ← cabeceras de seguridad/cache para Vercel
├── .claude/
│   └── skills/          ← conocimiento para las partes difíciles (5 skills)
│       ├── browser-asr-transformers/SKILL.md
│       ├── ffmpeg-wasm-audio/SKILL.md
│       ├── webcodecs-video-export/SKILL.md
│       ├── astro-static-i18n/SKILL.md
│       └── tailwind-v4-theming/SKILL.md
└── public/              ← assets de marca ya hechos
    ├── favicon.svg
    ├── favicon-512.png
    ├── apple-touch-icon.png
    ├── og.svg
    └── og.png
```

> **Provisto vs generado.** Todo lo de arriba te lo doy hecho. **Claude Code generará el resto**:
> la carpeta `src/` entera (componentes, scripts, workers, estilos, i18n), el `package.json`,
> el `tsconfig.json`, etc. Tú solo aportas la carpeta de arriba como punto de partida.

## 2) Abre Claude Code y lanza el prompt

```sh
claude
```

Dentro de Claude Code:

1. Abre `PROMPT.md`, copia **todo** su contenido y pégalo como primer mensaje.
2. Claude Code leerá `CLAUDE.md`, `BRANDING.md` y las skills automáticamente y empezará por el **Hito 1**.
3. Trabaja **por hitos** (son 9 en el prompt). Pídele que no pase al siguiente sin que el anterior funcione.

> La marca ya está puesta (Subwave). No tienes que tocar nada para arrancar. Si algún día quieres
> cambiar colores, se hace en un solo sitio: el bloque `@theme` de `BRANDING.md` → `src/styles/global.css`.

## 3) Pruébalo en local (tras el Hito 1)

En otra terminal, dentro de `subwave/`:

```sh
pnpm install
pnpm dev
```

Abre `http://localhost:4321`. Deberías ver la landing de Subwave (papel, logo de onda).
Repite `pnpm dev` y prueba a mano después de cada hito.

Comprobación clave de privacidad: cuando subas un vídeo y se transcriba, abre las herramientas de
desarrollo → pestaña **Network**. No debe haber **ninguna subida** de tu vídeo. Solo verás, la
primera vez, la descarga de los modelos desde Hugging Face (eso es normal y se cachea).

## 4) Súbelo a GitHub

```sh
git init
git add .
git commit -m "Subwave: primer build"
# crea un repo vacío en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/subwave.git
git push -u origin main
```

## 5) Despliega gratis en Vercel

**Opción A (recomendada, por web):**
1. Entra en `vercel.com` → *Add New… → Project* → importa tu repo de GitHub.
2. Vercel detecta Astro solo. Deja todo por defecto y pulsa **Deploy**.
3. Te dará una URL tipo `subwave-xxxx.vercel.app`.

**Opción B (terminal):**
```sh
npx vercel        # primer deploy (te guía)
npx vercel --prod # publicar a producción
```

Luego, abre `astro.config.mjs` y pon tu URL final en `site:` (p. ej. `https://subwave-xxxx.vercel.app`),
haz commit y push. Eso arregla canonical, hreflang, OG y el sitemap.

¿Quieres un subdominio más bonito? En Vercel, *Settings → Domains*, puedes cambiar el nombre del
proyecto para que el subdominio sea `subwave-app.vercel.app`, `usesubwave.vercel.app`, etc. (gratis).

## 6) (Opcional) dominio propio más adelante

No hace falta para nada. Si algún día lo quieres, evita los precios "cebo" (los `$1.54` que renuevan
a $26): mira **la renovación**, no el primer año. Opciones planas y baratas que vimos: un `.fyi`
(~$5.66/año) o un `.com` de una variante (~$10/año). Lo conectas en Vercel en *Settings → Domains*
y actualizas `site:` en `astro.config.mjs`.

---

## Resumen en 6 líneas

1. Instala Node ≥22.12, pnpm, Claude Code, Git.
2. Crea `subwave/` y descomprime el kit dentro.
3. `claude` → pega `PROMPT.md` → construye por hitos.
4. `pnpm install && pnpm dev` para verlo en `localhost:4321`.
5. `git push` a GitHub.
6. Importa el repo en Vercel → Deploy. Pon la URL en `astro.config.mjs`.

Si te atascas en un hito, dile a Claude Code: *"valida el hito N y enséñame qué falta antes de seguir"*.
