import React, { useEffect, useRef, useState } from "react";
import landDots from "./land-dots.js";
import landOutlines from "./land-outlines.js";
import { project } from "./project.js";

// Marcadores por defecto: principales ciudades de Latinoamérica.
const DEFAULT_MARKERS = [
  { lat: 19.43, lon: -99.13, name: "CDMX" },
  { lat: 9.93, lon: -84.09, name: "San José" },
  { lat: 4.71, lon: -74.07, name: "Bogotá" },
  { lat: -12.05, lon: -77.04, name: "Lima" },
  { lat: -15.79, lon: -47.88, name: "Brasilia" },
  { lat: -23.55, lon: -46.63, name: "São Paulo" },
  { lat: -34.6, lon: -58.38, name: "Buenos Aires" },
  { lat: -33.45, lon: -70.67, name: "Santiago" },
  { lat: -43.3, lon: -65.11, name: "Ushuaia" },
];

const DEFAULT_BACKGROUND = [
  [0, "#1c1c1c"],
  [0.85, "#0a0a0a"],
  [1, "#000000"],
];

const DEFAULT_LABEL_STYLE = {
  fontSize: 12,
  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontWeight: "500",
  color: "255, 255, 255",
  backgroundColor: "0, 0, 0",
  padding: { x: 6, y: 2 },
  borderRadius: 4,
};

/**
 * Dibuja un rectángulo con esquinas redondeadas en el canvas.
 * Fallback manual para entornos sin ctx.roundRect nativo.
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Detecta solapamiento entre dos bounding boxes alineados a los ejes (AABB).
 */
