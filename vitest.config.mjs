import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    // pretendToBeVisual habilita requestAnimationFrame en jsdom (el loop de
    // render del globo depende de rAF).
    environmentOptions: { pretendToBeVisual: true },
    include: ["test/**/*.test.{js,jsx}"],
  },
});
