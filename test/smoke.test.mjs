/**
 * Smoke test: el componente se puede importar en Node (SSR) y renderiza
 * el markup esperado sin tocar browser APIs.
 */
import { strict as assert } from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import LandGlobe from "../src/index.js";
import landDots from "../src/land-dots.js";

// Datos de tierra
assert.equal(landDots.length, 5617, "land-dots.js debe tener 5617 puntos");
assert.ok(
  landDots.every(([lat, lon]) => lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180),
  "todos los puntos deben estar en rango lat/lon válido",
);

// Render SSR
const html = renderToString(
  React.createElement(LandGlobe, {
    markers: [{ lat: 0, lon: 0, name: "Test" }],
    size: 300,
  }),
);
assert.ok(html.includes("<canvas"), "el markup debe incluir un <canvas>");
assert.ok(html.includes("max-width:300px"), "el prop size debe aplicarse al contenedor");

// Render con todos los defaults
const htmlDefault = renderToString(React.createElement(LandGlobe));
assert.ok(htmlDefault.includes("max-width:520px"), "size default = 520");

console.log("✔ smoke test OK (SSR + datos de tierra)");
