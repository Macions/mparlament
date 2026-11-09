import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function AdminRoute() {
	const { user, isAdmin, loading } = useAuth();

	if (loading) return null;

	const hasManage =
		isAdmin ||
		user?.permissions?.some?.((p) => p?.startsWith("MANAGE_")) ||
		user?.role === "marshal";

	if (!user || !hasManage) {
		return <Navigate to="/panel" replace />;
	}

	return <Outlet />;
}
