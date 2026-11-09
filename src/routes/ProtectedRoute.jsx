import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function ProtectedRoute() {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				Ładowanie…
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/zaloguj" replace />;
	}

	return <Outlet />;
}
