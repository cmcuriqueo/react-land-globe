import React, { useEffect, useRef } from "react";
import landDots from "./land-dots.js";

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

/**
 * Globo interactivo en canvas: continentes punteados, rotación automática,
 * marcadores con glow y arrastre horizontal (mouse + touch).
 *
 * Sin dependencias más allá de React. Seguro para SSR: todo el acceso al DOM
 * ocurre dentro de useEffect / event handlers.
 */
export default function LandGlobe({
  markers = DEFAULT_MARKERS,
  size = 520,
  autoRotateSpeed = 0.0026,
  dragSpeed = 0.005,
  interactive = true,
  initialRotation = { x: 0.41, y: -0.9 },
  dotColor = "255, 255, 255",
  dotOpacity = 0.55,
  markerColor = "220, 38, 38",
  markerGlowColor = "239, 68, 68",
  markerCoreColor = "255, 255, 255",
  backgroundStops = DEFAULT_BACKGROUND,
  showAtmosphere = true,
  maxPixelRatio,
  className,
  style,
}) {
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: initialRotation.x, y: initialRotation.y });

  // Config viva: el loop de render lee siempre los props más recientes sin
  // necesidad de reiniciar el efecto en cada render del padre.
  const config = useRef(null);
  config.current = {
    markers,
    autoRotateSpeed,
    dotColor,
    dotOpacity,
    markerColor,
    markerGlowColor,
    markerCoreColor,
    backgroundStops,
    showAtmosphere,
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
      radius = Math.min(width, height) * 0.42;
    };

    setup();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(setup)
        : null;
    observer?.observe(canvas);

    const project = (lat, lon, rotX, rotY) => {
      const phi = (lat * Math.PI) / 180;
      const theta = (-lon * Math.PI) / 180;

      const x = radius * Math.cos(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi);
      const z = radius * Math.cos(phi) * Math.sin(theta);

      const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
      const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

      const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
      const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

      return { x: centerX + x1, y: centerY - y2, z: z2 };
    };

    let animId;

    const render = () => {
      const cfg = config.current;
      ctx.clearRect(0, 0, width, height);

      if (!isDragging.current) {
        rotation.current.y += cfg.autoRotateSpeed;
      }

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

      // Puntos de tierra
      for (let i = 0; i < landDots.length; i++) {
        const [lat, lon] = landDots[i];
        const p = project(lat, lon, rotation.current.x, rotation.current.y);
        if (p.z > 0) {
          const alpha = Math.pow(p.z / radius, 1.25) * cfg.dotOpacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.95, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cfg.dotColor}, ${alpha})`;
          ctx.fill();
        }
      }

      // Marcadores
      for (const m of cfg.markers) {
        const p = project(m.lat, m.lon, rotation.current.x, rotation.current.y);
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
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Controles de arrastre (mouse + touch): solo rotación horizontal.
  const getX = (e) => e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const getY = (e) => e.clientY ?? e.touches?.[0]?.clientY ?? 0;

  const handleDown = (e) => {
    isDragging.current = true;
    previousMouse.current = { x: getX(e), y: getY(e) };
    if (e.currentTarget) e.currentTarget.style.cursor = "grabbing";
  };

  const handleMove = (e) => {
    if (!isDragging.current) return;
    const clientX = getX(e);
    rotation.current.y += (clientX - previousMouse.current.x) * dragSpeed;
    previousMouse.current = { x: clientX, y: getY(e) };
  };

  const handleUp = (e) => {
    isDragging.current = false;
    if (e?.currentTarget) e.currentTarget.style.cursor = "grab";
  };

  const dragHandlers = interactive
    ? {
        onMouseDown: handleDown,
        onMouseMove: handleMove,
        onMouseUp: handleUp,
        onMouseLeave: handleUp,
        onTouchStart: handleDown,
        onTouchMove: handleMove,
        onTouchEnd: handleUp,
      }
    : {};

  return React.createElement(
    "div",
    {
      className,
      style: {
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
      ...dragHandlers,
    }),
  );
}
