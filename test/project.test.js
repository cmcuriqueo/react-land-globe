import { describe, it, expect } from "vitest";
import { project } from "../src/project.js";

const R = 100;
const CX = 250;
const CY = 250;

describe("project", () => {
  it("el ecuador en lon 0 sin rotación cae a la derecha del centro, en el borde", () => {
    const p = project(0, 0, 0, 0, R, CX, CY);
    expect(p.x).toBeCloseTo(CX + R);
    expect(p.y).toBeCloseTo(CY);
    expect(p.z).toBeCloseTo(0);
  });

  it("el polo norte queda arriba del centro", () => {
    const p = project(90, 0, 0, 0, R, CX, CY);
    expect(p.x).toBeCloseTo(CX);
    expect(p.y).toBeCloseTo(CY - R);
  });

  it("lon -90 queda al frente (z > 0) y lon 90 detrás (z < 0) sin rotación", () => {
    expect(project(0, -90, 0, 0, R, CX, CY).z).toBeCloseTo(R);
    expect(project(0, 90, 0, 0, R, CX, CY).z).toBeCloseTo(-R);
  });

  it("rotY = π/2 trae el punto (0,0) del borde al frente", () => {
    const p = project(0, 0, 0, Math.PI / 2, R, CX, CY);
    expect(p.x).toBeCloseTo(CX);
    expect(p.z).toBeCloseTo(R);
  });

  it("rotY = π manda un punto del frente al hemisferio trasero", () => {
    // (0, -90) empieza al frente (z = +R); al girar π queda atrás.
    expect(project(0, -90, 0, Math.PI, R, CX, CY).z).toBeCloseTo(-R);
  });

  it("rotX inclina: el polo norte pasa al frente con rotX = π/2", () => {
    const p = project(90, 0, Math.PI / 2, 0, R, CX, CY);
    expect(p.z).toBeCloseTo(R);
    expect(p.y).toBeCloseTo(CY);
  });

  it("los puntos siempre caen dentro del círculo de proyección", () => {
    for (const [lat, lon] of [[-34.6, -58.38], [19.43, -99.13], [48.85, 2.35], [-82.8, -145.2]]) {
      for (const rotY of [0, 1.3, 2.6, 4.1]) {
        const p = project(lat, lon, 0.41, rotY, R, CX, CY);
        const dist = Math.hypot(p.x - CX, p.y - CY);
        expect(dist).toBeLessThanOrEqual(R + 1e-9);
      }
    }
  });

  it("longitudes opuestas tienen z de signo contrario", () => {
    const a = project(10, -58.38, 0, 0, R, CX, CY);
    const b = project(10, -58.38 + 180, 0, 0, R, CX, CY);
    expect(Math.sign(a.z)).not.toBe(0);
    expect(Math.sign(a.z)).toBe(-Math.sign(b.z));
  });
});
