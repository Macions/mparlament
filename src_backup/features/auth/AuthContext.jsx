import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchMe = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					navigate("/zaloguj");
					return;
				}
				const res = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error("Unauthorized");
				const data = await res.json();
				setUser(data);
				setIsAdmin(
					data.role === "admin" ||
						data.permissions?.includes("MANAGE_RESOLUTIONS"),
				);
			} catch {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
				navigate("/zaloguj");
			} finally {
				setLoading(false);
			}
		};
		fetchMe();
	}, [navigate]);

	return (
		<AuthContext.Provider value={{ user, isAdmin, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
