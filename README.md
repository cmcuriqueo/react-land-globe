# react-land-globe

Globo terráqueo interactivo en **canvas** para React: continentes dibujados con puntos (5.617 coordenadas precomputadas de Natural Earth), rotación automática, marcadores con glow y arrastre horizontal con mouse/touch.

- **Cero dependencias** — solo necesita `react` (peer dependency)
- **Sin build step** — ESM plano, funciona directo en Vite, Next.js, Astro, CRA
- **SSR-safe** — no toca el DOM hasta el `useEffect` (sirve para Next.js y Astro islands)
- **Liviano** — ~70 KB de datos de tierra, sin librerías de mapas ni WebGL

## Instalación

```bash
npm install react-land-globe
```

## Uso

```jsx
import LandGlobe from "react-land-globe";

export default function App() {
  return <LandGlobe />;
}
```

Con marcadores propios:

```jsx
<LandGlobe
  markers={[
    { lat: -34.6, lon: -58.38, name: "Buenos Aires" },
    { lat: 40.71, lon: -74.0, name: "Nueva York" },
    { lat: 48.85, lon: 2.35, name: "París", color: "59, 130, 246", size: 8 },
  ]}
  autoRotateSpeed={0.002}
  markerColor="227, 25, 55"
/>
```

### Next.js (App Router)

Es un componente de cliente:

```jsx
"use client";
import LandGlobe from "react-land-globe";
```

### Astro

```astro
---
import LandGlobe from "react-land-globe";
---
<!-- Se hidrata solo cuando entra en pantalla: -->
<LandGlobe client:visible />
```

## Props

| Prop | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `markers` | `GlobeMarker[]` | 9 ciudades de LatAm | Puntos a marcar: `{ lat, lon, name?, color?, glowColor?, size? }` |
| `size` | `number` | `520` | Ancho máximo del contenedor en px (el globo siempre es cuadrado) |
| `autoRotateSpeed` | `number` | `0.0026` | Velocidad de rotación (radianes por frame). `0` la desactiva |
| `dragSpeed` | `number` | `0.005` | Sensibilidad del arrastre |
| `interactive` | `boolean` | `true` | Habilita arrastrar con mouse/touch |
| `initialRotation` | `{ x, y }` | `{ x: 0.41, y: -0.9 }` | Rotación inicial (el default centra América) |
| `dotColor` | `string` | `"255, 255, 255"` | Color de los puntos de tierra (triplete RGB) |
| `dotOpacity` | `number` | `0.55` | Opacidad máxima de los puntos |
| `markerColor` | `string` | `"220, 38, 38"` | Color de los marcadores (triplete RGB) |
| `markerGlowColor` | `string` | `"239, 68, 68"` | Color del glow de los marcadores |
| `markerCoreColor` | `string` | `"255, 255, 255"` | Punto central de los marcadores |
| `backgroundStops` | `[number, string][]` | gradiente gris→negro | Stops del gradiente radial de fondo |
| `showAtmosphere` | `boolean` | `true` | Halo de atmósfera alrededor del globo |
| `maxPixelRatio` | `number` | — | Tope de `devicePixelRatio` para ahorrar GPU |
| `className` / `style` | — | — | Se aplican al contenedor |

> Los colores se pasan como triplete RGB (`"220, 38, 38"`) porque el componente
> los combina con distintos niveles de opacidad según la profundidad del punto.

## Regenerar los puntos de tierra

Los puntos salen de `data/land-110m.json` (TopoJSON de Natural Earth 110m). Si
cambiás el dataset o querés otra densidad de muestreo:

```bash
npm run generate-land-dots
```

Eso reescribe `src/land-dots.js`. El paso de muestreo (`step`) se ajusta en
`scripts/generate-land-dots.mjs`.

## Cómo funciona

El globo proyecta ~5.600 puntos `(lat, lon)` sobre una esfera 3D con dos
rotaciones (`x` e `y`), descarta los del hemisferio trasero y modula la
opacidad según la profundidad (`z`) para dar sensación de volumen. Los puntos
están precomputados en build time, así que el costo en runtime es solo el
dibujado en canvas (~60 fps sin esfuerzo).

## Licencia

MIT
