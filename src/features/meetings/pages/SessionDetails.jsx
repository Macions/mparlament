import { useEffect, useState, useMemo, useRef } from "react";
import styles from "./SessionDetails.module.css";
import BackButton from "../../../components/PageBack";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../socket/SocketProvider";
import {
	Check,
	Circle,
	Minus,
	ArrowUp,
	ArrowDown,
	X,
	Pencil,
	RotateCcw,
	Trash2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";

const getCurrentTime = () => {
	const now = new Date();
	return now.toLocaleTimeString("pl-PL", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

const parseTimeToMinutes = (timeStr) => {
	if (!timeStr || timeStr.includes("Przerwa") || timeStr.includes("Nowy"))
		return Infinity;
	const parts = timeStr.split(":");
	if (parts.length !== 2) return Infinity;
	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	if (isNaN(hours) || isNaN(minutes)) return Infinity;
	return hours * 60 + minutes;
};

export default function SessionDetails() {
	const { socket, isConnected } = useSocket();
	const navigate = useNavigate();
	const [session, setSession] = useState(null);
	const [status, setStatus] = useState("");
	const [displayPoint, setDisplayPoint] = useState(null);
	const [schedule, setSchedule] = useState([]);
	const [title, setTitle] = useState("");

	const [plannedSpeakers, setPlannedSpeakers] = useState([]);
	const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(-1);
	const [date, setDate] = useState("");
	const [speakers, setSpeakers] = useState([]);
	const [parliamentarians, setParliamentarians] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [displaySpeaker, setDisplaySpeaker] = useState(null);

	const [sessionMode, setSessionMode] = useState("normal");
	const [scheduleBackup, setScheduleBackup] = useState(null);
	const [activeIndexBackup, setActiveIndexBackup] = useState(null);
	const [draftSpeakerName, setDraftSpeakerName] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [newSpeakerName, setNewSpeakerName] = useState("");
	const [newSpeakerClub, setNewSpeakerClub] = useState("");
	const [newSpeakerRole, setNewSpeakerRole] = useState("Parlamentarzysta");
	const [breakEndTime, setBreakEndTime] = useState("");
	const [breakStartTime, setBreakStartTime] = useState("");
	const [userRole, setUserRole] = useState(null);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [speakerChanging, setSpeakerChanging] = useState(false);
	const [pointChanging, setPointChanging] = useState(false);
	const [isPointDisabled, setIsPointDisabled] = useState(false);
	const [customSpeakers, setCustomSpeakers] = useState({});
	const [zoContent, setZoContent] = useState("Sprawdzanie obecności");
	const [isEditingZO, setIsEditingZO] = useState(false);
	const [adminMode, setAdminMode] = useState(false);
	const token = localStorage.getItem("token");

	const saveTimer = useRef(null);
	const isLocalUpdate = useRef(false);

	const updateSessionDebounced = (data) => {
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => {
			updateSession(data);
		}, 800);
	};

	/* ─── Socket: ZO content ─── */
	useEffect(() => {
		if (!socket) return;

		const handleZOUpdate = (newZoContent) => {
			setZoContent(newZoContent);
			if (sessionMode === "zo" && displayPoint) {
				setDisplayPoint((prev) => ({ ...prev, type: newZoContent }));
			}
		};

		socket.on("zoContentUpdated", handleZOUpdate);
		return () => {
			socket.off("zoContentUpdated", handleZOUpdate);
		};
	}, [socket, sessionMode, displayPoint]);

	/* ─── Handlery harmonogramu ─── */
	const toggleCrossItem = (index) => {
		const newSchedule = [...schedule];
		if (newSchedule[index].status === "crossed") {
			newSchedule[index].status = "waiting";
		} else {
			newSchedule[index].status = "crossed";
		}
		setSchedule(newSchedule);
		updateSession({ schedule: newSchedule });
	};

	const disableCurrentPoint = () => {
		if (sessionMode === "break" || sessionMode === "zo") return;

		if (!scheduleBackup) {
			setScheduleBackup([...schedule]);
			setActiveIndexBackup(
				schedule.findIndex((item) => item.status === "active"),
			);
		}

		const newSchedule = schedule.map((item) => {
			if (item.status === "active") {
				return { ...item, status: "disabled" };
			}
			return item;
		});
		setSchedule(newSchedule);
		updateSession({ schedule: newSchedule });

		setDisplayPoint(null);
		setIsPointDisabled(true);
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);
	};

	const getSpeakerData = (name, customSpeakers) => {
		if (customSpeakers && customSpeakers[name]) {
			return customSpeakers[name];
		}
		const found = parliamentarians.find(
			(p) => `${p.firstName} ${p.lastName}`.trim() === name,
		);
		if (found) {
			return {
				club: found.clubName || "",
				role:
					Array.isArray(found.functions) && found.functions.length > 0
						? found.functions.join(", ")
						: "Parlamentarzysta",
			};
		}
		return { club: "", role: "Parlamentarzysta" };
	};

	const restoreCurrentPoint = () => {
		if (!scheduleBackup) return;

		const restoredSchedule = scheduleBackup.map((item, index) => {
			if (index === activeIndexBackup) {
				return { ...item, status: "active" };
			}
			return item;
		});

		setSchedule(restoredSchedule);
		updateSession({ schedule: restoredSchedule });
		setScheduleBackup(null);
		setActiveIndexBackup(null);
		setIsPointDisabled(false);

		if (session) {
			setDisplayPoint(session.currentPoint);
		}
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);
	};

	const goToPreviousSpeaker = () => {
		if (currentSpeakerIndex <= 0) return;
		const prevIndex = currentSpeakerIndex - 1;
		const prevSpeaker = plannedSpeakers[prevIndex];
		if (prevSpeaker) {
			const updated = plannedSpeakers.map((s, i) => {
				if (i === currentSpeakerIndex && s.status === "active") {
					return { ...s, status: "waiting" };
				}
				if (i === prevIndex) {
					return { ...s, status: "active" };
				}
				return s;
			});
			setPlannedSpeakers(updated);

			setDisplaySpeaker(prevSpeaker);
			setCurrentSpeakerIndex(prevIndex);
			setSpeakerChanging(true);
			setTimeout(() => setSpeakerChanging(false), 400);

			updateSession({ currentSpeaker: prevSpeaker, speakers: updated });
		}
	};

	const goToNextSpeaker = () => {
		if (currentSpeakerIndex >= plannedSpeakers.length - 1) return;
		const nextIndex = currentSpeakerIndex + 1;
		const nextSpeaker = plannedSpeakers[nextIndex];
		if (nextSpeaker) {
			const updated = plannedSpeakers.map((s, i) => {
				if (i === currentSpeakerIndex && s.status === "active") {
					return { ...s, status: "done" };
				}
				if (i === nextIndex) {
					return { ...s, status: "active" };
				}
				return s;
			});
			setPlannedSpeakers(updated);

			setDisplaySpeaker(nextSpeaker);
			setCurrentSpeakerIndex(nextIndex);
			setSpeakerChanging(true);
			setTimeout(() => setSpeakerChanging(false), 400);

			updateSession({ currentSpeaker: nextSpeaker, speakers: updated });
		}
	};

	const allSpeakers = useMemo(() => {
		const map = parliamentarians.reduce((acc, p) => {
			const fullName = `${p.firstName} ${p.lastName}`.trim();
			if (!fullName) return acc;
			return {
				...acc,
				[fullName]: {
					club: p.clubName || "",
					role:
						Array.isArray(p.functions) && p.functions.length > 0
							? p.functions.join(", ")
							: "Parlamentarzysta",
				},
			};
		}, {});
		return { ...map, ...customSpeakers };
	}, [parliamentarians, customSpeakers]);

	useEffect(() => {
		if (speakers.length > 0 && plannedSpeakers.length === 0) {
			const history = speakers.map((s, index) => ({
				name: s.name,
				club: s.club || "",
				role: s.role || "Parlamentarzysta",
				time: getCurrentTime(),
				status: index === 0 ? "active" : "waiting",
			}));
			setPlannedSpeakers(history);
			setCurrentSpeakerIndex(0);
			setDisplaySpeaker(history[0]);
		}
	}, [speakers]);

	const markSpeakerDone = (index) => {
		const updated = [...plannedSpeakers];
		updated[index].status = "done";
		setPlannedSpeakers(updated);
		const nextActive = updated.find((s) => s.status === "active");
		updateSession({
			currentSpeaker: nextActive || null,
			speakers: updated,
		});
	};

	const markSpeakerActive = (index) => {
		const updated = plannedSpeakers.map((s, i) => {
			if (i === index) return { ...s, status: "active" };
			if (s.status === "active") return { ...s, status: "done" };
			return s;
		});
		setPlannedSpeakers(updated);
		setCurrentSpeakerIndex(index);
		setDisplaySpeaker(plannedSpeakers[index]);
		updateSession({
			currentSpeaker: plannedSpeakers[index],
			speakers: updated,
		});
	};

	const removeSpeaker = (index) => {
		if (
			window.confirm(`Czy na pewno usunąć mówcę ${plannedSpeakers[index].name}?`)
		) {
			const updated = plannedSpeakers.filter((_, i) => i !== index);
			setPlannedSpeakers(updated);
			if (currentSpeakerIndex >= updated.length) {
				setCurrentSpeakerIndex(updated.length - 1);
			}
			const nextActive = updated.find((s) => s.status === "active");
			updateSession({
				currentSpeaker: nextActive || null,
				speakers: updated,
			});
		}
	};

	const editSpeaker = (index, field, value) => {
		const updated = [...plannedSpeakers];
		updated[index][field] = value;
		setPlannedSpeakers(updated);

		const speakerName = updated[index].name;
		const speakerIndex = speakers.findIndex((s) => s.name === speakerName);

		if (speakerIndex !== -1) {
			const updatedSpeakers = [...speakers];
			updatedSpeakers[speakerIndex] = {
				...updatedSpeakers[speakerIndex],
				[field]: value,
			};
			setSpeakers(updatedSpeakers);

			fetch("/newapp/api/speakers", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(updatedSpeakers[speakerIndex]),
			}).catch((err) => console.error("Błąd aktualizacji mówcy:", err));

			if (displaySpeaker?.name === speakerName) {
				updateSession({
					currentSpeaker: { ...displaySpeaker, [field]: value },
					speakers: updated,
				});
			}
		}
	};

	/* ─── Fetch user ─── */
	useEffect(() => {
		async function fetchUser() {
			try {
				const response = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const user = await response.json();
					setUserRole(user.role);
					const authorized =
						user.role === "admin" || user.role === "marshal";
					setIsAuthorized(authorized);
					setAdminMode(authorized);
				}
			} catch (err) {
				console.error("Błąd pobierania użytkownika:", err);
			}
		}
		fetchUser();
	}, [token]);

	/* ─── Zastosuj sesję do stanu ─── */
	useEffect(() => {
		if (session && !isLocalUpdate.current) {
			setDisplaySpeaker(session.currentSpeaker ?? null);
			setDisplayPoint(session.currentPoint ?? null);
			setSchedule(session.schedule ?? []);
			setStatus(session.status ?? "");
			setTitle(session.title ?? "");
			setDate(session.date ?? "");

			if (session.zoContent) setZoContent(session.zoContent);
			if (session.sessionMode) setSessionMode(session.sessionMode);
			if (Array.isArray(session.speakers) && session.speakers.length > 0) {
				setPlannedSpeakers(session.speakers);
			}
		}
	}, [session]);

	/* ─── Synchronizuj displayPoint z aktywnym punktem harmonogramu ─── */
	useEffect(() => {
		if (sessionMode !== "normal" || !displayPoint) return;
		const activeIndex = schedule.findIndex((item) => item.status === "active");
		if (activeIndex !== -1) {
			const activeItem = schedule[activeIndex];
			const newPoint = {
				number: String(activeIndex + 1),
				title: activeItem.title,
				type: displayPoint.type,
			};
			if (
				newPoint.number !== displayPoint.number ||
				newPoint.title !== displayPoint.title ||
				newPoint.type !== displayPoint.type
			) {
				setDisplayPoint(newPoint);
				setPointChanging(true);
				setTimeout(() => setPointChanging(false), 400);
			}
		}
	}, [schedule, displayPoint, sessionMode]);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "instant" });
	}, []);

	/* ─── Fetch session data ─── */
	useEffect(() => {
		async function fetchSessionData() {
			try {
				setLoading(true);

				const sessionRes = await fetch("/newapp/api/session/current", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!sessionRes.ok) throw new Error("Nie udało się pobrać sesji");
				const sessionData = await sessionRes.json();
				setSession(sessionData);

				const speakersRes = await fetch("/newapp/api/speakers", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!speakersRes.ok) throw new Error("Nie udało się pobrać mówców");
				const speakersData = await speakersRes.json();
				setSpeakers(speakersData);

				const parlRes = await fetch("/newapp/api/parliamentarians", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!parlRes.ok)
					throw new Error("Nie udało się pobrać parlamentarzystów");
				const parlData = await parlRes.json();
				setParliamentarians([
					...(parlData.parliamentarians || []),
					...(parlData.unaffiliated || []),
				]);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
		fetchSessionData();
	}, [token]);

	const updateSession = async (updatedData) => {
		isLocalUpdate.current = true;
		try {
			const response = await fetch("/newapp/api/session/current", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(updatedData),
			});
			if (!response.ok) throw new Error("Nie udało się zaktualizować sesji");
			const data = await response.json();
			setSession((prev) => ({ ...prev, ...data }));
		} catch (err) {
			setError(err.message);
		} finally {
			setTimeout(() => {
				isLocalUpdate.current = false;
			}, 0);
		}
	};
	const addSpeaker = async (speakerData) => {
		try {
			const response = await fetch("/newapp/api/speakers", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(speakerData),
			});
			if (!response.ok) throw new Error("Nie udało się dodać mówcy");
			const data = await response.json();
			setSpeakers((prev) => [...prev, data]);
		} catch (err) {
			setError(err.message);
		}
	};

	const selectSpeaker = async (name) => {
		const trimmed = name.trim();
		if (!trimmed) return;

		if (sessionMode === "break") cancelBreak();
		if (sessionMode === "zo") cancelZO();

		const data = getSpeakerData(trimmed, customSpeakers);
		const newSpeaker = {
			name: trimmed,
			club: data.club || "",
			role: data.role || "Parlamentarzysta",
			time: getCurrentTime(),
			status: "active",
		};

		// 1) Dodaj do rejestru mówców, jeśli go tam nie ma
		const alreadyInRegistry = speakers.some((s) => s.name === trimmed);
		if (!alreadyInRegistry) {
			try {
				const response = await fetch("/newapp/api/speakers", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						name: trimmed,
						club: newSpeaker.club,
						role: newSpeaker.role,
					}),
				});
				if (response.ok) {
					const saved = await response.json();
					setSpeakers((prev) => [...prev, saved]);
				}
			} catch (err) {
				console.error("Nie udało się dodać mówcy do rejestru:", err);
			}
		}

		// 2) Dodaj do kolejki plannedSpeakers
		const updated = plannedSpeakers.map((s) => {
			if (s.status === "active") {
				return { ...s, status: "done" };
			}
			return s;
		});
		const newPlannedSpeakers = [...updated, newSpeaker];
		setPlannedSpeakers(newPlannedSpeakers);
		setCurrentSpeakerIndex(plannedSpeakers.length);
		setDisplaySpeaker(newSpeaker);
		setSpeakerChanging(true);
		setTimeout(() => setSpeakerChanging(false), 400);
		setSessionMode("normal");
		setDraftSpeakerName("");
		setShowSuggestions(false);

		updateSession({
			currentSpeaker: newSpeaker,
			speakers: newPlannedSpeakers,
		});
	};

	const addCustomSpeaker = async (e) => {
		e.preventDefault();
		const name = newSpeakerName.trim();
		if (!name) return;
		if (allSpeakers[name]) {
			alert("Taki mówca już istnieje!");
			return;
		}

		const speakerData = {
			name: name,
			club: newSpeakerClub.trim() || "",
			role: newSpeakerRole.trim() || "Parlamentarzysta",
		};
		await addSpeaker(speakerData);
		await selectSpeaker(name);

		setNewSpeakerName("");
		setNewSpeakerClub("");
		setNewSpeakerRole("Parlamentarzysta");
	};

	const startBreak = () => {
		if (sessionMode === "break") return;

		const activeIdx = schedule.findIndex((item) => item.status === "active");
		setScheduleBackup([...schedule]);
		setActiveIndexBackup(activeIdx);

		const now = getCurrentTime();
		setBreakStartTime(now);
		const end = new Date();
		end.setMinutes(end.getMinutes() + 15);
		const endStr = end.toLocaleTimeString("pl-PL", {
			hour: "2-digit",
			minute: "2-digit",
		});
		setBreakEndTime(endStr);

		const breakItem = { time: now, title: "Przerwa", status: "waiting" };

		const newSchedule = [...schedule];
		const newMinutes = parseTimeToMinutes(now);
		let insertIndex = newSchedule.length;
		for (let i = newSchedule.length - 1; i >= 0; i--) {
			const currentMinutes = parseTimeToMinutes(newSchedule[i].time);
			if (currentMinutes <= newMinutes) {
				insertIndex = i + 1;
				break;
			}
		}
		newSchedule.splice(insertIndex, 0, breakItem);

		const updatedSchedule = newSchedule.map((item, idx) => {
			if (idx < insertIndex) return { ...item, status: "done" };
			if (idx === insertIndex) return { ...item, status: "active" };
			return { ...item, status: "waiting" };
		});

		setSchedule(updatedSchedule);

		const breakPoint = {
			number: "PRZERWA",
			title: "Przerwa",
			type: `do ${endStr}`,
		};
		setDisplayPoint(breakPoint);
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);

		setDisplaySpeaker(null);
		setSessionMode("break");

		updateSession({
			schedule: updatedSchedule,
			sessionMode: "break",
			currentSpeaker: null,
			currentPoint: breakPoint,
		});
	};

	const confirmBreakEnd = () => {
		if (!breakEndTime) return;

		const updatedSchedule = schedule.map((item) => {
			if (item.status === "active") {
				return { ...item, title: `Przerwa do ${breakEndTime}` };
			}
			return item;
		});
		setSchedule(updatedSchedule);
		updateSession({
			schedule: updatedSchedule,
			currentPoint: { ...displayPoint, title: `Przerwa do ${breakEndTime}` },
		});

		setDisplayPoint((prev) => ({
			...prev,
			title: `Przerwa do ${breakEndTime}`,
		}));
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);
	};

	const cancelBreak = () => {
		if (sessionMode !== "break") return;

		const restoredSchedule = scheduleBackup || schedule;

		setSchedule(restoredSchedule);
		setScheduleBackup(null);
		setActiveIndexBackup(null);
		setBreakEndTime("");
		setBreakStartTime("");
		setSessionMode("normal");
		setIsPointDisabled(false);

		setDisplaySpeaker(session?.currentSpeaker);
		setDisplayPoint(session?.currentPoint);
		setSpeakerChanging(true);
		setTimeout(() => setSpeakerChanging(false), 400);
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);

		updateSession({
			schedule: restoredSchedule,
			sessionMode: "normal",
			currentSpeaker: session?.currentSpeaker || null,
		});
	};

	const setOrganizationalTeam = () => {
		if (sessionMode === "zo") return;
		if (sessionMode === "break") cancelBreak();

		const activeIdx = schedule.findIndex((item) => item.status === "active");
		setScheduleBackup([...schedule]);
		setActiveIndexBackup(activeIdx);

		const neutralSchedule = schedule.map((item) => ({
			...item,
			status: "waiting",
		}));
		setSchedule(neutralSchedule);

		const zoPoint = {
			number: "ZO",
			title: "Zespół Organizacyjny",
			type: zoContent,
		};
		setDisplayPoint(zoPoint);
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);

		const zoSpeaker = {
			name: "Marcin Adamcewicz",
			club: "",
			role: "Koordynator Główny",
			time: getCurrentTime(),
		};
		setDisplaySpeaker(zoSpeaker);
		setSpeakerChanging(true);
		setTimeout(() => setSpeakerChanging(false), 400);
		setSessionMode("zo");

		updateSession({
			schedule: neutralSchedule,
			sessionMode: "zo",
			currentSpeaker: zoSpeaker,
		});
	};

	const cancelZO = () => {
		if (sessionMode !== "zo" || !scheduleBackup) return;

		setSchedule(scheduleBackup);
		setScheduleBackup(null);
		setActiveIndexBackup(null);
		setSessionMode("normal");

		setDisplaySpeaker(session?.currentSpeaker);
		setDisplayPoint(session?.currentPoint);
		setSpeakerChanging(true);
		setTimeout(() => setSpeakerChanging(false), 400);
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);

		updateSession({
			schedule: scheduleBackup,
			sessionMode: "normal",
			currentSpeaker: session?.currentSpeaker || null,
		});
	};

	const addScheduleItem = (time, title) => {
		if (!title.trim()) return;
		const newItem = {
			time: time || "Nowy",
			title: title.trim(),
			status: "waiting",
		};
		let newSchedule;
		if (!time || time === "Nowy") {
			newSchedule = [...schedule, newItem];
		} else {
			const newMinutes = parseTimeToMinutes(time);
			let insertIndex = schedule.length;
			for (let i = schedule.length - 1; i >= 0; i--) {
				const currentMinutes = parseTimeToMinutes(schedule[i].time);
				if (currentMinutes <= newMinutes) {
					insertIndex = i + 1;
					break;
				}
			}
			newSchedule = [...schedule];
			newSchedule.splice(insertIndex, 0, newItem);
		}
		setSchedule(newSchedule);
		updateSession({ schedule: newSchedule });
	};

	const removeScheduleItem = (index) => {
		if (window.confirm("Czy na pewno usunąć ten punkt?")) {
			const newSchedule = schedule.filter((_, i) => i !== index);
			setSchedule(newSchedule);
			updateSession({ schedule: newSchedule });
		}
	};

	const moveScheduleItem = (index, direction) => {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= schedule.length) return;
		const newSchedule = [...schedule];
		[newSchedule[index], newSchedule[newIndex]] = [
			newSchedule[newIndex],
			newSchedule[index],
		];
		setSchedule(newSchedule);
		updateSession({ schedule: newSchedule });
	};

	const setActiveItem = (index) => {
		if (sessionMode === "zo") return;
		const newSchedule = schedule.map((item, i) => {
			if (i < index) return { ...item, status: "done" };
			if (i === index) return { ...item, status: "active" };
			return { ...item, status: "waiting" };
		});
		setSchedule(newSchedule);
		updateSession({ schedule: newSchedule });
	};

	const nextItem = () => {
		if (sessionMode === "zo") return;
		const activeIndex = schedule.findIndex((item) => item.status === "active");
		if (activeIndex < schedule.length - 1) {
			setActiveItem(activeIndex + 1);
		}
	};

	const prevItem = () => {
		if (sessionMode === "zo") return;
		const activeIndex = schedule.findIndex((item) => item.status === "active");
		if (activeIndex > 0) {
			setActiveItem(activeIndex - 1);
		}
	};

	const toggleZOContentEdit = () => {
		setIsEditingZO(!isEditingZO);
	};

	const saveZOContent = () => {
		setIsEditingZO(false);
		if (sessionMode === "zo") {
			const updatedPoint = {
				...displayPoint,
				type: zoContent,
			};
			setDisplayPoint(updatedPoint);

			updateSession({
				currentPoint: updatedPoint,
				zoContent: zoContent,
			});
		}
	};

	/* ─── Socket: harmonogram, mówcy, tryb sesji ─── */
	useEffect(() => {
		if (!socket) return;

		const handleScheduleUpdate = (newSchedule) => {
			setPointChanging(true);
			setTimeout(() => {
				setSchedule(newSchedule);
				setPointChanging(false);
			}, 200);
		};

		const handleSpeakerUpdate = (newSpeaker) => {
			setSpeakerChanging(true);
			setTimeout(() => {
				setDisplaySpeaker(newSpeaker);
				setSpeakerChanging(false);
			}, 200);
		};

		const handleSpeakersUpdate = (newSpeakers) => {
			setPlannedSpeakers(newSpeakers);
		};

		const handleSessionModeUpdate = (newMode) => {
			setSessionMode(newMode);
			if (newMode === "break") {
				setDisplaySpeaker(null);
			}
		};

		socket.on("sessionModeUpdated", handleSessionModeUpdate);
		socket.on("scheduleUpdated", handleScheduleUpdate);
		socket.on("speakerUpdated", handleSpeakerUpdate);
		socket.on("speakersUpdated", handleSpeakersUpdate);

		return () => {
			socket.off("scheduleUpdated", handleScheduleUpdate);
			socket.off("speakerUpdated", handleSpeakerUpdate);
			socket.off("speakersUpdated", handleSpeakersUpdate);
			socket.off("sessionModeUpdated", handleSessionModeUpdate);
		};
	}, [socket]);

	const speakerNames = Object.keys(allSpeakers);
	const filteredSpeakers = speakerNames.filter((name) =>
		name.toLowerCase().includes(draftSpeakerName.toLowerCase()),
	);

	const showSpeaker = sessionMode !== "break" && displaySpeaker !== null;

	return (
		<div className={styles.sessionPage}>
			{/* ── TOP BAR ── */}
			<div className={styles.sessionTopBar}>
				<BackButton to="/panel" label="Panel" />
				<span
					className={`${styles.wsStatus} ${isConnected ? styles.connected : styles.disconnected}`}
				>
					<span className={styles.circleWsStatus} />
					{isConnected ? "Połączono" : "Rozłączono"}
				</span>
			</div>

			{/* ── HEADER ── */}
			<header className={styles.sessionHeader}>
				<div className={styles.sessionHeaderText}>
					<h1>{title}</h1>
					<p className={styles.sessionDate}>{date}</p>
				</div>
				{isAuthorized && (
					<div className={styles.adminToggleContainer}>
						<span className={styles.adminToggleLabel}>
							{adminMode ? "Tryb Admina" : "Tryb Użytkownika"}
						</span>
						<label className={styles.adminToggle}>
							<input
								type="checkbox"
								checked={adminMode}
								onChange={() => setAdminMode(!adminMode)}
							/>
							<span className={styles.adminToggleSlider} />
						</label>
					</div>
				)}
			</header>

			{/* ── PLANOWANI MÓWCY ── */}
			{plannedSpeakers.length > 0 && (
				<section className={styles.speakerHistorySection}>
					<div className={styles.speakerHistoryHeader}>
						<h3>Planowani mówcy</h3>
						<span className={styles.speakerCount}>
							{plannedSpeakers.filter((s) => s.status !== "done").length} /{" "}
							{plannedSpeakers.length} pozostało
						</span>
					</div>
					<div className={styles.speakerHistoryList}>
						{plannedSpeakers.map((speaker, index) => (
							<div
								key={index}
								className={`${styles.speakerHistoryItem} ${speaker.status === "active" ? styles.active : ""
									} ${speaker.status === "done" ? styles.done : ""}`}
							>
								<div className={styles.speakerHistoryAvatar}>
									{speaker.name.charAt(0)}
								</div>
								<div className={styles.speakerHistoryInfo}>
									{adminMode ? (
										<>
											<input
												type="text"
												value={speaker.name}
												onChange={(e) =>
													editSpeaker(index, "name", e.target.value)
												}
												className={`${styles.adminInput} ${styles.speakerEditInput} ${speaker.status === "done" ? styles.crossed : ""
													}`}
											/>
											<input
												type="text"
												value={speaker.role || ""}
												onChange={(e) =>
													editSpeaker(index, "role", e.target.value)
												}
												className={`${styles.adminInput} ${styles.speakerEditInput} ${styles.speakerRoleInput}`}
											/>
										</>
									) : (
										<>
											<div
												className={`${styles.speakerHistoryName} ${speaker.status === "done" ? styles.crossed : ""
													}`}
											>
												{speaker.name}
											</div>
											<div className={styles.speakerHistoryRole}>
												{speaker.role}
											</div>
										</>
									)}
								</div>

								{speaker.status === "done" && (
									<span
										className={`${styles.speakerHistoryStatus} ${styles.done}`}
									>
										<Check size={16} strokeWidth={3} />
									</span>
								)}
								{speaker.status === "active" && (
									<span
										className={`${styles.speakerHistoryStatus} ${styles.active}`}
									>
										<Circle size={12} fill="currentColor" />
									</span>
								)}
								{speaker.status === "waiting" && (
									<span
										className={`${styles.speakerHistoryStatus} ${styles.waiting}`}
									>
										<Circle size={12} />
									</span>
								)}

								<div className={styles.speakerHistoryTime}>{speaker.time}</div>

								{adminMode && (
									<div className={styles.speakerActions}>
										{speaker.status !== "done" && (
											<button
												onClick={() => markSpeakerDone(index)}
												className={`${styles.speakerActionBtn} ${styles.doneBtn}`}
												title="Oznacz jako zrealizowane"
											>
												<Check size={14} />
											</button>
										)}
										{speaker.status === "done" && (
											<button
												onClick={() => markSpeakerActive(index)}
												className={`${styles.speakerActionBtn} ${styles.activeBtn}`}
												title="Przywróć"
											>
												<RotateCcw size={14} />
											</button>
										)}
										<button
											onClick={() => removeSpeaker(index)}
											className={`${styles.speakerActionBtn} ${styles.deleteBtn}`}
											title="Usuń mówcę"
										>
											<Trash2 size={14} />
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{/* ── LIVE: MÓWCA + PUNKT ── */}
			<section className={styles.sessionLive}>
				{showSpeaker && (
					<div className={styles.liveCard}>
						<h2 className={styles.liveCardTitle}>AKTUALNIE MÓWI</h2>

						{adminMode ? (
							<div className={styles.adminSpeakerEdit}>
								<div className={styles.autocompleteWrapper}>
									<input
										type="text"
										value={draftSpeakerName}
										onChange={(e) => {
											setDraftSpeakerName(e.target.value);
											setShowSuggestions(true);
										}}
										onFocus={() => setShowSuggestions(true)}
										onBlur={() =>
											setTimeout(() => setShowSuggestions(false), 200)
										}
										placeholder="Wpisz imię i nazwisko"
										className={styles.adminInput}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												selectSpeaker(draftSpeakerName);
											}
										}}
									/>
									{showSuggestions && filteredSpeakers.length > 0 && (
										<ul className={styles.suggestionsList}>
											{filteredSpeakers.map((name) => (
												<li
													key={name}
													onMouseDown={() => selectSpeaker(name)}
												>
													{name}
												</li>
											))}
										</ul>
									)}
								</div>

								<div className={styles.adminSpeakerPreview}>
									<div
										className={`${styles.speakerWrapper} ${speakerChanging ? styles.changing : ""
											}`}
									>
										<div className={styles.speaker}>
											<div className={styles.speakerAvatar}>
												{displaySpeaker?.name?.charAt(0) || "?"}
											</div>
											<div>
												<h3>{displaySpeaker?.name || "Brak"}</h3>
												<p>{displaySpeaker?.role || ""}</p>
												{displaySpeaker?.club &&
													displaySpeaker.club !== "Nieznany klub" && (
														<span>{displaySpeaker.club}</span>
													)}
											</div>
										</div>
										<div className={styles.speechTime}>
											Wystąpienie od {displaySpeaker?.time || ""}
										</div>
									</div>
								</div>

								<div className={styles.adminAddSpeaker}>
									<h4>Dodaj nowego mówcę</h4>
									<form
										onSubmit={addCustomSpeaker}
										className={styles.addSpeakerForm}
									>
										<input
											type="text"
											placeholder="Imię i nazwisko"
											value={newSpeakerName}
											onChange={(e) => setNewSpeakerName(e.target.value)}
											className={styles.adminInput}
											required
										/>
										<input
											type="text"
											placeholder="Klub (opcjonalne)"
											value={newSpeakerClub}
											onChange={(e) => setNewSpeakerClub(e.target.value)}
											className={styles.adminInput}
										/>
										<input
											type="text"
											placeholder="Rola (np. Parlamentarzysta)"
											value={newSpeakerRole}
											onChange={(e) => setNewSpeakerRole(e.target.value)}
											className={styles.adminInput}
										/>
										<button type="submit" className={styles.addBtn}>
											Dodaj mówcę
										</button>
									</form>

									<div className={styles.speakerBts}>
										<button
											className={`${styles.navSpeakerBtn} ${styles.previousSpeaker}`}
											onClick={goToPreviousSpeaker}
											disabled={currentSpeakerIndex <= 0}
										>
											<ChevronLeft size={18} /> Poprzedni mówca
										</button>
										<button
											className={`${styles.navSpeakerBtn} ${styles.nextSpeaker}`}
											onClick={goToNextSpeaker}
											disabled={
												currentSpeakerIndex >= plannedSpeakers.length - 1
											}
										>
											Następny mówca <ChevronRight size={18} />
										</button>
									</div>
								</div>
							</div>
						) : (
							<div
								className={`${styles.speakerWrapper} ${speakerChanging ? styles.changing : ""
									}`}
							>
								<div className={styles.speaker}>
									<div className={styles.speakerAvatar}>
										{displaySpeaker?.name?.charAt(0) || "?"}
									</div>
									<div>
										<h3>{displaySpeaker?.name || "Brak"}</h3>
										<p>{displaySpeaker?.role || ""}</p>
										{displaySpeaker?.club &&
											displaySpeaker.club !== "Nieznany klub" && (
												<span>{displaySpeaker.club}</span>
											)}
									</div>
								</div>
								<div className={styles.speechTime}>
									Wystąpienie od {displaySpeaker?.time || ""}
								</div>
							</div>
						)}
					</div>
				)}

				{displayPoint && !isPointDisabled ? (
					<div className={styles.liveCard}>
						<h2 className={styles.liveCardTitle}>AKTUALNY PUNKT</h2>
						<div
							className={`${styles.agendaCurrent} ${pointChanging ? styles.changing : ""
								}`}
						>
							<span>PUNKT {displayPoint.number}</span>
							<h3>{displayPoint.title}</h3>
							<p>{displayPoint.type}</p>
						</div>

						{adminMode && (
							<div className={styles.adminPointActions}>
								{sessionMode === "break" ? (
									<div className={styles.breakControls}>
										<span className={styles.breakInfo}>
											Przerwa do:
											<input
												type="time"
												value={breakEndTime}
												onChange={(e) => setBreakEndTime(e.target.value)}
												className={`${styles.adminInput} ${styles.breakTimeInput}`}
												step="60"
											/>
										</span>
										<button
											className={styles.confirmBtn}
											onClick={confirmBreakEnd}
										>
											Zatwierdź
										</button>
										<button className={styles.cancelBtn} onClick={cancelBreak}>
											Anuluj przerwę
										</button>
									</div>
								) : sessionMode === "zo" ? (
									<div className={styles.breakControls}>
										<span className={styles.breakInfo}>
											Tryb ZO –
											{isEditingZO ? (
												<input
													type="text"
													value={zoContent}
													onChange={(e) => setZoContent(e.target.value)}
													onBlur={saveZOContent}
													onKeyDown={(e) => {
														if (e.key === "Enter") saveZOContent();
													}}
													className={`${styles.adminInput} ${styles.zoContentInput}`}
													autoFocus
												/>
											) : (
												<button
													type="button"
													onClick={toggleZOContentEdit}
													className={styles.zoContentDisplay}
												>
													{zoContent} <Pencil size={14} />
												</button>
											)}
										</span>
										<button className={styles.cancelBtn} onClick={cancelZO}>
											Zakończ ZO
										</button>
									</div>
								) : (
									<>
										<button className={styles.breakBtn} onClick={startBreak}>
											PRZERWA
										</button>
										<button
											className={styles.zoBtn}
											onClick={setOrganizationalTeam}
										>
											ZO
										</button>
										<button
											className={styles.disablePointBtn}
											onClick={disableCurrentPoint}
											title="Wyłącz wyświetlanie aktualnego punktu"
										>
											Wyłącz punkt
										</button>
									</>
								)}
							</div>
						)}
					</div>
				) : (
					adminMode && (
						<div className={styles.liveCard}>
							<h2 className={styles.liveCardTitle}>AKTUALNY PUNKT</h2>
							<div
								className={`${styles.agendaCurrent} ${styles.pointDisabled}`}
							>
								<h3>Wyłączono wyświetlanie punktu</h3>
								<p>Kliknij „Przywróć punkt", aby ponownie pokazać</p>
							</div>
							<div className={styles.adminPointActions}>
								{sessionMode === "break" ? (
									<div className={styles.breakControls}>
										<span className={styles.breakInfo}>
											Przerwa do:
											<input
												type="time"
												value={breakEndTime}
												onChange={(e) => setBreakEndTime(e.target.value)}
												className={`${styles.adminInput} ${styles.breakTimeInput}`}
												step="60"
											/>
										</span>
										<button
											className={styles.confirmBtn}
											onClick={confirmBreakEnd}
										>
											Zatwierdź
										</button>
										<button className={styles.cancelBtn} onClick={cancelBreak}>
											Anuluj przerwę
										</button>
									</div>
								) : sessionMode === "zo" ? (
									<div className={styles.breakControls}>
										<span className={styles.breakInfo}>
											Tryb ZO –
											{isEditingZO ? (
												<input
													type="text"
													value={zoContent}
													onChange={(e) => setZoContent(e.target.value)}
													onBlur={saveZOContent}
													onKeyDown={(e) => {
														if (e.key === "Enter") saveZOContent();
													}}
													className={`${styles.adminInput} ${styles.zoContentInput}`}
													autoFocus
												/>
											) : (
												<button
													type="button"
													onClick={toggleZOContentEdit}
													className={styles.zoContentDisplay}
												>
													{zoContent} <Pencil size={14} />
												</button>
											)}
										</span>
										<button className={styles.cancelBtn} onClick={cancelZO}>
											Zakończ ZO
										</button>
									</div>
								) : (
									<>
										<button className={styles.breakBtn} onClick={startBreak}>
											PRZERWA
										</button>
										<button
											className={styles.zoBtn}
											onClick={setOrganizationalTeam}
										>
											ZO
										</button>
										<button
											className={styles.restorePointBtn}
											onClick={restoreCurrentPoint}
											title="Przywróć aktualny punkt"
										>
											Przywróć punkt
										</button>
									</>
								)}
							</div>
						</div>
					)
				)}
			</section>

			{/* ── HARMONOGRAM ── */}
			<section className={styles.sessionContent}>
				<div className={styles.sessionPanel}>
					<div className={styles.panelHeader}>
						<h2 className={styles.panelTitle}>HARMONOGRAM POSIEDZENIA</h2>
						{adminMode && (
							<div className={styles.adminNav}>
								<button onClick={prevItem} className={styles.navBtn}>
									Poprzedni
								</button>
								<button onClick={nextItem} className={styles.navBtn}>
									Dalej
								</button>
							</div>
						)}
					</div>

					<div className={styles.timeline}>
						{(schedule ?? []).map((item, index) => (
							<div
								className={`${styles.timelineItem} ${styles[item.status] || ""}`}
								key={index}
							>
								<div className={styles.timelineTime}>
									{adminMode ? (
										<input
											type="text"
											value={item.time}
											onChange={(e) => {
												const newSchedule = [...schedule];
												newSchedule[index].time = e.target.value;
												setSchedule(newSchedule);
												updateSessionDebounced({ schedule: newSchedule });
											}}
											className={`${styles.adminInput} ${styles.timeInput}`}
										/>
									) : (
										item.time
									)}
								</div>
								<div className={styles.timelineDot} />
								<div className={styles.timelineContent}>
									{adminMode ? (
										<div className={styles.adminScheduleItem}>
											<input
												type="text"
												value={item.time}
												onChange={(e) => {
													const newSchedule = [...schedule];
													newSchedule[index].time = e.target.value;
													setSchedule(newSchedule);
													updateSessionDebounced({ schedule: newSchedule });
												}}
												className={`${styles.adminInput} ${styles.timeInput}`}
											/>
											<input
												type="text"
												value={item.title}
												onChange={(e) => {
													const newSchedule = [...schedule];
													newSchedule[index].title = e.target.value;
													setSchedule(newSchedule);
													updateSessionDebounced({ schedule: newSchedule });
												}}
												className={`${styles.adminInput} ${styles.titleInput} ${item.status === "crossed" ? styles.crossed : ""
													}`}
											/>
											<div className={styles.adminItemActions}>
												<button
													onClick={() => setActiveItem(index)}
													className={`${styles.actionBtn} ${styles.setActive}`}
													title="Ustaw jako aktywny"
												>
													<Check size={14} />
												</button>
												<button
													onClick={() => toggleCrossItem(index)}
													className={`${styles.actionBtn} ${styles.cross} ${item.status === "crossed" ? styles.active : ""
														}`}
													title="Wykreśl punkt"
												>
													{item.status === "crossed" ? (
														<RotateCcw size={14} />
													) : (
														<Minus size={14} />
													)}
												</button>
												<button
													onClick={() => moveScheduleItem(index, -1)}
													className={`${styles.actionBtn} ${styles.move}`}
													title="Przenieś w górę"
												>
													<ArrowUp size={14} />
												</button>
												<button
													onClick={() => moveScheduleItem(index, 1)}
													className={`${styles.actionBtn} ${styles.move}`}
													title="Przenieś w dół"
												>
													<ArrowDown size={14} />
												</button>
												<button
													onClick={() => removeScheduleItem(index)}
													className={`${styles.actionBtn} ${styles.deleteBtn}`}
													title="Usuń punkt"
												>
													<X size={14} />
												</button>
											</div>
										</div>
									) : (
										<h3
											className={
												item.status === "crossed" ? styles.crossed : ""
											}
										>
											{item.title}
										</h3>
									)}
								</div>
							</div>
						))}
					</div>

					{adminMode && (
						<div className={styles.adminAddPoint}>
							<h4>Dodaj nowy punkt</h4>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									const form = e.target;
									const time = form.time.value;
									const title = form.title.value;
									if (title.trim()) {
										addScheduleItem(time, title);
										form.reset();
									}
								}}
								className={styles.addPointForm}
							>
								<input
									type="text"
									name="time"
									placeholder="Czas (np. 15:30)"
									className={styles.adminInput}
								/>
								<input
									type="text"
									name="title"
									placeholder="Tytuł punktu"
									className={styles.adminInput}
									required
								/>
								<button type="submit" className={styles.addBtn}>
									Dodaj
								</button>
							</form>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}