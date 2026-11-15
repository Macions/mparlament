import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/newapp/",
  plugins: [react()],
  server: {
    proxy: {
      "/newapp/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
        timeout: 120000, // 2 minuty
        rewrite: (path) => path.replace(/^\/newapp/, ""),
      },
      "/newapp/socket.io": {
        target: "http://localhost:4001",
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/newapp/, ""),
      },
      "/uploads": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
});