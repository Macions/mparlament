import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
	plugins: [react()],
	base: mode === "production" ? "/newapp/" : "/",
	server: {
		proxy: {
			"/newapp/api": {
				target: "http://localhost:4000",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/newapp\/api/, "/api"),
			},
			"/newapp/socket.io": {
				target: "http://localhost:4000",
				changeOrigin: true,
				ws: true,
				rewrite: (path) => path.replace(/^\/newapp\/socket\.io/, "/socket.io"),
			},
		},
	},
}));
