/**
 * Proyección esférica → 2D.
 *
 * Convierte (lat, lon) a un punto 3D sobre una esfera de `radius`, aplica las
 * rotaciones rotX (inclinación) y rotY (giro), y devuelve coordenadas de
 * pantalla centradas en (centerX, centerY). `z > 0` = hemisferio visible.
 */
export function project(lat, lon, rotX, rotY, radius, centerX, centerY) {
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
}
