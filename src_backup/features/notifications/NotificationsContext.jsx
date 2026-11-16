// src/features/notifications/NotificationsContext.jsx
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NotificationsContext = createContext(null);
const POLL_MS = 30_000;

function getToken() {
	const raw = localStorage.getItem("token");
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed?.token ?? raw;
	} catch {
		return raw;
	}
}

async function apiFetch(path, options = {}) {
	const token = getToken();
	const headers = {
		Accept: "application/json",
		...(options.headers || {}),
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
	return fetch(`/newapp/api${path}`, { ...options, headers });
}

export function NotificationsProvider({ children }) {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [notifications, setNotifications] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [toast, setToast] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const firstFetchDoneRef = useRef(false);
	const toastedIdsRef = useRef(new Set());
	const intervalRef = useRef(null);

	const unreadNotifications = notifications.filter((n) => !n.read);
	const unreadCount = unreadNotifications.length;
	const pendingVotings = notifications.filter(
		(n) => n.type === "voting_pending" && !n.read,
	);

	const fetchNotifications = useCallback(
		async ({ isInitial = false } = {}) => {
			if (!user) return;
			if (!getToken()) return;

			if (isInitial) setLoading(true);
			setError(null);

			try {
				const res = await apiFetch("/notifications");
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				const items = Array.isArray(data) ? data : (data.items ?? []);

				const newUnread = items.filter(
					(n) => !n.read && !toastedIdsRef.current.has(n.id),
				);

				setNotifications(items);

				if (isInitial) {
					firstFetchDoneRef.current = true;
					if (items.some((n) => !n.read)) {
						setShowModal(true);
					}
				} else if (newUnread.length > 0) {
					const first = newUnread[0];
					setToast({
						title: "Nowe powiadomienie",
						text: first.title,
						notification: first,
					});
					setTimeout(() => setToast(null), 8000);
				}

				items.forEach((n) => toastedIdsRef.current.add(n.id));
			} catch (e) {
				setError(
					e instanceof Error ? e.message : "Nie udało się pobrać powiadomień",
				);
			} finally {
				if (isInitial) setLoading(false);
			}
		},
		[user],
	);

	useEffect(() => {
		if (!user) {
			setNotifications([]);
			setShowModal(false);
			setToast(null);
			firstFetchDoneRef.current = false;
			toastedIdsRef.current = new Set();
			return;
		}
		let cancelled = false;
		(async () => {
			await fetchNotifications({ isInitial: true });
			if (cancelled) return;
		})();
		return () => {
			cancelled = true;
		};
	}, [user, fetchNotifications]);

	useEffect(() => {
		if (!user) return;
		intervalRef.current = setInterval(() => {
			void fetchNotifications();
		}, POLL_MS);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = null;
		};
	}, [user, fetchNotifications]);

	const markAsRead = useCallback(async (notificationId) => {
		setNotifications((prev) =>
			prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
		);
		try {
			const res = await apiFetch(`/notifications/${notificationId}/read`, {
				method: "POST",
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
		} catch (e) {
			setNotifications((prev) =>
				prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)),
			);
			setError(
				e instanceof Error
					? e.message
					: "Nie udało się oznaczyć jako przeczytane",
			);
		}
	}, []);

	const markAllAsRead = useCallback(async () => {
		const snapshot = notifications;
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		try {
			const res = await apiFetch("/notifications/read-all", { method: "POST" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
		} catch (e) {
			setNotifications(snapshot);
			setError(
				e instanceof Error ? e.message : "Nie udało się oznaczyć wszystkich",
			);
		}
	}, [notifications]);

	const openNotification = useCallback(
		async (notification) => {
			setShowModal(false);
			setToast(null);
			if (!notification.read) {
				try {
					await markAsRead(notification.id);
				} catch {}
			}

			if (notification.type === "voting_pending" && notification.votingId) {
				navigate(`/glosowanie/${notification.votingId}`);
				return;
			}

			if (notification.resolutionSlug) {
				navigate(`/${notification.resolutionSlug}`);
				return;
			}
			if (notification.resolutionId) {
				navigate(`/uchwaly?id=${notification.resolutionId}`);
				return;
			}
			navigate("/uchwaly");
		},
		[markAsRead, navigate],
	);

	const dismissModal = () => setShowModal(false);
	const dismissToast = () => setToast(null);

	return (
		<NotificationsContext.Provider
			value={{
				notifications,
				pendingVotings,
				unreadCount,
				unreadNotifications,
				showModal,
				dismissModal,
				openNotification,
				toast,
				dismissToast,
				refresh: () => fetchNotifications(),
				loading,
				error,
				markAsRead,
				markAllAsRead,
			}}
		>
			{children}
		</NotificationsContext.Provider>
	);
}

export function useNotifications() {
	const ctx = useContext(NotificationsContext);
	if (!ctx)
		throw new Error(
			"useNotifications must be used within NotificationsProvider",
		);
	return ctx;
}
