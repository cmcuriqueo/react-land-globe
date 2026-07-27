import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const OUTDIR = "playground/dist";

await build({
  entryPoints: ["playground/main.jsx"],
  bundle: true,
  outdir: OUTDIR,
  jsx: "automatic",
  logLevel: "info",
});

// Copiamos index.html ajustando la ruta del script para que apunte al bundle.
const html = await readFile("playground/index.html", "utf8");
const deployedHtml = html.replace('./dist/main.js', './main.js');
await writeFile(join(OUTDIR, "index.html"), deployedHtml);

// Limpieza de un artefacto anterior de Pages que ya no se usa en Workers static assets.
await rm(join(OUTDIR, "_redirects"), { force: true });

console.log(`✔ playground built in ${OUTDIR}`);
