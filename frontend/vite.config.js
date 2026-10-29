import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api is proxied to the Express backend (npm run dev starts both).
const target = process.env.VITE_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target, changeOrigin: true } } },
  preview: { proxy: { "/api": { target, changeOrigin: true } } },
});
