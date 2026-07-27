import * as React from "react";

export interface GlobeMarker {
  /** Latitud en grados (-90 a 90). */
  lat: number;
  /** Longitud en grados (-180 a 180). */
  lon: number;
  /** Etiqueta opcional (informativa, no se dibuja). */
  name?: string;
  /** Color del marcador como triplete RGB "r, g, b". Pisa `markerColor`. */
  color?: string;
  /** Color del glow como triplete RGB "r, g, b". Pisa `markerGlowColor`. */
  glowColor?: string;
  /** Radio del marcador en px CSS. Default: 6.8. */
  size?: number;
}

export interface LandGlobeProps {
  /** Puntos a marcar en el globo. Default: 9 ciudades de Latinoamérica. */
  markers?: GlobeMarker[];
  /** Ancho máximo del contenedor en px (siempre cuadrado). Default: 520. */
  size?: number;
  /** Velocidad de rotación automática en radianes por frame. Default: 0.0026. */
  autoRotateSpeed?: number;
  /** Sensibilidad del arrastre. Default: 0.005. */
  dragSpeed?: number;
  /** Habilita arrastre con mouse/touch. Default: true. */
  interactive?: boolean;
  /** Rotación inicial. Default: { x: 0.41, y: -0.9 } (centrado en América). */
  initialRotation?: { x: number; y: number };
  /** Color de los puntos de tierra, triplete RGB "r, g, b". Default: "255, 255, 255". */
  dotColor?: string;
  /** Opacidad máxima de los puntos de tierra (0 a 1). Default: 0.55. */
  dotOpacity?: number;
  /** Color de los marcadores, triplete RGB. Default: "220, 38, 38". */
  markerColor?: string;
  /** Color del glow de los marcadores, triplete RGB. Default: "239, 68, 68". */
  markerGlowColor?: string;
  /** Color del punto central de los marcadores, triplete RGB. Default: "255, 255, 255". */
  markerCoreColor?: string;
  /** Stops del gradiente radial de fondo: [posición 0-1, color CSS]. */
  backgroundStops?: Array<[number, string]>;
  /** Dibuja el halo de atmósfera alrededor del globo. Default: true. */
  showAtmosphere?: boolean;
  /** Tope de devicePixelRatio para limitar el costo de render. Default: sin tope. */
  maxPixelRatio?: number;
  className?: string;
  style?: React.CSSProperties;
}

declare function LandGlobe(props: LandGlobeProps): React.ReactElement;

export default LandGlobe;
