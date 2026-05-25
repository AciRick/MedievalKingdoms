import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ascolta su 0.0.0.0 per LAN
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_WS_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
