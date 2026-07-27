import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LandGlobe from "../src/index.js";

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

const WORLD_CAPITALS = [
  { lat: 40.71, lon: -74.0, name: "Nueva York" },
  { lat: 51.5, lon: -0.13, name: "Londres" },
  { lat: 48.85, lon: 2.35, name: "París" },
  { lat: 35.68, lon: 139.69, name: "Tokio", color: "59, 130, 246" },
  { lat: -33.87, lon: 151.21, name: "Sídney", color: "59, 130, 246" },
  { lat: 55.76, lon: 37.62, name: "Moscú" },
  { lat: 28.61, lon: 77.21, name: "Nueva Delhi" },
  { lat: 6.52, lon: 3.37, name: "Lagos" },
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const labelStyle = { display: "block", fontSize: 13, opacity: 0.8, marginBottom: 4 };
const valueStyle = { float: "right", opacity: 0.6, fontVariantNumeric: "tabular-nums" };

function Control({ label, value, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label}
        {value !== undefined && <span style={valueStyle}>{value}</span>}
      </label>
      {children}
    </div>
  );
}

function Playground() {
  const [markersText, setMarkersText] = useState(JSON.stringify(DEFAULT_MARKERS, null, 2));
  const [markers, setMarkers] = useState(DEFAULT_MARKERS);
  const [markersError, setMarkersError] = useState(null);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.0026);
  const [dotOpacity, setDotOpacity] = useState(0.55);
  const [size, setSize] = useState(520);
  const [interactive, setInteractive] = useState(true);
  const [dotColor, setDotColor] = useState("#ffffff");
  const [markerColor, setMarkerColor] = useState("#dc2626");
  const [landStyle, setLandStyle] = useState("dots");
  const [outlineOpacity, setOutlineOpacity] = useState(0.75);
  const [fillOpacity, setFillOpacity] = useState(0.15);
  const [showLabels, setShowLabels] = useState(false);
  const [labelPosition, setLabelPosition] = useState("top");
  const [showTooltip, setShowTooltip] = useState(false);

  const applyMarkers = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("debe ser un array");
      for (const m of parsed) {
        if (typeof m.lat !== "number" || typeof m.lon !== "number") {
          throw new Error("cada marcador necesita lat y lon numéricos");
        }
      }
      setMarkers(parsed);
      setMarkersError(null);
    } catch (err) {
      setMarkersError(err.message);
    }
  };

  const loadPreset = (preset) => {
    const text = JSON.stringify(preset, null, 2);
    setMarkersText(text);
    applyMarkers(text);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 340px",
        gap: 32,
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 24px",
        alignItems: "start",
      }}
    >
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 24px" }}>
          react-land-globe <span style={{ opacity: 0.5, fontWeight: 400 }}>playground</span>
        </h1>
        <LandGlobe
          markers={markers}
          autoRotateSpeed={autoRotateSpeed}
          dotOpacity={dotOpacity}
          size={size}
          interactive={interactive}
          dotColor={hexToRgb(dotColor)}
          markerColor={hexToRgb(markerColor)}
          landStyle={landStyle}
          outlineOpacity={outlineOpacity}
          fillOpacity={fillOpacity}
          showLabels={showLabels}
          labelPosition={labelPosition}
          renderTooltip={
            showTooltip
              ? (m) => (
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.85)",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 13,
                      border: "1px solid rgba(255,255,255,0.15)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.name}
                  </div>
                )
              : undefined
          }
          onMarkerClick={(m) => console.log("click:", m.name)}
        />
        <p style={{ textAlign: "center", fontSize: 12, opacity: 0.4 }}>
          Arrastrá el globo para rotarlo
        </p>
      </div>

      <div style={{ background: "#111", borderRadius: 12, padding: 20, fontSize: 14 }}>
        <Control label={`autoRotateSpeed`} value={autoRotateSpeed.toFixed(4)}>
          <input
            type="range" min="0" max="0.01" step="0.0002" value={autoRotateSpeed}
            onChange={(e) => setAutoRotateSpeed(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Control>

        <Control label="dotOpacity" value={dotOpacity.toFixed(2)}>
          <input
            type="range" min="0" max="1" step="0.05" value={dotOpacity}
            onChange={(e) => setDotOpacity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Control>

        <Control label="landStyle" value={landStyle}>
          <select
            value={landStyle}
            onChange={(e) => setLandStyle(e.target.value)}
            style={{ width: "100%", background: "#000", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 8px" }}
          >
            <option value="dots">dots</option>
            <option value="outline">outline</option>
            <option value="dots+outline">dots+outline</option>
            <option value="fill">fill</option>
          </select>
        </Control>

        <Control label="outlineOpacity" value={outlineOpacity.toFixed(2)}>
          <input
            type="range" min="0" max="1" step="0.05" value={outlineOpacity}
            onChange={(e) => setOutlineOpacity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Control>

        <Control label="fillOpacity" value={fillOpacity.toFixed(2)}>
          <input
            type="range" min="0" max="1" step="0.05" value={fillOpacity}
            onChange={(e) => setFillOpacity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Control>

        <Control label="showLabels" value={showLabels ? "on" : "off"}>
          <input
            type="checkbox" checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
        </Control>

        <Control label="labelPosition" value={labelPosition}>
          <select
            value={labelPosition}
            onChange={(e) => setLabelPosition(e.target.value)}
            style={{ width: "100%", background: "#000", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 8px" }}
          >
            <option value="top">top</option>
            <option value="right">right</option>
            <option value="bottom">bottom</option>
            <option value="left">left</option>
          </select>
        </Control>

        <Control label="tooltip" value={showTooltip ? "on" : "off"}>
          <input
            type="checkbox" checked={showTooltip}
            onChange={(e) => setShowTooltip(e.target.checked)}
          />
        </Control>

        <Control label="size" value={`${size}px`}>
          <input
            type="range" min="200" max="800" step="20" value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </Control>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label style={{ fontSize: 13 }}>
            dotColor{" "}
            <input type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>
            markerColor{" "}
            <input type="color" value={markerColor} onChange={(e) => setMarkerColor(e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>
            interactive{" "}
            <input type="checkbox" checked={interactive} onChange={(e) => setInteractive(e.target.checked)} />
          </label>
        </div>

        <Control label="markers (JSON)">
          <textarea
            value={markersText}
            onChange={(e) => setMarkersText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%", height: 220, background: "#000", color: "#ddd",
              border: "1px solid #333", borderRadius: 8, padding: 8,
              fontFamily: "ui-monospace, monospace", fontSize: 11, resize: "vertical",
            }}
          />
        </Control>

        {markersError && (
          <p style={{ color: "#f87171", fontSize: 12, margin: "0 0 12px" }}>
            JSON inválido: {markersError}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => applyMarkers(markersText)} style={btnStyle("#dc2626")}>
            Aplicar
          </button>
          <button onClick={() => loadPreset(DEFAULT_MARKERS)} style={btnStyle("#333")}>
            LatAm
          </button>
          <button onClick={() => loadPreset(WORLD_CAPITALS)} style={btnStyle("#333")}>
            Capitales
          </button>
          <button onClick={() => loadPreset([])} style={btnStyle("#333")}>
            Sin marcadores
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: "8px 14px", fontSize: 13, cursor: "pointer",
});

createRoot(document.getElementById("root")).render(<Playground />);
