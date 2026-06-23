import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ANALYZE = process.env.ANALYZE === "1" || process.env.ANALYZE === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(ANALYZE
      ? [
          visualizer({
            filename: "dist/bundle-stats.html",
            gzipSize: true,
            brotliSize: true,
            open: false,
            template: "treemap",
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    /* Modern baseline: smaller output than es2015; targets evergreen + current mobile browsers. */
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom)\//.test(id)) return "react";
          if (id.includes("node_modules/react-virtuoso")) return "virtualization";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/idb")) return "idb";
          if (id.includes("node_modules/@noble")) return "noble-hashes";
          return undefined;
        },
      },
    },
  },
})
