import { useEffect, useState } from "react";

// Domyślnie /newapp/api — bo frontend jest hostowany pod /newapp/,
// a nginx proxuje /newapp/api/* na nowy backend (mparlament-backend:4000).
const API_BASE = import.meta.env.VITE_API_URL ?? "/newapp/api";

export function useSystemStatus() {
	const [status, setStatus] = useState({
		loading: true, // ← najpierw ładuje
		maintenance: false, // ← NIE wymuszaj maintenance
		message: null,
		until: null,
	});

	useEffect(() => {
		let cancelled = false;

		async function check() {
			try {
				const res = await fetch(`${API_BASE}/system/status`, {
					cache: "no-store",
				});
				if (!res.ok) throw new Error("status fetch failed");
				const data = await res.json();
				if (!cancelled) {
					setStatus({
						loading: false,
						maintenance: !!data.maintenance,
						message: data.message ?? null,
						until: data.until ?? null,
					});
				}
			} catch {
				// Jak fetch padnie — NIE zostawiaj maintenance=true na siłę.
				// Lepiej wpuścić użytkownika do aplikacji niż trzymać go
				// w trybie serwisowym z powodu błędu sieci.
				if (!cancelled) {
					setStatus({
						loading: false,
						maintenance: false,
						message: null,
						until: null,
					});
				}
			}
		}

		check();
		const id = setInterval(check, 30_000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, []);

	return status;
}
