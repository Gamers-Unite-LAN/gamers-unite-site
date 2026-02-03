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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssgOptions: {
    onFinished() {
      generateSitemap({
        hostname: 'https://gamersunitelan.com',
      });
    },
  },
});
