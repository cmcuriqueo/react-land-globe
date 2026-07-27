# Roadmap de features pendientes

Este documento agrupa las mejoras restantes para `react-land-globe` después de
la iteración actual (estilos de tierra + labels + tooltips).

## Próximos pasos sugeridos

### 1. Anti-colisión de labels
- Implementar un algoritmo simple de colisión de cajas (AABB) para evitar que
  los labels de marcadores cercanos se solapen.
- Estrategia: en el loop de render, calcular los bounding boxes de todos los
  labels visibles y ocultar/desplazar los que colisionan.
- Alternativa: permitir que `labelPosition` se ajuste automáticamente
  (`labelPosition="auto"`) para minimizar superposiciones.

### 2. Estilos de tierra adicionales
- `landStyle="dots+outline"` ya está implementado.
- `landStyle="fill"` se exploró pero no se incluye en la API actual; el clipping
  del borde del hemisferio visible requiere más trabajo para evitar artefactos.
- Modo "night lights" / "topo" / "wireframe" como variantes futuras.

### 3. Marcadores más útiles
- Arcos / conexiones entre marcadores (`from` → `to`).
- Marcadores animados (pulso, fade-in, escala).
- Clusters cuando hay muchos puntos cercanos.
- Marcadores con iconos o formas distintas (pin, triángulo).

### 4. Interactividad extra
- Zoom suave (rueda o botones).
- Rotación vertical completa (actualmente solo horizontal + tilt fijo).
- Centrar automáticamente en un marcador o grupo de marcadores.
- Modo "seguir" un punto mientras rota.

### 5. Visuales premium
- Atmósfera más realista (gradiente radial + glow).
- Nubes sutiles (capa de puntos semitransparentes que se mueven más lento).
- Estrellas de fondo o nebulosa.
- Modo día/noche según posición del sol.

### 6. Performance y DX
- `pauseOnHover` / `pauseOnInvisible` vía `IntersectionObserver`.
- Control de FPS (`targetFPS`).
- Versión "static" sin animación.
- Más presets de colores (dark, light, neon, corporate).
- Exportar a imagen (`canvas.toDataURL`).

### 7. Features "wow"
- Arcos animados que se dibujan (flights / conexiones).
- Rings concéntricos alrededor de un marcador (radar).
- Partículas que viajan entre dos puntos.
- Modo "globe + mapa 2D" (toggle).
- Integración fácil con Framer Motion o CSS transitions.

## Notas técnicas

- Los contornos (`src/land-outlines.js`) ya están generados y se usan para el
  estilo `outline`.
- El tooltip ya es un nodo DOM posicionado absolutamente, lo que facilita
  agregar animaciones con CSS o Framer Motion más adelante.
