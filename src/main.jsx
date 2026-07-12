import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App";

async function enableMocking() {
	if (import.meta.env.DEV) {
	// if (false) {
		const { worker } = await import("./mocks/browser");

		return worker.start();
	}

	return Promise.resolve();
}

enableMocking().then(() => {
	ReactDOM.createRoot(document.getElementById("root")).render(
		<HashRouter>
			<App />
		</HashRouter>,
	);
});
