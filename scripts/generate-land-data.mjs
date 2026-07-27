/**
 * Precomputa los datos de tierra del globo en build time.
 *
 * Decodifica data/land-110m.json (TopoJSON de Natural Earth) y genera:
 *  - src/land-dots.js: grilla lat/lon muestreada con point-in-polygon.
 *  - src/land-outlines.js: anillos exteriores de los continentes, subdivididos
 *    para que el render en canvas pueda seguir la curvatura del globo.
 *
 * Uso: npm run generate-land-data
 * Re-correr solo si cambia data/land-110m.json o el paso de muestreo.
 */
import { readFileSync, writeFileSync } from "node:fs";

const landTopology = JSON.parse(
  readFileSync(new URL("../data/land-110m.json", import.meta.url)),
);

// ─── Decodificador mínimo de TopoJSON ───────────────────────────────────────
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

      // ─── Unwrap: elimina saltos de ±360° en longitud ─────────────────────
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

// ─── Point-in-polygon ───────────────────────────────────────────────────────
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

const CONTINENT_POLYGONS = decodeTopology(landTopology);

// ─── Generar puntos de tierra ───────────────────────────────────────────────
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

writeFileSync(
  new URL("../src/land-dots.js", import.meta.url),
  `// Generado por scripts/generate-land-data.mjs — no editar a mano.\nexport default ${JSON.stringify(dots)};\n`,
);

console.log(`✔ ${dots.length} puntos generados en src/land-dots.js`);

// ─── Generar contornos de tierra ────────────────────────────────────────────

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function angularDistance(a, b) {
  const [lat1, lon1] = a.map(toRad);
  const [lat2, lon2] = b.map(toRad);
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function roundCoord(v) {
  return Math.round(v * 10) / 10;
}

function normalizeLon(lon) {
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function interpolate(a, b, t) {
  // Interpolación esférica lineal (slerp) simplificada: convertimos a 3D,
  // interpolamos y volvemos a lat/lon. Es robusta para segmentos largos.
  const [lat1, lon1] = a.map(toRad);
  const [lat2, lon2] = b.map(toRad);

  const x1 = Math.cos(lat1) * Math.cos(lon1);
  const y1 = Math.cos(lat1) * Math.sin(lon1);
  const z1 = Math.sin(lat1);

  const x2 = Math.cos(lat2) * Math.cos(lon2);
  const y2 = Math.cos(lat2) * Math.sin(lon2);
  const z2 = Math.sin(lat2);

  const x = x1 + (x2 - x1) * t;
  const y = y1 + (y2 - y1) * t;
  const z = z1 + (z2 - z1) * t;

  const len = Math.sqrt(x * x + y * y + z * z);
  const lat = (Math.asin(z / len) * 180) / Math.PI;
  let lon = (Math.atan2(y, x) * 180) / Math.PI;
  return [roundCoord(lat), roundCoord(normalizeLon(lon))];
}

function subdivideRing(ring, maxAngleDeg) {
  const maxAngle = toRad(maxAngleDeg);
  const out = [ring[0].map(roundCoord).map((v, i) => (i === 1 ? normalizeLon(v) : v))];

  for (let i = 1; i < ring.length; i++) {
    const prev = out[out.length - 1];
    const curr = ring[i];
    const d = angularDistance(prev, curr);

    if (d > maxAngle) {
      const segments = Math.ceil(d / maxAngle);
      for (let s = 1; s < segments; s++) {
        out.push(interpolate(prev, curr, s / segments));
      }
    }
    out.push([roundCoord(curr[0]), roundCoord(normalizeLon(curr[1]))]);
  }

  return out;
}

const outlineMaxAngle = 1.5; // grados: suave incluso en globos grandes
const outlines = CONTINENT_POLYGONS.map((ring) =>
  subdivideRing(ring, outlineMaxAngle),
);

writeFileSync(
  new URL("../src/land-outlines.js", import.meta.url),
  `// Generado por scripts/generate-land-data.mjs — no editar a mano.\nexport default ${JSON.stringify(outlines)};\n`,
);

console.log(`✔ ${outlines.length} contornos generados en src/land-outlines.js`);
