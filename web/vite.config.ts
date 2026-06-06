/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Dev: proxy /api to the FastAPI server so the browser talks to a single origin
// (no CORS needed). SSE streams pass through the proxy transparently.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy libraries so they cache independently of app code.
        manualChunks: {
          codemirror: [
            "@uiw/react-codemirror",
            "@codemirror/view",
            "@codemirror/state",
            "@codemirror/lang-markdown",
            "@codemirror/merge",
            "@codemirror/theme-one-dark",
          ],
          markdown: ["react-markdown", "remark-gfm", "rehype-sanitize"],
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
