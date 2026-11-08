import { useLocation } from "react-router-dom";
import AppRoutes from "../routes/AppRoutes";
import AppLayout from "./AppLayout";
import SocialFooter from "../components/SocialFooter";
import { AuthProvider } from "../features/auth/AuthContext";
import useReveal from "../hooks/useReveal";
import { MaintenancePage } from "../components/MaintenancePage";
import { useSystemStatus } from "../hooks/useSystemStatus";
import "./App.css";

export default function App() {
	const location = useLocation();
	const { loading, maintenance, message, until } = useSystemStatus();
	useReveal();

	if (loading)
		return (
			<div
				style={
					{
						/* ... */
					}
				}
			>
				Ładowanie…
			</div>
		);
	if (maintenance) return <MaintenancePage message={message} until={until} />;

	return (
		<AuthProvider>
			<div className="app" key={location.pathname}>
				<AppLayout>
					<AppRoutes />
				</AppLayout>
				<SocialFooter />
			</div>
		</AuthProvider>
	);
}
