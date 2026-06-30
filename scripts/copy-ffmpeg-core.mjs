// Copia el core de FFmpeg WASM a public/ffmpeg/ para servirlo desde el MISMO
// origen (no de un CDN de terceros). Se ejecuta en postinstall, así que vale
// tanto en local como en el build de Vercel. Mantiene los ~32 MB del .wasm
// fuera del repo (public/ffmpeg está en .gitignore).

import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@ffmpeg/core/dist/esm");
const dest = join(root, "public/ffmpeg");

await mkdir(dest, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await cp(join(src, file), join(dest, file));
}
console.log("[copy-ffmpeg-core] core copiado a public/ffmpeg/");
