import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	base: "/",
	plugins: [react()],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:4001",
				changeOrigin: true,
				timeout: 120000,
			},
			"/socket.io": {
				target: "http://localhost:4001",
				ws: true,
				changeOrigin: true,
			},
			"/uploads": {
				target: "http://localhost:4001",
				changeOrigin: true,
			},
		},
	},
});
