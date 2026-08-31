import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import generateSitemap from "vite-ssg-sitemap";

import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue()],
  server: {
    proxy: {
      // Local dev: serve /api same-origin and forward to the API server,
      // so browser requests never need CORS.
      "/api": "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssgOptions: {
    onFinished() {
      generateSitemap({
        hostname: "https://gamersunitelan.com",
      });
    },
  },
});
