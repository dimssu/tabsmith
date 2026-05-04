import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "node:path";
import manifest from "./src/manifest.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
