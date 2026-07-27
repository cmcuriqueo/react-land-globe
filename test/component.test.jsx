import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import LandGlobe from "../src/index.js";

// jsdom no implementa canvas 2D: se mockea el contexto y se espían las
// llamadas de dibujo. pretendToBeVisual (vitest.config) aporta rAF.
function createMockContext() {
  const fillStyles = [];
  const ctx = {
    fillStyles,
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    shadowBlur: 0,
    shadowColor: "",
  };
  Object.defineProperty(ctx, "fillStyle", {
    set(v) { fillStyles.push(v); },
    get() { return fillStyles[fillStyles.length - 1]; },
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
});
