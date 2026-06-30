// Copia los binarios WASM de terceros al MISMO origen (public/), para que ni
// FFmpeg ni el backend ONNX de transformers.js tengan que bajarlos de un CDN.
// Se ejecuta en prebuild/predev (vale en local y en el build de Vercel). Los
// destinos están en .gitignore (no se commitean los ~60 MB de wasm).

import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modules = join(root, "node_modules");

async function copyFiles(srcDir, destDir, files) {
  await mkdir(destDir, { recursive: true });
  for (const file of files) {
    await cp(join(srcDir, file), join(destDir, file));
  }
}

// 1) FFmpeg core (single-thread ESM).
await copyFiles(
  join(modules, "@ffmpeg/core/dist/esm"),
  join(root, "public/ffmpeg"),
  ["ffmpeg-core.js", "ffmpeg-core.wasm"],
);

// 2) ONNX Runtime web (lo usa transformers.js para Whisper/OPUS-MT). Es un dep
// transitivo: vive bajo .pnpm con la versión en el nombre, así que lo buscamos.
async function findOrtDist() {
  const direct = join(modules, "onnxruntime-web/dist");
  if (existsSync(direct)) return direct;
  const pnpmDir = join(modules, ".pnpm");
  const entries = await readdir(pnpmDir);
  const match = entries.find((e) => e.startsWith("onnxruntime-web@"));
  if (!match) throw new Error("onnxruntime-web no encontrado en node_modules");
  return join(pnpmDir, match, "node_modules/onnxruntime-web/dist");
}

const ortDist = await findOrtDist();
// Variantes WASM que pide transformers.js: asyncify (no-Safari) y plain (Safari).
await copyFiles(ortDist, join(root, "public/ort"), [
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
]);

console.log("[copy-runtime-assets] FFmpeg core + ONNX Runtime copiados a public/");
