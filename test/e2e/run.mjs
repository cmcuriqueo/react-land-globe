/**
 * Test E2E: build del playground + server estático efímero + Chromium real.
 *
 *   npm run test:e2e
 *
 * No necesita `npm run dev` corriendo: levanta todo y se apaga solo.
 */
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// ─── 1. Build del playground ────────────────────────────────────────────────
await build({
  entryPoints: ["playground/main.jsx"],
  bundle: true,
  outdir: "playground/dist",
  jsx: "automatic",
  logLevel: "silent",
});

// ─── 2. Server estático en puerto efímero ───────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join("playground", path));
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();

// ─── 3. Tests en Chromium ───────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(err.message));

try {
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Test 1: carga sin errores y con canvas
  const canvas = page.locator("canvas");
  assert.ok(await canvas.isVisible(), "el canvas debe estar visible");
  assert.deepEqual(pageErrors, [], "no debe haber errores de página");
  console.log("✔ e2e: carga sin errores con canvas visible");

  // Test 2: el drag rota el globo (con autorotación pausada para determinismo)
  await page.locator('input[type="range"]').first().fill("0");
  const box = await canvas.boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  const before = await page.screenshot({ clip });

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 200, cy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const after = await page.screenshot({ clip });
  assert.ok(!before.equals(after), "el canvas debe cambiar después del drag");
  console.log("✔ e2e: el drag rota el globo");

  // Test 3: editor de markers — JSON inválido muestra error, preset aplica
  await page.locator("textarea").fill('[{"lat": "mal"}]');
  await page.getByRole("button", { name: "Aplicar" }).click();
  assert.ok(
    await page.locator("text=JSON inválido").isVisible(),
    "JSON inválido debe mostrar mensaje de error",
  );

  await page.getByRole("button", { name: "Capitales" }).click();
  await page.waitForTimeout(400);
  assert.ok(
    !(await page.locator("text=JSON inválido").isVisible()),
    "el error debe limpiarse al aplicar un preset válido",
  );
  const textareaValue = await page.locator("textarea").inputValue();
  assert.ok(textareaValue.includes("Nueva York"), "el preset Capitales debe cargarse");
  assert.deepEqual(pageErrors, [], "no debe haber errores tras interactuar");
  console.log("✔ e2e: editor de markers valida y aplica presets");

  console.log("\n✔ e2e: todos los tests pasaron");
} finally {
  await browser.close();
  server.close();
}
