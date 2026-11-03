import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Бэкенд (Express) по умолчанию на :4500, можно переопределить: API_PROXY=http://host:port
const API = process.env.API_PROXY || "http://localhost:4500";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3100,
    proxy: {
      "/api": API,
      "/uploads": API,
    },
  },
});
