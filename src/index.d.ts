import * as React from "react";

export interface LabelStyle {
  /** Tamaño de fuente en px. Default: 12. */
  fontSize?: number;
  /** Familia tipográfica. Default: sistema. */
  fontFamily?: string;
  /** Peso de fuente. Default: "500". */
  fontWeight?: string | number;
  /** Color del texto como triplete RGB "r, g, b". Default: "255, 255, 255". */
  color?: string;
  /** Color de fondo como triplete RGB "r, g, b". Default: "0, 0, 0". */
  backgroundColor?: string;
  /** Padding uniforme o por eje. Default: { x: 6, y: 2 }. */
  padding?: number | { x?: number; y?: number };
  /** Radio de esquina del fondo. Default: 4. */
  borderRadius?: number;
}

export interface GlobeMarker {
  /** Latitud en grados (-90 a 90). */
  lat: number;
  /** Longitud en grados (-180 a 180). */
  lon: number;
  /** Etiqueta opcional. */
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
  /** Estilo de los continentes. Default: "dots". */
  landStyle?: "dots" | "outline" | "dots+outline" | "fill";
  /** Color de los puntos de tierra, triplete RGB "r, g, b". Default: "255, 255, 255". */
  dotColor?: string;
  /** Opacidad máxima de los puntos de tierra (0 a 1). Default: 0.55. */
  dotOpacity?: number;
  /** Color de los contornos de tierra, triplete RGB "r, g, b". Default: "255, 255, 255". */
  outlineColor?: string;
  /** Opacidad máxima de los contornos de tierra (0 a 1). Default: 0.75. */
  outlineOpacity?: number;
  /** Grosor de línea de los contornos de tierra en px CSS. Default: 1. */
  outlineWidth?: number;
  /** Color de relleno de los continentes con landStyle="fill", triplete RGB. Default: "255, 255, 255". */
  fillColor?: string;
  /** Opacidad del relleno con landStyle="fill". Default: 0.15. */
  fillOpacity?: number;
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
  /** Muestra el nombre de cada marcador junto al punto. Default: false. */
  showLabels?: boolean;
  /** Posición del label respecto al marcador. Default: "top". Use "auto" para que elija automáticamente la posición sin colisiones. */
  labelPosition?: "top" | "right" | "bottom" | "left" | "auto";
  /** Separación entre el marcador y el label en px. Default: 10. */
  labelOffset?: number;
  /** Estilo de los labels dibujados en canvas. */
  labelStyle?: LabelStyle;
  /** Función para obtener el texto del label a partir del marcador. Default: m => m.name. */
  labelFormatter?: (marker: GlobeMarker) => string;
  /** Renderiza un tooltip HTML/React al hacer hover sobre un marcador. */
  renderTooltip?: (marker: GlobeMarker) => React.ReactNode;
  /** Retraso antes de mostrar el tooltip en ms. Default: 150. */
  tooltipDelay?: number;
  /** Callback al hacer click en un marcador. */
  onMarkerClick?: (marker: GlobeMarker) => void;
  /** Callback al pasar el mouse por encima de un marcador (null al salir). */
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

declare function LandGlobe(props: LandGlobeProps): React.ReactElement;

export default LandGlobe;
