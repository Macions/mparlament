import Header from "../components/Header";
import SocialFooter from "../components/SocialFooter";

import { useLocation } from "react-router-dom";

import AppRoutes from "../routes/AppRoutes";

import "./App.css";

import useReveal from "../hooks/useReveal";
import { MaintenancePage } from "../components/MaintenancePage";
import { useSystemStatus } from "../hooks/useSystemStatus";

export default function App() {
	const location = useLocation();
	const { loading, maintenance, message, until } = useSystemStatus();

	useReveal();

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					height: "100vh",
					alignItems: "center",
					justifyContent: "center",
					background: "#020617",
					color: "#94a3b8",
				}}
			>
				Ładowanie…
			</div>
		);
	}

	if (maintenance) {
		return <MaintenancePage message={message} until={until} />;
	}

	return (
		<div className="app" key={location.pathname}>
			<Header />

			<main className="main">
				<AppRoutes />
			</main>

			<SocialFooter />
		</div>
	);
}
