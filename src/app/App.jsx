import { useLocation } from "react-router-dom";

import { NotificationsProvider } from "../features/notifications/NotificationsContext";
import NotificationsModal from "../features/notifications/NotificationsModal";
import NotificationsToast from "../features/notifications/NotificationsToast";
import AppRoutes from "../routes/AppRoutes";
import AppLayout from "./AppLayout";
import { AuthProvider } from "../features/auth/AuthContext";
import useReveal from "../hooks/useReveal";
import { MaintenancePage } from "../components/MaintenancePage";
import { useSystemStatus } from "../hooks/useSystemStatus";
import "./App.css";

export default function App() {
	const location = useLocation();
	const { loading, maintenance, message, until } = useSystemStatus();
	useReveal();

	const isLoginPage = location.pathname === "/zaloguj";

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					background: "#fafaf9",
					color: "#6b7280",
					fontFamily: "IBM Plex Sans, system-ui, sans-serif",
				}}
			>
				Ładowanie…
			</div>
		);
	}

	if (maintenance) return <MaintenancePage message={message} until={until} />;

	return (
		<AuthProvider>
			<NotificationsProvider>
				{isLoginPage ? (
					<div className="app" key={location.pathname}>
						<AppRoutes />
					</div>
				) : (
					<div className="app" key={location.pathname}>
						<AppLayout>
							<AppRoutes />
						</AppLayout>
					</div>
				)}
				<NotificationsModal />
				<NotificationsToast />
			</NotificationsProvider>
		</AuthProvider>
	);
}
