import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import LandGlobe from "../src/index.js";

// jsdom no implementa canvas 2D: se mockea el contexto y se espían las
// llamadas de dibujo. pretendToBeVisual (vitest.config) aporta rAF.
function createMockContext() {
  const fillStyles = [];
  const strokeStyles = [];
  const ctx = {
    fillStyles,
    strokeStyles,
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text) => ({ width: (text || "").length * 6 })),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    shadowBlur: 0,
    shadowColor: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
  };
  Object.defineProperty(ctx, "fillStyle", {
    set(v) { fillStyles.push(v); },
    get() { return fillStyles[fillStyles.length - 1]; },
  });
  Object.defineProperty(ctx, "strokeStyle", {
    set(v) { strokeStyles.push(v); },
    get() { return strokeStyles[strokeStyles.length - 1]; },
  });
  return ctx;
}

let ctx;

beforeEach(() => {
  ctx = createMockContext();
  vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(ctx);
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 500,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 500,
  });
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,test");
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: 500,
    height: 500,
    right: 500,
    bottom: 500,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const waitFrames = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe("<LandGlobe /> (jsdom + canvas mockeado)", () => {
  it("renderiza el contenedor cuadrado y el canvas", () => {
    const { container } = render(<LandGlobe size={320} />);
    const wrapper = container.firstChild;
    expect(wrapper.style.maxWidth).toBe("320px");
    expect(wrapper.style.aspectRatio).toBe("1 / 1");
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("aplica className y style al contenedor", () => {
    const { container } = render(
      <LandGlobe className="test-globe" style={{ border: "1px solid red" }} />,
    );
    const wrapper = container.querySelector(".test-globe");
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.border).toBe("1px solid red");
  });

  it("arranca el loop de render y dibuja miles de puntos por frame", async () => {
    render(<LandGlobe />);
    await waitFrames();
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    // 2 círculos de fondo + ~2800 puntos de tierra visibles + 9 marcadores × 2
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(1000);
  });

  it("usa dotColor y markerColor en los fillStyle", async () => {
    render(<LandGlobe dotColor="10, 20, 30" markerColor="200, 100, 50" />);
    await waitFrames();
    // fillStyles también recibe los gradientes (objetos); filtrar strings.
    const strings = ctx.fillStyles.filter((s) => typeof s === "string");
    expect(strings.some((s) => s.includes("rgba(10, 20, 30,"))).toBe(true);
    expect(strings.some((s) => s.includes("rgba(200, 100, 50,"))).toBe(true);
  });

  it("no dibuja atmósfera con showAtmosphere={false}", async () => {
    render(<LandGlobe showAtmosphere={false} />);
    await waitFrames();
    // Sin atmósfera solo queda el gradiente de fondo: 1 por frame
    const frames = ctx.clearRect.mock.calls.length;
    expect(ctx.createRadialGradient.mock.calls.length).toBe(frames);
  });

  it("limita el pixelRatio con maxPixelRatio", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      get: () => 4,
    });
    const { container } = render(<LandGlobe maxPixelRatio={2} />);
    const canvas = container.querySelector("canvas");
    expect(canvas.width).toBe(1000); // 500 × 2 (no 500 × 4)
    delete window.devicePixelRatio;
  });

  it("el drag cambia el cursor a grabbing y vuelve a grab", async () => {
    const { container } = render(<LandGlobe />);
    const canvas = container.querySelector("canvas");
    expect(canvas.style.cursor).toBe("grab");

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    expect(canvas.style.cursor).toBe("grabbing");

    fireEvent.mouseMove(canvas, { clientX: 180, clientY: 100 });
    await waitFrames();

    fireEvent.mouseUp(canvas);
    expect(canvas.style.cursor).toBe("grab");
  });

  it("con interactive={false} no hay drag y el cursor es default", () => {
    const { container } = render(<LandGlobe interactive={false} />);
    const canvas = container.querySelector("canvas");
    expect(canvas.style.cursor).toBe("default");
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    expect(canvas.style.cursor).toBe("default");
  });

  it("al desmontar se cancela el loop (no dibuja más)", async () => {
    const { unmount } = render(<LandGlobe />);
    await waitFrames();
    unmount();
    const calls = ctx.clearRect.mock.calls.length;
    await waitFrames();
    expect(ctx.clearRect.mock.calls.length).toBe(calls);
  });

  it("cambiar markers en runtime no reinicia el loop ni rompe el render", async () => {
    const { rerender } = render(<LandGlobe markers={[]} />);
    await waitFrames();
    const clearCalls = ctx.clearRect.mock.calls.length;

    rerender(<LandGlobe markers={[{ lat: 0, lon: -45, name: "Test" }]} />);
    await waitFrames();
    // El loop siguió corriendo (más frames) y dibujó el nuevo marcador con glow
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(clearCalls);
    expect(ctx.save).toHaveBeenCalled();
  });

  it("con landStyle='outline' dibuja líneas en vez de puntos de tierra", async () => {
    render(<LandGlobe landStyle="outline" />);
    await waitFrames();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Los puntos de tierra usan arcos de 0.95px; con outline no deberían pintarse.
    const dotArcs = ctx.arc.mock.calls.filter((c) => c[2] === 0.95);
    expect(dotArcs.length).toBe(0);
  });

  it("con landStyle='dots+outline' dibuja tanto puntos como líneas", async () => {
    render(<LandGlobe landStyle="dots+outline" />);
    await waitFrames();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    const dotArcs = ctx.arc.mock.calls.filter((c) => c[2] === 0.95);
    expect(dotArcs.length).toBeGreaterThan(0);
  });

  it("usa outlineColor en los strokeStyle cuando landStyle='outline'", async () => {
    render(<LandGlobe landStyle="outline" outlineColor="100, 150, 200" />);
    await waitFrames();
    expect(ctx.strokeStyles.some((s) => s.includes("rgba(100, 150, 200,"))).toBe(true);
  });

  it("dibuja labels en canvas cuando showLabels=true", async () => {
    render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        showLabels
      />,
    );
    await waitFrames();
    expect(ctx.fillText).toHaveBeenCalledWith("Test", expect.any(Number), expect.any(Number));
  });

  it("muestra tooltip al hacer hover sobre un marcador", async () => {
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        renderTooltip={(m) => <span data-testid="tooltip">{m.name}</span>}
        tooltipDelay={50}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 250 });
    await waitFrames(120);

    expect(container.querySelector('[data-testid="tooltip"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="tooltip"]').textContent).toBe("Test");
  });

  it("llama onMarkerClick al hacer click en un marcador", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        onMarkerClick={onClick}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.click(canvas, { clientX: 250, clientY: 250 });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ name: "Test" }));
  });


  it("el arrastre vertical no cambia la inclinación (solo horizontal)", async () => {
    const ref = React.createRef();
    const { container } = render(<LandGlobe ref={ref} initialRotation={{ x: 0.41, y: 0 }} />);
    const canvas = container.querySelector("canvas");
    await waitFrames();

    const before = ref.current.getRotation();
    fireEvent.mouseDown(canvas, { clientX: 250, clientY: 250 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 150 });
    await waitFrames();
    fireEvent.mouseUp(canvas);
    const after = ref.current.getRotation();

    expect(after.x).toBe(before.x);
  });

  it("llama onRotationChange durante el arrastre con ángulos normalizados", async () => {
    const onRotationChange = vi.fn();
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: 0 }}
        onRotationChange={onRotationChange}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.mouseDown(canvas, { clientX: 250, clientY: 250 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 350 });
    await waitFrames();
    fireEvent.mouseUp(canvas);

    expect(onRotationChange).toHaveBeenCalled();
    const rotation = onRotationChange.mock.calls[0][0];
    expect(rotation.x).toBe(0);
    expect(rotation.y).toBeGreaterThan(0);
    expect(rotation.y).toBeLessThan(Math.PI * 2);
  });

  it("llama onZoomChange al hacer zoom con la rueda", async () => {
    const onZoomChange = vi.fn();
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        onZoomChange={onZoomChange}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(onZoomChange).toHaveBeenCalled();
    expect(onZoomChange.mock.calls[0][0]).toBeGreaterThan(1);
  });

  it("no hace zoom cuando enableZoom=false", async () => {
    const onZoomChange = vi.fn();
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        onZoomChange={onZoomChange}
        enableZoom={false}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it("dibuja anillos de pulso cuando markerPulse=true", async () => {
    const { rerender } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        landStyle="dots"
      />,
    );
    await waitFrames();
    const strokesWithoutPulse = ctx.stroke.mock.calls.length;

    rerender(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        landStyle="dots"
        markerPulse
      />,
    );
    await waitFrames();
    const strokesWithPulse = ctx.stroke.mock.calls.length;

    expect(strokesWithPulse).toBeGreaterThan(strokesWithoutPulse);
  });

  it("dibuja arcos entre marcadores cuando se pasan connections", async () => {
    render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        connections={[
          { from: { lat: 0, lon: 0 }, to: { lat: 30, lon: 30 }, color: "59, 130, 246" },
        ]}
      />,
    );
    await waitFrames();

    expect(ctx.strokeStyles.some((s) => typeof s === "string" && s.includes("rgba(59, 130, 246,"))).toBe(true);
  });

  it("pausa la rotación automática con pauseOnHover", async () => {
    const ref = React.createRef();
    const { container } = render(
      <LandGlobe
        ref={ref}
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: 0 }}
        autoRotateSpeed={0.05}
        pauseOnHover
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames(120);
    const before = ref.current.getRotation();

    fireEvent.mouseEnter(canvas);
    await waitFrames(120);
    const after = ref.current.getRotation();

    expect(Math.abs(after.y - before.y)).toBeLessThan(0.01);
  });

  it("con static={true} no anima más frames después del render inicial", async () => {
    render(<LandGlobe static markers={[{ lat: 0, lon: 0, name: "Test" }]} />);
    await waitFrames(120);
    const frames = ctx.clearRect.mock.calls.length;
    await waitFrames(120);
    expect(ctx.clearRect.mock.calls.length).toBe(frames);
  });

  it("retoma la animación al desactivar static", async () => {
    const { rerender } = render(
      <LandGlobe static markers={[{ lat: 0, lon: 0, name: "Test" }]} autoRotateSpeed={0.05} />,
    );
    await waitFrames(120);
    const frames = ctx.clearRect.mock.calls.length;

    rerender(<LandGlobe markers={[{ lat: 0, lon: 0, name: "Test" }]} autoRotateSpeed={0.05} />);
    await waitFrames(120);
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(frames);
  });

  it("expone toDataURL para exportar la imagen del canvas", async () => {
    const ref = React.createRef();
    render(<LandGlobe ref={ref} markers={[{ lat: 0, lon: 0, name: "Test" }]} />);
    await waitFrames();

    const dataUrl = ref.current.toDataURL();
    expect(typeof dataUrl).toBe("string");
    expect(dataUrl.startsWith("data:")).toBe(true);
  });

  it("llama onMarkerHover al entrar y salir de un marcador", async () => {
    const onHover = vi.fn();
    const { container } = render(
      <LandGlobe
        markers={[{ lat: 0, lon: 0, name: "Test" }]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        onMarkerHover={onHover}
      />,
    );
    const canvas = container.querySelector("canvas");
    await waitFrames();

    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 250 });
    expect(onHover).toHaveBeenCalledWith(expect.objectContaining({ name: "Test" }));

    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("oculta labels que colisionan para evitar solapamientos", async () => {
    render(
      <LandGlobe
        markers={[
          { lat: 0, lon: 0, name: "A" },
          { lat: 0, lon: 1, name: "B" },
        ]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        showLabels
      />,
    );
    await waitFrames();

    const drawnTexts = new Set(ctx.fillText.mock.calls.map((c) => c[0]));
    expect(drawnTexts.has("A") || drawnTexts.has("B")).toBe(true);
    expect(drawnTexts.has("A") && drawnTexts.has("B")).toBe(false);
  });

  it("con labelPosition='auto' elige lados alternativos para evitar colisiones", async () => {
    render(
      <LandGlobe
        markers={[
          { lat: 0, lon: 0, name: "A" },
          { lat: 0, lon: 1, name: "B" },
        ]}
        initialRotation={{ x: 0, y: Math.PI / 2 }}
        showLabels
        labelPosition="auto"
      />,
    );
    await waitFrames();

    const drawnTexts = new Set(ctx.fillText.mock.calls.map((c) => c[0]));
    expect(drawnTexts.has("A")).toBe(true);
    expect(drawnTexts.has("B")).toBe(true);
  });

});
