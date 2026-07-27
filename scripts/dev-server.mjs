/**
 * Servidor de desarrollo del playground: bundlea playground/main.jsx con
 * esbuild y lo sirve en http://localhost:4310 con rebuild automático.
 *
 * Uso: npm run dev
 */
import { context } from "esbuild";

const ctx = await context({
  entryPoints: ["playground/main.jsx"],
  bundle: true,
  outdir: "playground/dist",
  jsx: "automatic",
  logLevel: "info",
});

await ctx.watch();
const { port } = await ctx.serve({ servedir: "playground", port: 4310 });

console.log(`\n  ▶ Playground: http://localhost:${port}\n`);
