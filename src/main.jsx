import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./features/auth/AuthContext";
import "./components/backButton.css";
// main.jsx — na górze, przed renderem
if ("serviceWorker" in navigator) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		for (const registration of registrations) {
			registration.unregister();
		}
	});
}
ReactDOM.createRoot(document.getElementById("root")).render(
	<BrowserRouter>
		<AuthProvider>
			<App />
		</AuthProvider>
	</BrowserRouter>,
);
