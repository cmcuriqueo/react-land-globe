/**
 * Precomputa los puntos de tierra del globo en build time.
 *
 * Decodifica data/land-110m.json (TopoJSON de Natural Earth) y muestrea una
 * grilla lat/lon con point-in-polygon. El resultado se guarda como módulo ESM
 * en src/land-dots.js, así el cálculo se hace una sola vez, acá, y no en cada
 * hidratación del cliente.
 *
 * Uso: npm run generate-land-dots
 * Re-correr solo si cambia data/land-110m.json o el paso de muestreo.
 */
import { readFileSync, writeFileSync } from "node:fs";

const landTopology = JSON.parse(
  readFileSync(new URL("../data/land-110m.json", import.meta.url)),
);

// ─── Decodificador mínimo de TopoJSON (idéntico al de Globe.jsx) ────────────
function decodeTopology(topology) {
  const { arcs, transform } = topology;
  const { scale, translate } = transform;

  const decodedArcs = arcs.map((arc) => {
    let x = 0,
      y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; // [lon, lat]
    });
  });

  const geom = topology.objects.land.geometries[0];
  const polygons = [];

  for (const polyArcs of geom.arcs) {
    const ringArcs = polyArcs[0]; // solo anillo exterior
    const ring = [];

    for (const arcIdx of ringArcs) {
      const reverse = arcIdx < 0;
      const arc = decodedArcs[reverse ? ~arcIdx : arcIdx];
      const points = reverse ? [...arc].reverse() : arc;

      const start = ring.length === 0 ? 0 : 1;
      for (let i = start; i < points.length; i++) {
        ring.push([points[i][1], points[i][0]]); // [lat, lon]
      }
    }

    if (ring.length >= 3) {
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        ring.push([...ring[0]]);
      }

      // ─── Unwrap: elimina saltos de ±360° en longitud ────────────────
      const unwrapped = [ring[0].slice()];
      for (let i = 1; i < ring.length; i++) {
        let [lat, lon] = ring[i];
        const prevLon = unwrapped[unwrapped.length - 1][1];
        let dlon = lon - prevLon;
        if (dlon > 180) lon -= 360;
        else if (dlon < -180) lon += 360;
        unwrapped.push([lat, lon]);
      }
      polygons.push(unwrapped);
    }
  }

  return polygons;
}

// ─── Point-in-polygon (idéntico al de Globe.jsx) ────────────────────────────
function isPointInPolygon(point, polygon) {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Muestreo (idéntico al de Globe.jsx) ────────────────────────────────────
const CONTINENT_POLYGONS = decodeTopology(landTopology);

const dots = [];
const step = 1.45;

const isLand = (lat, lon) => {
  for (const shift of [0, 360, -360]) {
    const testLon = lon + shift;
    if (CONTINENT_POLYGONS.some((poly) => isPointInPolygon([lat, testLon], poly))) {
      return true;
    }
  }
  return false;
};

const latOffset = 0.17;

for (let lat = -83 + latOffset; lat <= 83; lat += step) {
  const radiusAtLat = Math.cos((lat * Math.PI) / 180);
  const lonStep = Math.max(step * 0.85, 360 / Math.round((360 * radiusAtLat) / step));

  for (let lon = -180; lon < 180; lon += lonStep) {
    if (isLand(lat, lon)) {
      // 1 decimal de precisión: invisible a esta escala y achica el JSON.
      dots.push([Math.round(lat * 10) / 10, Math.round(lon * 10) / 10]);
    }
  }
}

const outPath = new URL("../src/land-dots.js", import.meta.url);
writeFileSync(
  outPath,
  `// Generado por scripts/generate-land-dots.mjs — no editar a mano.\nexport default ${JSON.stringify(dots)};\n`,
);

console.log(`✔ ${dots.length} puntos generados en src/land-dots.js`);
