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
const STORAGE_KEY = "notifiedVotingIds";

function getNotifiedIds() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return new Set(JSON.parse(raw || "[]"));
	} catch {
		return new Set();
	}
}

function saveNotifiedIds(set) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
	} catch {}
}

export function NotificationsProvider({ children }) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [pendingVotings, setPendingVotings] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [toast, setToast] = useState(null);
	const notifiedIdsRef = useRef(getNotifiedIds());
	const intervalRef = useRef(null);
	const unreadCount = pendingVotings.length;
	const fetchActiveVotings = useCallback(async () => {
		if (!user) return;
		const token = localStorage.getItem("token");
		if (!token) return;

		try {
			const res = await fetch("/newapp/api/votings?active=1", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) return;
			const data = await res.json();
			const list = Array.isArray(data) ? data : (data.votings ?? []);
			const myId = user.id ?? user.userId ?? user.parliamentarianId;

			const notVoted = list.filter((v) => {
				const notVotedUsers = Array.isArray(v.notVotedUsers)
					? v.notVotedUsers
					: [];
				return notVotedUsers.some((u) => u.id === myId);
			});

			setPendingVotings(notVoted);

			// Sprawdź, czy któreś jest nowe (nie było w notifiedIds)
			const newOnes = notVoted.filter((v) => !notifiedIdsRef.current.has(v.id));
			if (newOnes.length > 0) {
				newOnes.forEach((v) => notifiedIdsRef.current.add(v.id));
				saveNotifiedIds(notifiedIdsRef.current);

				// Toast tylko jeśli user już był na stronie (nie przy pierwszym fetchu)
				if (intervalRef.current !== null) {
					setToast({
						title: "Nowe aktywne głosowanie",
						text: newOnes[0].title,
						votingId: newOnes[0].id,
					});
					setTimeout(() => setToast(null), 8000);
				}
			}
		} catch {
			/* ignore */
		}
	}, [user]);

	// Pierwszy fetch po zalogowaniu — pokaż modal jeśli są pending
	useEffect(() => {
		if (!user) {
			setPendingVotings([]);
			setShowModal(false);
			return;
		}
		let cancelled = false;
		(async () => {
			const token = localStorage.getItem("token");
			if (!token) return;
			try {
				const res = await fetch("/newapp/api/votings?active=1", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) return;
				const data = await res.json();
				const list = Array.isArray(data) ? data : (data.votings ?? []);
				const myId = user.id ?? user.userId ?? user.parliamentarianId;
				const now = Date.now();

				const activeVotings = list.filter((v) => {
					if (
						v.status === "archived" ||
						v.status === "finished" ||
						v.status === "closed"
					)
						return false;
					const start = new Date(v.startTime).getTime();
					const end = new Date(v.endTime).getTime();
					if (Number.isNaN(start) || Number.isNaN(end)) return false;
					return now >= start && now <= end;
				});

				const notVoted = activeVotings.filter((v) => {
					const nv = Array.isArray(v.notVotedUsers) ? v.notVotedUsers : [];
					return nv.some((u) => u.id === myId);
				});
				if (cancelled) return;
				setPendingVotings(notVoted);
				if (notVoted.length > 0) setShowModal(true);
				notVoted.forEach((v) => notifiedIdsRef.current.add(v.id));
				saveNotifiedIds(notifiedIdsRef.current);
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, [user]);

	// Polling co 30 s — tylko gdy user zalogowany
	useEffect(() => {
		if (!user) return;
		intervalRef.current = setInterval(fetchActiveVotings, POLL_MS);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = null;
		};
	}, [user, fetchActiveVotings]);

	// helper — bo useEffect powyżej nie widzi aktualnego stanu
	function pendingVotingsRefHasItems() {
		return pendingVotings.length > 0;
	}

	const dismissModal = () => setShowModal(false);
	const openVoting = (id) => {
		setShowModal(false);
		navigate(`/glosowanie/${id}`);
	};

	return (
		<NotificationsContext.Provider
			value={{
				pendingVotings,
				unreadCount,
				showModal,
				dismissModal,
				openVoting,
				toast,
				dismissToast: () => setToast(null),
				refresh: fetchActiveVotings,
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