function boxesOverlap(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

/**
 * Globo interactivo en canvas: continentes punteados o contornos, rotación
 * automática, marcadores con glow, labels, tooltips y arrastre horizontal.
 *
 * Sin dependencias más allá de React. Seguro para SSR: todo el acceso al DOM
 * ocurre dentro de useEffect / event handlers.
 */
export default function LandGlobe({
  markers = DEFAULT_MARKERS,
  size = 520,
  autoRotateSpeed = 0.0026,
  dragSpeed = 0.005,
  verticalDragSpeed = 0.005,
  interactive = true,
  initialRotation = { x: 0.41, y: -0.9 },
  landStyle = "dots",
  dotColor = "255, 255, 255",
  dotOpacity = 0.55,
  outlineColor = "255, 255, 255",
  outlineOpacity = 0.75,
  outlineWidth = 1,
  fillColor = "255, 255, 255",
  fillOpacity = 0.15,
  markerColor = "220, 38, 38",
  markerGlowColor = "239, 68, 68",
  markerCoreColor = "255, 255, 255",
  markerPulse = false,
  zoom = 1,
  minZoom = 0.5,
  maxZoom = 2.5,
  onZoomChange,
  onRotationChange,
  backgroundStops = DEFAULT_BACKGROUND,
  showAtmosphere = true,
  maxPixelRatio,
  showLabels = false,
  labelPosition = "top",
  labelOffset = 10,
  labelStyle = DEFAULT_LABEL_STYLE,
  labelFormatter = (m) => m.name ?? "",
  renderTooltip,
  tooltipDelay = 150,
  onMarkerClick,
  onMarkerHover,
  className,
  style,
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: initialRotation.x, y: initialRotation.y });
  const zoomRef = useRef(zoom);
  const hoveredHit = useRef(null);
  const tooltipTimer = useRef(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Config viva: el loop de render lee siempre los props más recientes sin
  // necesidad de reiniciar el efecto en cada render del padre.
  const config = useRef(null);
  config.current = {
    markers,
    autoRotateSpeed,
    verticalDragSpeed,
    landStyle,
    dotColor,
    dotOpacity,
    outlineColor,
    outlineOpacity,
    outlineWidth,
    fillColor,
    fillOpacity,
    markerColor,
    markerGlowColor,
    markerCoreColor,
    markerPulse,
    zoom,
    minZoom,
    maxZoom,
    onZoomChange,
    onRotationChange,
    backgroundStops,
    showAtmosphere,
    showLabels,
    labelPosition,
    labelOffset,
    labelStyle,
    labelFormatter,
    renderTooltip,
    tooltipDelay,
    onMarkerClick,
    onMarkerHover,
    interactive,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let radius = 0;

    const updateRadius = () => {
      radius = Math.min(width, height) * 0.42 * zoomRef.current;
    };

    const setup = () => {
      const dprRaw = window.devicePixelRatio || 1;
      const dpr = maxPixelRatio ? Math.min(dprRaw, maxPixelRatio) : dprRaw;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      centerY = height / 2;
      updateRadius();
    };

    setup();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(setup)
        : null;
    observer?.observe(canvas);

    const projectAt = (lat, lon, rotX, rotY) =>
      project(lat, lon, rotX, rotY, radius, centerX, centerY);

    let animId;

    const drawOutlines = (rotX, rotY) => {
      const cfg = config.current;
      ctx.lineWidth = cfg.outlineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const ring of landOutlines) {
        let prev = null;

        for (let i = 0; i < ring.length; i++) {
          const [lat, lon] = ring[i];
          const p = projectAt(lat, lon, rotX, rotY);

          if (prev && prev.z > 0 && p.z > 0) {
            const depth = (prev.z + p.z) / 2 / radius;
            const alpha = Math.pow(Math.max(0, depth), 1.25) * cfg.outlineOpacity;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${cfg.outlineColor}, ${alpha})`;
            ctx.stroke();
          }

          prev = p;
        }
      }
    };

    const computeLabelLayout = (m, p, depth, position) => {
      const cfg = config.current;
      const ls = cfg.labelStyle;
      const fontSize = ls.fontSize ?? DEFAULT_LABEL_STYLE.fontSize;
      const fontFamily = ls.fontFamily ?? DEFAULT_LABEL_STYLE.fontFamily;
      const fontWeight = ls.fontWeight ?? DEFAULT_LABEL_STYLE.fontWeight;
      const text = cfg.labelFormatter(m);
      if (!text) return null;

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text);
      const pad = ls.padding ?? DEFAULT_LABEL_STYLE.padding;
      const padX = typeof pad === "number" ? pad : (pad.x ?? 6);
      const padY = typeof pad === "number" ? pad : (pad.y ?? 2);
      const bgW = metrics.width + padX * 2;
      const bgH = fontSize + padY * 2;
      const r = ls.borderRadius ?? DEFAULT_LABEL_STYLE.borderRadius;
      const offset = cfg.labelOffset + (m.size ?? 6.8);

      let lx = p.x;
      let ly = p.y;
      switch (position) {
        case "top":
          ly -= offset + bgH / 2;
          break;
        case "bottom":
          ly += offset + bgH / 2;
          break;
        case "left":
          lx -= offset + bgW / 2;
          break;
        case "right":
          lx += offset + bgW / 2;
          break;
        default:
          ly -= offset + bgH / 2;
      }

      return { text, lx, ly, bgW, bgH, r };
    };

    const drawFill = (rotX, rotY) => {
      const cfg = config.current;
      ctx.fillStyle = `rgba(${cfg.fillColor}, ${cfg.fillOpacity})`;

      const normAngle = (a) => {
        while (a < 0) a += 2 * Math.PI;
        while (a >= 2 * Math.PI) a -= 2 * Math.PI;
        return a;
      };

      const pointInPolygon = (px, py, poly) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].x;
          const yi = poly[i].y;
          const xj = poly[j].x;
          const yj = poly[j].y;
          const intersect =
            (yi > py) !== (yj > py) &&
            px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      };

      const arcPolygon = (startAngle, endAngle, counterClockwise, steps) => {
        const poly = [];
        let s = normAngle(startAngle);
        let e = normAngle(endAngle);
        if (counterClockwise) {
          if (e <= s) e += 2 * Math.PI;
        } else {
          if (e >= s) e -= 2 * Math.PI;
        }
        for (let i = 0; i <= steps; i++) {
          const t = s + (e - s) * (i / steps);
          poly.push({
            x: centerX + radius * Math.cos(t),
            y: centerY + radius * Math.sin(t),
          });
        }
        return poly;
      };

      for (const ring of landOutlines) {
        const n = ring.length - 1; // ignorar punto final duplicado
        if (n < 3) continue;

        const segments = [];
        let current = null;

        const addPoint = (p, isCut) => {
          if (!current) {
            current = { points: [{ x: p.x, y: p.y, cut: isCut }] };
          } else {
            current.points.push({ x: p.x, y: p.y, cut: isCut });
          }
        };

        const closeSegment = () => {
          if (current) {
            segments.push(current);
            current = null;
          }
        };

        for (let i = 0; i < n; i++) {
          const [lat1, lon1] = ring[i];
          const [lat2, lon2] = ring[(i + 1) % n];
          const p1 = projectAt(lat1, lon1, rotX, rotY);
          const p2 = projectAt(lat2, lon2, rotX, rotY);

          const v1 = p1.z > 0;
          const v2 = p2.z > 0;

          if (v1 && v2) {
            addPoint(p2, false);
          } else if (v1 && !v2) {
            const t = p1.z / (p1.z - p2.z);
            addPoint({
              x: p1.x + (p2.x - p1.x) * t,
              y: p1.y + (p2.y - p1.y) * t,
            }, true);
            closeSegment();
          } else if (!v1 && v2) {
            const t = p1.z / (p1.z - p2.z);
            addPoint({
              x: p1.x + (p2.x - p1.x) * t,
              y: p1.y + (p2.y - p1.y) * t,
            }, true);
            addPoint(p2, false);
          }
        }

        closeSegment();

        // Si el inicio del ring cae en medio de un arco visible, el primer y
        // último segmento son partes del mismo arco: los unimos.
        if (segments.length > 1) {
          const first = segments[0];
          const last = segments[segments.length - 1];
          if (!first.points[0].cut && !last.points[last.points.length - 1].cut) {
            last.points.push(...first.points);
            segments.shift();
          }
        }

        for (const seg of segments) {
          const pts = seg.points;
          if (pts.length < 3) continue;

          const first = pts[0];
          const last = pts[pts.length - 1];
          const needsArc = first.cut && last.cut;

          ctx.beginPath();
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }

          if (needsArc) {
            const startAngle = Math.atan2(last.y - centerY, last.x - centerX);
            const endAngle = Math.atan2(first.y - centerY, first.x - centerX);

            // Elegimos el arco probando cuál forma un polígono que contiene
            // a un punto interior del cap visible. Tomamos el punto visible
            // más alejado del centro (cerca del borde) y lo movemos un poco
            // hacia adentro, así solo el arco correcto lo contiene.
            let interior = null;
            let maxDist = -Infinity;
            for (const pt of pts) {
              if (!pt.cut) {
                const dx = pt.x - centerX;
                const dy = pt.y - centerY;
                const dist = dx * dx + dy * dy;
                if (dist > maxDist) {
                  maxDist = dist;
                  interior = pt;
                }
              }
            }

            let useCcw;
            if (interior) {
              const testPoint = {
                x: interior.x * 0.92 + centerX * 0.08,
                y: interior.y * 0.92 + centerY * 0.08,
              };
              const ccwPoly = [...pts, ...arcPolygon(startAngle, endAngle, true, 12)];
              const cwPoly = [...pts, ...arcPolygon(startAngle, endAngle, false, 12)];
              const inCcw = pointInPolygon(testPoint.x, testPoint.y, ccwPoly);
              const inCw = pointInPolygon(testPoint.x, testPoint.y, cwPoly);
              if (inCcw && !inCw) {
                useCcw = true;
              } else if (!inCcw && inCw) {
                useCcw = false;
              } else {
                const s = normAngle(startAngle);
                const e = normAngle(endAngle);
                useCcw = (e - s + 2 * Math.PI) % (2 * Math.PI) <= Math.PI;
              }
            } else {
              const s = normAngle(startAngle);
              const e = normAngle(endAngle);
              useCcw = (e - s + 2 * Math.PI) % (2 * Math.PI) <= Math.PI;
            }

            ctx.arc(centerX, centerY, radius, startAngle, endAngle, useCcw);
          }

          ctx.closePath();
          ctx.fill();
        }
      }
    };

    const drawLabel = (m, p, depth, position) => {
      const layout = computeLabelLayout(m, p, depth, position);
      if (!layout) return;

      const { text, lx, ly, bgW, bgH, r } = layout;
      const cfg = config.current;
      const ls = cfg.labelStyle;

      roundRect(ctx, lx - bgW / 2, ly - bgH / 2, bgW, bgH, r);
      ctx.fillStyle = `rgba(${ls.backgroundColor}, ${depth * 0.85})`;
      ctx.fill();

      ctx.fillStyle = `rgba(${ls.color}, ${depth})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, lx, ly + 0.5);
    };

    const updateTooltipPosition = () => {
      const el = tooltipRef.current;
      if (!el) return;

      const hit = hoveredHit.current;
      if (!hit) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }

      const p = projectAt(
        hit.marker.lat,
        hit.marker.lon,
        rotation.current.x,
        rotation.current.y,
      );

      if (p.z <= -radius * 0.12) {
        el.style.opacity = "0";
        return;
      }

      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -120%)`;
      el.style.opacity = tooltipVisible ? "1" : "0";
      el.style.pointerEvents = "none";
    };

    const findHoveredMarker = (clientX, clientY) => {
      const cfg = config.current;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      let best = null;
      let bestDist = Infinity;

      for (const m of cfg.markers) {
        const p = projectAt(m.lat, m.lon, rotation.current.x, rotation.current.y);
        if (p.z > -radius * 0.12) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = Math.max(m.size ?? 6.8, 10);
          if (dist < hitRadius && dist < bestDist) {
            bestDist = dist;
            best = { marker: m, projected: p };
          }
        }
      }

      return best;
    };

    const setHovered = (hit) => {
      const cfg = config.current;
      const prev = hoveredHit.current?.marker ?? null;
      const next = hit?.marker ?? null;
      if (prev === next) return;

      hoveredHit.current = hit;
      setHoveredMarker(next);
      if (cfg.onMarkerHover) cfg.onMarkerHover(next);

      clearTimeout(tooltipTimer.current);
      if (next && cfg.renderTooltip) {
        tooltipTimer.current = setTimeout(() => setTooltipVisible(true), cfg.tooltipDelay);
      } else {
        setTooltipVisible(false);
      }
    };

    const getMousePoint = (e) => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      return { clientX, clientY };
    };

    const handleMouseDown = (e) => {
      if (!config.current.interactive) return;
      isDragging.current = true;
      previousMouse.current = getMousePoint(e);
      canvas.style.cursor = "grabbing";
    };

    const normalizeRotation = (rot) => {
      const twoPi = Math.PI * 2;
      return {
        x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rot.x)),
        y: ((rot.y % twoPi) + twoPi) % twoPi,
      };
    };

    const handleMouseMove = (e) => {
      const cfg = config.current;
      const { clientX, clientY } = getMousePoint(e);

      if (isDragging.current && cfg.interactive) {
        rotation.current.y += (clientX - previousMouse.current.clientX) * dragSpeed;
        rotation.current.x += (clientY - previousMouse.current.clientY) * cfg.verticalDragSpeed;
        rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));
        if (cfg.onRotationChange) {
          cfg.onRotationChange(normalizeRotation(rotation.current));
        }
        previousMouse.current = { clientX, clientY };
        return;
      }

      const hasHoverFeatures = cfg.renderTooltip || cfg.onMarkerHover || cfg.onMarkerClick;
      if (!hasHoverFeatures) return;

      const hit = findHoveredMarker(clientX, clientY);
      setHovered(hit);
      canvas.style.cursor = hit ? "pointer" : (cfg.interactive ? "grab" : "default");
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = config.current.interactive ? "grab" : "default";
    };

    const handleMouseLeave = () => {
      isDragging.current = false;
      setHovered(null);
      canvas.style.cursor = config.current.interactive ? "grab" : "default";
    };

    const handleClick = (e) => {
      const cfg = config.current;
      if (!cfg.onMarkerClick) return;
      const { clientX, clientY } = getMousePoint(e);
      const hit = findHoveredMarker(clientX, clientY);
      if (hit) cfg.onMarkerClick(hit.marker);
    };

    const handleWheel = (e) => {
      const cfg = config.current;
      if (!cfg.interactive) return;
      e.preventDefault();
      const zoomSpeed = 0.001;
      const newZoom = Math.min(
        cfg.maxZoom,
        Math.max(cfg.minZoom, zoomRef.current - e.deltaY * zoomSpeed),
      );
      zoomRef.current = newZoom;
      if (cfg.onZoomChange) cfg.onZoomChange(newZoom);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleMouseDown, { passive: true });
    canvas.addEventListener("touchmove", handleMouseMove, { passive: true });
    canvas.addEventListener("touchend", handleMouseUp);

    const render = () => {
      const cfg = config.current;
      ctx.clearRect(0, 0, width, height);

      if (!isDragging.current) {
        rotation.current.y += cfg.autoRotateSpeed;
      }

      updateRadius();

      const pulsePhase = cfg.markerPulse ? (Date.now() / 1500) % 1 : 0;

      // Atmósfera
      if (cfg.showAtmosphere) {
        const atm = ctx.createRadialGradient(
          centerX, centerY, radius * 0.72,
          centerX, centerY, radius * 1.12,
        );
        atm.addColorStop(0, "rgba(0,0,0,0)");
        atm.addColorStop(0.65, "rgba(90,90,110,0.06)");
        atm.addColorStop(1, "rgba(140,140,160,0.22)");
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.12, 0, Math.PI * 2);
        ctx.fillStyle = atm;
        ctx.fill();
      }

      // Fondo
      const bg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      for (const [stop, color] of cfg.backgroundStops) {
        bg.addColorStop(stop, color);
      }
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();

      // Relleno de continentes
      if (cfg.landStyle === "fill") {
        drawFill(rotation.current.x, rotation.current.y);
      }

      // Puntos de tierra
      if (cfg.landStyle === "dots" || cfg.landStyle === "dots+outline") {
        for (let i = 0; i < landDots.length; i++) {
          const [lat, lon] = landDots[i];
          const p = projectAt(lat, lon, rotation.current.x, rotation.current.y);
          if (p.z > 0) {
            const alpha = Math.pow(p.z / radius, 1.25) * cfg.dotOpacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.95, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${cfg.dotColor}, ${alpha})`;
            ctx.fill();
          }
        }
      }

      // Contornos de tierra
      if (cfg.landStyle === "outline" || cfg.landStyle === "dots+outline") {
        drawOutlines(rotation.current.x, rotation.current.y);
      }

      // Marcadores
      const visibleMarkers = [];
      for (const m of cfg.markers) {
        const p = projectAt(m.lat, m.lon, rotation.current.x, rotation.current.y);
        if (p.z > -radius * 0.12) {
          const depth = Math.min(1, Math.max(0.25, (p.z + radius * 0.22) / radius));
          const color = m.color ?? cfg.markerColor;
          const glow = m.glowColor ?? cfg.markerGlowColor;
          const markerSize = m.size ?? 6.8;

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, markerSize, 0, Math.PI * 2);
          ctx.shadowColor = `rgba(${glow}, 1)`;
          ctx.shadowBlur = 18;
          ctx.fillStyle = `rgba(${color}, ${depth * 0.95})`;
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.85, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cfg.markerCoreColor}, ${depth})`;
          ctx.fill();

          if (cfg.markerPulse) {
            const pulseRadius = markerSize + pulsePhase * 16;
            const pulseAlpha = (1 - pulsePhase) * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${glow}, ${pulseAlpha * depth})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          if (cfg.showLabels) {
            visibleMarkers.push({ m, p, depth });
          }
        }
      }

      // Labels con anti-colisión AABB: los marcadores más al frente ganan.
      if (visibleMarkers.length > 0) {
        visibleMarkers.sort((a, b) => b.depth - a.depth);

        const acceptedBoxes = [];
        const positions =
          cfg.labelPosition === "auto"
            ? ["top", "right", "bottom", "left"]
            : [cfg.labelPosition];

        for (const { m, p, depth } of visibleMarkers) {
          let chosen = null;

          for (const pos of positions) {
            const layout = computeLabelLayout(m, p, depth, pos);
            if (!layout) continue;

            const box = {
              left: layout.lx - layout.bgW / 2,
              right: layout.lx + layout.bgW / 2,
              top: layout.ly - layout.bgH / 2,
              bottom: layout.ly + layout.bgH / 2,
            };

            const collides = acceptedBoxes.some((b) => boxesOverlap(box, b));
            if (!collides) {
              chosen = { layout, position: pos, box };
              break;
            }
          }

          if (chosen) {
            drawLabel(m, p, depth, chosen.position);
            acceptedBoxes.push(chosen.box);
          }
        }
      }

      updateTooltipPosition();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      observer?.disconnect();
      clearTimeout(tooltipTimer.current);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleMouseDown);
      canvas.removeEventListener("touchmove", handleMouseMove);
      canvas.removeEventListener("touchend", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement(
    "div",
    {
      ref: wrapperRef,
      className,
      style: {
        position: style?.position ?? "relative",
        width: "100%",
        maxWidth: size,
        aspectRatio: "1 / 1",
        margin: "0 auto",
        ...style,
      },
    },
    React.createElement("canvas", {
      ref: canvasRef,
      style: {
        width: "100%",
        height: "100%",
        display: "block",
        cursor: interactive ? "grab" : "default",
        userSelect: "none",
        touchAction: "none",
      },
    }),
    renderTooltip && hoveredMarker
      ? React.createElement(
          "div",
          {
            ref: tooltipRef,
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              opacity: 0,
              transform: "translate(0, 0)",
              transition: "opacity 150ms ease",
              pointerEvents: "none",
              zIndex: 10,
            },
          },
          renderTooltip(hoveredMarker),
        )
      : null,
  );
}
