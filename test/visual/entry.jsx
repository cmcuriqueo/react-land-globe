import React from "react";
import { createRoot } from "react-dom/client";
import LandGlobe from "../../src/index.js";

createRoot(document.getElementById("root")).render(
  <div style={{ background: "#000", minHeight: "100vh", display: "grid", placeItems: "center", padding: 40 }}>
    <LandGlobe
      markers={[
        { lat: -34.6, lon: -58.38, name: "Buenos Aires" },
        { lat: 40.71, lon: -74.0, name: "Nueva York", color: "59, 130, 246" },
        { lat: 48.85, lon: 2.35, name: "París" },
        { lat: 35.68, lon: 139.69, name: "Tokio", size: 9 },
      ]}
    />
  </div>
);
