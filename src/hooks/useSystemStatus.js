import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useSystemStatus() {
	const [status, setStatus] = useState({
		loading: false, // ← też zmień na false, żeby nie czekać
		maintenance: true, // ← WYMUŚ
		message: "Test trybu maintenance",
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
				if (!cancelled) setStatus((s) => ({ ...s, loading: false }));
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
