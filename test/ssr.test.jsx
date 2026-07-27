// @vitest-environment node
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import LandGlobe from "../src/index.js";
import landDots from "../src/land-dots.js";
import landOutlines from "../src/land-outlines.js";

describe("land-dots (datos de tierra)", () => {
  it("tiene 5617 puntos", () => {
    expect(landDots).toHaveLength(5617);
  });

  it("todos los puntos están en rango lat/lon válido", () => {
    for (const [lat, lon] of landDots) {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }
  });
});

describe("land-outlines (contornos de tierra)", () => {
  it("tiene anillos de contorno", () => {
    expect(landOutlines.length).toBeGreaterThan(0);
  });

  it("cada anillo es un array cerrado de coordenadas [lat, lon]", () => {
    for (const ring of landOutlines) {
      expect(ring.length).toBeGreaterThanOrEqual(3);
      const first = ring[0];
      const last = ring[ring.length - 1];
      expect(first[0]).toBe(last[0]);
      const lonDiff = Math.abs(first[1] - last[1]);
      expect(lonDiff === 0 || lonDiff === 360).toBe(true);
      for (const [lat, lon] of ring) {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("SSR (renderToString)", () => {
  it("renderiza un <canvas> sin tocar browser APIs", () => {
    const html = renderToString(React.createElement(LandGlobe));
    expect(html).toContain("<canvas");
    expect(html).toContain("max-width:520px");
  });

  it("aplica size al contenedor", () => {
    const html = renderToString(React.createElement(LandGlobe, { size: 300 }));
    expect(html).toContain("max-width:300px");
  });

  it("aplica className al contenedor", () => {
    const html = renderToString(
      React.createElement(LandGlobe, { className: "mi-globo" }),
    );
    expect(html).toContain('class="mi-globo"');
  });

  it("respeta interactive=false en el cursor", () => {
    const html = renderToString(
      React.createElement(LandGlobe, { interactive: false }),
    );
    expect(html).toContain("cursor:default");
    expect(html).not.toContain("cursor:grab");
  });
});
