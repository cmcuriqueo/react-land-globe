# react-land-globe

[![npm version](https://img.shields.io/npm/v/react-land-globe)](https://www.npmjs.com/package/react-land-globe)
[![license](https://img.shields.io/npm/l/react-land-globe)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](./src/index.d.ts)

An interactive **canvas globe** for React: dotted or outlined continents (5,617 precomputed land points and 125 coastline outlines from Natural Earth), smooth auto-rotation, glowing markers with optional pulse, great-circle connection arcs, canvas labels with collision-aware positioning, HTML tooltips, mouse-wheel zoom, and horizontal drag with mouse & touch.

![react-land-globe](./docs/globe.png)

- **Zero dependencies** — only `react` as a peer dependency
- **No build step** — plain ESM, works out of the box with Vite, Next.js, Astro and CRA
- **SSR-safe** — nothing touches the DOM until `useEffect` (safe for Next.js and Astro islands)
- **Lightweight** — ~46 KB tarball, no map libraries, no WebGL, 60 fps on a plain `<canvas>`
- **TypeScript types included**
- **Performance controls** — cap FPS, pause on hover/off-screen, or render a static frame

## Installation

```bash
npm install react-land-globe
```

## Quick start

```jsx
import LandGlobe from "react-land-globe";

export default function App() {
  return <LandGlobe />;
}
```

With your own markers:

```jsx
<LandGlobe
  markers={[
    { lat: -34.6, lon: -58.38, name: "Buenos Aires" },
    { lat: 40.71, lon: -74.0, name: "New York" },
    { lat: 48.85, lon: 2.35, name: "Paris", color: "59, 130, 246", size: 8 },
  ]}
  autoRotateSpeed={0.002}
  markerColor="227, 25, 55"
/>
```

With labels and a custom tooltip:

```jsx
<LandGlobe
  markers={[{ lat: -34.6, lon: -58.38, name: "Buenos Aires" }]}
  showLabels
  labelPosition="top"
  renderTooltip={(marker) => (
    <div style={{ background: "#111", padding: "6px 10px", borderRadius: 6 }}>
      <strong>{marker.name}</strong>
    </div>
  )}
  onMarkerClick={(marker) => console.log(marker.name)}
/>
```

With great-circle connections between cities:

```jsx
<LandGlobe
  markers={[
    { lat: 40.71, lon: -74.0, name: "New York" },
    { lat: 48.85, lon: 2.35, name: "Paris" },
    { lat: -34.6, lon: -58.38, name: "Buenos Aires" },
  ]}
  connections={[
    { from: { lat: 40.71, lon: -74.0 }, to: { lat: 48.85, lon: 2.35 }, color: "59, 130, 246" },
    { from: { lat: 48.85, lon: 2.35 }, to: { lat: -34.6, lon: -58.38 }, color: "239, 68, 68" },
  ]}
/>
```

## Framework guides

### Next.js (App Router)

It's a client component — add the directive in your file:

```jsx
"use client";

import LandGlobe from "react-land-globe";

export default function Hero() {
  return <LandGlobe />;
}
```

### Astro

Works as a React island. `client:visible` defers hydration until it scrolls into view:

```astro
---
import LandGlobe from "react-land-globe";
---

<LandGlobe client:visible />
```

### Vite / CRA

Nothing special needed — import and render.

## API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `markers` | `GlobeMarker[]` | 9 Latin American cities | Points to draw on the globe |
| `size` | `number` | `520` | Max width of the container in px (the globe is always square) |
| `autoRotateSpeed` | `number` | `0.0026` | Auto-rotation speed in radians per frame. `0` disables it |
| `pauseOnHover` | `boolean` | `false` | Pause auto-rotation while the mouse is over the globe |
| `pauseOnInvisible` | `boolean` | `false` | Pause auto-rotation when the globe is off-screen |
| `static` | `boolean` | `false` | Render a single static frame, no animation loop |
| `targetFPS` | `number` | — | Cap the render loop FPS (e.g. `30`) |
| `dragSpeed` | `number` | `0.005` | Horizontal drag sensitivity |
| `interactive` | `boolean` | `true` | Enable mouse/touch drag. Only rotates horizontally; use `initialRotation` or `onRotationChange` to control the vertical tilt |
| `initialRotation` | `{ x, y }` | `{ x: 0.41, y: -0.9 }` | Initial rotation (the default centers the Americas) |
| `landStyle` | `"dots" \| "outline" \| "dots+outline"` | `"dots"` | Continent rendering style |
| `dotColor` | `string` | `"255, 255, 255"` | Land dot color as an `"r, g, b"` triplet |
| `dotOpacity` | `number` | `0.55` | Max opacity of land dots |
| `outlineColor` | `string` | `"255, 255, 255"` | Coastline outline color as an `"r, g, b"` triplet |
| `outlineOpacity` | `number` | `0.75` | Max opacity of coastline outlines |
| `outlineWidth` | `number` | `1` | Outline stroke width in CSS px |
| `markerColor` | `string` | `"220, 38, 38"` | Marker color as an `"r, g, b"` triplet |
| `markerGlowColor` | `string` | `"239, 68, 68"` | Marker glow color |
| `markerCoreColor` | `string` | `"255, 255, 255"` | Marker center dot color |
| `markerPulse` | `boolean` | `false` | Animated pulse ring around each marker |
| `connections` | `GlobeConnection[]` | `[]` | Great-circle arcs between marker/coordinate pairs |
| `connectionColor` | `string` | `"255, 255, 255"` | Default arc color as an `"r, g, b"` triplet |
| `connectionOpacity` | `number` | `0.6` | Default arc opacity |
| `connectionWidth` | `number` | `1.5` | Default arc stroke width in CSS px |
| `zoom` | `number` | `1` | Initial zoom level |
| `minZoom` | `number` | `0.5` | Minimum zoom level |
| `maxZoom` | `number` | `2.5` | Maximum zoom level |
| `enableZoom` | `boolean` | `true` | Enable zoom with the mouse wheel |
| `onZoomChange` | `(zoom) => void` | — | Called when the user zooms with the mouse wheel |
| `onRotationChange` | `({ x, y }) => void` | — | Called while dragging. Receives normalized rotation in radians |
| `backgroundStops` | `[number, string][]` | grey → black gradient | Radial gradient stops: `[position 0-1, CSS color]` |
| `showAtmosphere` | `boolean` | `true` | Draw the atmosphere halo around the globe |
| `maxPixelRatio` | `number` | — | Cap `devicePixelRatio` to save GPU |
| `showLabels` | `boolean` | `false` | Draw marker names next to each marker |
| `labelPosition` | `"top" \| "right" \| "bottom" \| "left" \| "auto"` | `"top"` | Label position relative to the marker. `"auto"` picks the first non-colliding side. |
| `labelOffset` | `number` | `10` | Distance between marker and label (px) |
| `labelStyle` | `LabelStyle` | — | Font, color, background and padding for canvas labels |
| `labelFormatter` | `(marker) => string` | `m => m.name` | Text shown in the label |
| `renderTooltip` | `(marker) => ReactNode` | — | HTML/React tooltip shown on hover |
| `tooltipDelay` | `number` | `150` | Delay before showing tooltip (ms) |
| `onMarkerClick` | `(marker) => void` | — | Click callback on a marker |
| `onMarkerHover` | `(marker \| null) => void` | — | Hover callback (null on mouse leave) |
| `className` / `style` | — | — | Applied to the wrapper element |

### `GlobeConnection`

```ts
interface GlobeConnection {
  from: { lat: number; lon: number };
  to:   { lat: number; lon: number };
  color?:    string;  // overrides connectionColor
  opacity?:  number;  // overrides connectionOpacity
  width?:    number;  // overrides connectionWidth
}
```

### Imperative ref

The component accepts a ref that exposes read-only and export helpers:

```jsx
import { useRef } from "react";
import LandGlobe from "react-land-globe";

function App() {
  const globeRef = useRef(null);

  return (
    <>
      <LandGlobe ref={globeRef} />
      <button onClick={() => console.log(globeRef.current?.getRotation())}>
        Get rotation
      </button>
      <button onClick={() => {
        const url = globeRef.current?.toDataURL();
        // download or preview the exported image
      }}>
        Export image
      </button>
    </>
  );
}
```

| Method | Signature | Description |
| --- | --- | --- |
| `getRotation` | `() => { x, y }` | Current rotation in radians |
| `toDataURL` | `(type?, quality?) => string \| null` | Export the current canvas as a data URL |

### `GlobeMarker`

```ts
interface GlobeMarker {
  lat: number;        // -90 to 90
  lon: number;        // -180 to 180
  name?: string;      // optional label (informational, not rendered)
  color?: string;     // overrides markerColor for this marker
  glowColor?: string; // overrides markerGlowColor for this marker
  size?: number;      // marker radius in CSS px (default: 6.8)
}
```

> Colors are passed as `"r, g, b"` triplets (not hex) because the component
> combines them with different opacity levels based on each point's depth.

### TypeScript

Types ship with the package — no `@types/*` needed:

```tsx
import LandGlobe, { type GlobeMarker } from "react-land-globe";

const markers: GlobeMarker[] = [{ lat: 0, lon: 0, name: "Null Island" }];
```

### `LabelStyle`

```ts
interface LabelStyle {
  font?: string;              // CSS font shorthand, e.g. "12px sans-serif"
  color?: string;             // "r, g, b" triplet
  backgroundColor?: string;   // "r, g, b" triplet
  padding?: number;           // px
  borderRadius?: number;      // px
}
```

## Common recipes

### Static hero (no animation, no zoom)

```jsx
<LandGlobe autoRotateSpeed={0} enableZoom={false} static />
```

### Pulsing markers with great-circle connections

```jsx
<LandGlobe
  markers={[
    { lat: 40.71, lon: -74.0, name: "New York" },
    { lat: 48.85, lon: 2.35, name: "Paris" },
  ]}
  markerPulse
  connections={[
    { from: { lat: 40.71, lon: -74.0 }, to: { lat: 48.85, lon: 2.35 } },
  ]}
/>
```

### Labels that avoid overlapping

```jsx
<LandGlobe
  markers={[...]}
  showLabels
  labelPosition="auto"
  labelStyle={{ font: "11px sans-serif", color: "255, 255, 255" }}
/>
```

### Cap FPS or pause off-screen

```jsx
<LandGlobe targetFPS={30} pauseOnHover pauseOnInvisible />
```

## Technical notes

### Coordinate system & rotation

- `initialRotation={{ x, y }}` is expressed in **radians**.
  - `x`: vertical tilt. `0` means the equator faces the viewer; positive values tilt the north pole up.
  - `y`: horizontal spin. `0` centers the prime meridian; the default `-0.9` centers the Americas.
- Mouse/touch drag only updates `y`. Use `initialRotation` or listen to `onRotationChange` and feed the value back if you need full tilt control.
- `onRotationChange({ x, y })` fires while dragging with normalized values (`x` clamped to `[-π/2, π/2]` and `y` wrapped to `[0, 2π)`).

### Zoom

- `enableZoom` toggles the mouse-wheel zoom handler.
- `zoom` sets the initial level; `onZoomChange(zoom)` reports changes.
- `minZoom`/`maxZoom` clamp the value.

### Colors

All color props expect `"r, g, b"` strings. The component composites them with per-point opacity based on depth, so hex values are not accepted directly.

### Performance

- `targetFPS` throttles `requestAnimationFrame` to a fixed interval.
- `static` renders a single frame and stops the loop.
- `pauseOnInvisible` uses `IntersectionObserver` to pause rendering when the globe leaves the viewport.
- `maxPixelRatio` caps the canvas backing store size on high-DPI screens.

### SSR & hydration

The canvas element, event listeners, and animation loop are created inside `useEffect`. The server-rendered output is an empty wrapper, so it hydrates cleanly in Next.js and Astro islands.

## How it works

The globe projects ~5,600 precomputed `(lat, lon)` land points and 125 coastline
outline rings onto a 3D sphere with two rotations (`x` tilt and `y` spin),
discards the back hemisphere, and modulates each dot/segment's opacity by its
depth (`z`) to fake volume. Land data is generated at build time from
[Natural Earth](https://www.naturalearthdata.com/) 110m TopoJSON, so runtime
cost is just canvas drawing — no geometry math on the client, no hydration
spike.

Markers and connection arcs are drawn back-to-front by depth, so closer elements
appear on top. Labels are rendered in canvas with a small background pill;
`labelPosition="auto"` computes bounding boxes for the visible labels and picks
the first side (top, right, bottom, left) that does not collide. Tooltips are
plain React DOM nodes positioned absolutely over the wrapper, so you can style
them with CSS or animation libraries.

## Playground

A live playground with controls for every prop ships with the repo:

```bash
git clone <this-repo>
cd react-land-globe
npm install
npm run dev        # → http://localhost:4310
```

![playground](./docs/playground.png)

Sliders for speed/opacity/size, color pickers, and a JSON editor for markers
(with validation and presets). Rebuilds automatically on save.

### Deploy to Cloudflare (Workers static assets)

The playground is a static React SPA. It deploys as a Cloudflare Worker that
serves the built assets:

```bash
npm install
npm run build:playground      # outputs to playground/dist
npm run deploy:playground     # requires `wrangler login`
```

`wrangler.jsonc` at the repo root tells Wrangler to serve `./playground/dist`
with `not_found_handling: single-page-application`, so any unknown route falls
back to `index.html`. No Worker code is required for a pure static deployment.

To preview locally before deploying:

```bash
npm run preview:playground
```

## Tests

```bash
npm test             # unit + component + SSR (Vitest + Testing Library)
npm run test:e2e     # real browser: drag, markers editor (Playwright)
npm run test:package # package validation (publint + arethetypeswrong)
npm run test:all     # everything above
```

| Suite | What it covers |
| --- | --- |
| `test/project.test.js` | Spherical projection math (visible hemisphere, rotations, invariants) |
| `test/component.test.jsx` | Component in jsdom with a mocked 2D context: render loop, colors, `maxPixelRatio`, drag, unmount cleanup |
| `test/ssr.test.jsx` | `renderToString` output + land data validity |
| `test/e2e/run.mjs` | Self-contained Playwright run (build + ephemeral server + Chromium): load, real drag rotation, markers JSON editor |

## Regenerating the land data

Land points and outlines come from `data/land-110m.json` (Natural Earth 110m
TopoJSON). If you swap the dataset or want a different sampling density:

```bash
npm run generate-land-data
```

This rewrites `src/land-dots.js` and `src/land-outlines.js`. The sampling
parameters are adjustable in `scripts/generate-land-data.mjs`.

## Contributing

Issues and PRs are welcome. Please run `npm run test:all` before submitting.

## License

MIT — see [LICENSE](./LICENSE).

Land data: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
