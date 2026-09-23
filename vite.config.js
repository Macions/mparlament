import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/system": "http://localhost:4000",
			"/api": "http://localhost:4000",
			"/socket.io": { target: "http://localhost:4000", ws: true },
		},
	},
});
