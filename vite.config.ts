import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// React single-page app. The Express API runs on port 5000; Vite forwards /api to it.
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    viteReact(),
    tailwindcss(),
  ],
});
