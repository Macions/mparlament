import { useEffect, useState, useMemo } from "react";
import "./SessionDetails.css";
import BackButton from "../../../components/PageBack";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../socket/SocketProvider";
import {
	Check,
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
	useEffect(() => {
		if (!socket) return;

		const handleZOUpdate = (newZoContent) => {
			console.log("📨 Odebrano nową treść ZO:", newZoContent);
			setZoContent(newZoContent);

			if (sessionMode === "zo" && displayPoint) {
				setDisplayPoint((prev) => ({
					...prev,
					type: newZoContent,
				}));
			}
		};

		socket.on("zoContentUpdated", handleZOUpdate);

		return () => {
			socket.off("zoContentUpdated", handleZOUpdate);
		};
	}, [socket, sessionMode, displayPoint]);

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
			setPlannedSpeakers((prev) => {
				const updated = prev.map((s, i) => {
					if (i === currentSpeakerIndex && s.status === "active") {
						return { ...s, status: "waiting" };
					}
					if (i === prevIndex) {
						return { ...s, status: "active" };
					}
					return s;
				});

				if (socket && isConnected) {
					socket.emit("speakersUpdated", updated);
				}

				return updated;
			});

			setDisplaySpeaker(prevSpeaker);
			setCurrentSpeakerIndex(prevIndex);
			setSpeakerChanging(true);
			setTimeout(() => setSpeakerChanging(false), 400);
			if (socket && isConnected) {
				socket.emit("speakerUpdated", prevSpeaker);
			}
		}
	};
	const goToNextSpeaker = () => {
		if (currentSpeakerIndex >= plannedSpeakers.length - 1) {
			console.log("Brak kolejnego mówcy");
			return;
		}
		const nextIndex = currentSpeakerIndex + 1;
		const nextSpeaker = plannedSpeakers[nextIndex];
		if (nextSpeaker) {
			setPlannedSpeakers((prev) => {
				const updated = prev.map((s, i) => {
					if (i === currentSpeakerIndex && s.status === "active") {
						return { ...s, status: "done" };
					}
					if (i === nextIndex) {
						return { ...s, status: "active" };
					}
					return s;
				});

				if (socket && isConnected) {
					socket.emit("speakersUpdated", updated);
				}

				return updated;
			});

			setDisplaySpeaker(nextSpeaker);
			setCurrentSpeakerIndex(nextIndex);
			setSpeakerChanging(true);
			setTimeout(() => setSpeakerChanging(false), 400);
			if (socket && isConnected) {
				socket.emit("speakerUpdated", nextSpeaker);
			}
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
			console.log(
				"📊 ustawiam planowanych mówców z",
				history.length,
				"mówcami",
			);
			setPlannedSpeakers(history);
			setCurrentSpeakerIndex(0);
			setDisplaySpeaker(history[0]);
		}
	}, [speakers]);

	const markSpeakerDone = (index) => {
		const updated = [...plannedSpeakers];
		updated[index].status = "done";
		setPlannedSpeakers(updated);

		if (socket && isConnected) {
			socket.emit("speakersUpdated", updated);
		}
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
		if (socket && isConnected) {
			socket.emit("speakersUpdated", updated);
		}
	};

	const removeSpeaker = (index) => {
		if (
			window.confirm(
				`Czy na pewno usunąć mówcę ${plannedSpeakers[index].name}?`,
			)
		) {
			const updated = plannedSpeakers.filter((_, i) => i !== index);
			setPlannedSpeakers(updated);
			if (currentSpeakerIndex >= updated.length) {
				setCurrentSpeakerIndex(updated.length - 1);
			}

			if (socket && isConnected) {
				socket.emit("speakersUpdated", updated);
			}
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
			if (socket && isConnected) {
				socket.emit("speakersUpdated", updated);
			}
		}
	};
	useEffect(() => {
		async function fetchUser() {
			try {
				const response = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const user = await response.json();
					setUserRole(user.role);
					const authorized = user.role === "admin" || user.role === "marshal";
					setIsAuthorized(authorized);
					setAdminMode(authorized);
				}
			} catch (err) {
				console.error("Błąd pobierania użytkownika:", err);
			}
		}
		fetchUser();
	}, [token]);

	useEffect(() => {
		if (session) {
			setDisplaySpeaker(session.currentSpeaker);
			setDisplayPoint(session.currentPoint);
			setSchedule(session.schedule);
			setStatus(session.status);
			setTitle(session.title);
			setDate(session.date);

			if (session.zoContent) {
				setZoContent(session.zoContent);
			}
		}
	}, [session]);

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
				if (!parlRes.ok) throw new Error("Nie udało się pobrać parlamentarzystów");
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
			setSession(data);
		} catch (err) {
			setError(err.message);
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

	const selectSpeaker = (name) => {
		if (!name.trim()) return;

		if (sessionMode === "break") cancelBreak();
		if (sessionMode === "zo") cancelZO();
		const data = getSpeakerData(name, customSpeakers);
		const newSpeaker = {
			name: name.trim(),
			club: data.club || "",
			role: data.role || "Parlamentarzysta",
			time: getCurrentTime(),
			status: "active",
		};

		setPlannedSpeakers((prev) => {
			const updated = prev.map((s) => {
				if (s.status === "active") {
					return { ...s, status: "done" };
				}
				return s;
			});
			const result = [...updated, newSpeaker];

			if (socket && isConnected) {
				socket.emit("speakersUpdated", result);
			}

			return result;
		});

		setCurrentSpeakerIndex((prev) => {
			const newIndex = plannedSpeakers.length;
			return newIndex;
		});

		setDisplaySpeaker(newSpeaker);
		setSpeakerChanging(true);
		setTimeout(() => setSpeakerChanging(false), 400);
		setSessionMode("normal");
		setDraftSpeakerName("");
		setShowSuggestions(false);

		if (socket && isConnected) {
			socket.emit("speakerUpdated", newSpeaker);
		}
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

		setNewSpeakerName("");
		setNewSpeakerClub("");
		setNewSpeakerRole("Parlamentarzysta");

		const updatedSpeakers = [...speakers, speakerData];
		if (socket && isConnected) {
			socket.emit("speakersUpdated", updatedSpeakers);
		}
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

		setDisplayPoint((prev) => ({
			...prev,
			title: `Przerwa do ${breakEndTime}`,
		}));
		setPointChanging(true);
		setTimeout(() => setPointChanging(false), 400);
	};

	const cancelBreak = () => {
		if (sessionMode !== "break" || !scheduleBackup) return;

		setSchedule(scheduleBackup);
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
	};

	const addScheduleItem = (time, title) => {
		if (!title.trim()) return;
		const newItem = {
			time: time || "Nowy",
			title: title.trim(),
			status: "waiting",
		};
		setSchedule((prev) => {
			if (!time || time === "Nowy") {
				return [...prev, newItem];
			}
			const newMinutes = parseTimeToMinutes(time);
			let insertIndex = prev.length;
			for (let i = prev.length - 1; i >= 0; i--) {
				const currentMinutes = parseTimeToMinutes(prev[i].time);
				if (currentMinutes <= newMinutes) {
					insertIndex = i + 1;
					break;
				}
			}
			const newSchedule = [...prev];
			newSchedule.splice(insertIndex, 0, newItem);
			return newSchedule;
		});
	};

	const removeScheduleItem = (index) => {
		if (window.confirm("Czy na pewno usunąć ten punkt?")) {
			setSchedule((prev) => prev.filter((_, i) => i !== index));
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
	};

	const setActiveItem = (index) => {
		if (sessionMode === "zo") return;
		const newSchedule = schedule.map((item, i) => {
			if (i < index) return { ...item, status: "done" };
			if (i === index) return { ...item, status: "active" };
			return { ...item, status: "waiting" };
		});
		setSchedule(newSchedule);
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

			if (socket && isConnected) {
				socket.emit("zoContentUpdated", zoContent);
				console.log("📤 Wysłano aktualizację ZO:", zoContent);
			}
		}
	};

	useEffect(() => {
		if (!socket) return;

		const handleScheduleUpdate = (newSchedule) => {
			console.log("📨 Odebrano nowy harmonogram");
			setSchedule(newSchedule);
		};

		const handleSpeakerUpdate = (newSpeaker) => {
			console.log("📨 Odebrano nowego mówcę");
			setDisplaySpeaker(newSpeaker);
		};

		const handleSpeakersUpdate = (newSpeakers) => {
			console.log("📨 Odebrano zaktualizowaną listę mówców");
			setPlannedSpeakers(newSpeakers);
		};

		socket.on("scheduleUpdated", handleScheduleUpdate);
		socket.on("speakerUpdated", handleSpeakerUpdate);
		socket.on("speakersUpdated", handleSpeakersUpdate);

		return () => {
			socket.off("scheduleUpdated", handleScheduleUpdate);
			socket.off("speakerUpdated", handleSpeakerUpdate);
			socket.off("speakersUpdated", handleSpeakersUpdate);
		};
	}, [socket]);
	const speakerNames = Object.keys(allSpeakers);
	const filteredSpeakers = speakerNames.filter((name) =>
		name.toLowerCase().includes(draftSpeakerName.toLowerCase()),
	);

	const showSpeaker = sessionMode !== "break" && displaySpeaker !== null;

	return (
		<div className="session-page">
			<div className="session-top-bar">
				<BackButton to="/panel" label="Panel" />
				{isConnected ? (
					<span className="ws-status connected">
						<span className="circle-ws-status"></span>Połączono
					</span>
				) : (
					<span className="ws-status disconnected">
						<span className="circle-ws-status"></span>Rozłączono
					</span>
				)}
			</div>
			<header className="session-header">
				<div>
					<h1>{title}</h1>
					<p className="session-date">{date}</p>
				</div>
				{isAuthorized && (
					<div className="admin-toggle-container">
						<span className="admin-toggle-label">
							{adminMode ? "Tryb Admina" : "Tryb Użytkownika"}
						</span>
						<label className="admin-toggle">
							<input
								type="checkbox"
								checked={adminMode}
								onChange={() => setAdminMode(!adminMode)}
							/>
							<span className="admin-toggle-slider"></span>
						</label>
					</div>
				)}
			</header>
			{plannedSpeakers.length > 0 && (
				<section className="speaker-history-section">
					<div className="speaker-history-header">
						<h3>Planowani mówcy</h3>
						<span className="speaker-count">
							{plannedSpeakers.filter((s) => s.status !== "done").length} /{" "}
							{plannedSpeakers.length} pozostało
						</span>
					</div>
					<div className="speaker-history-list">
						{plannedSpeakers.map((speaker, index) => (
							<div
								key={index}
								className={`speaker-history-item ${speaker.status === "active" ? "active" : ""} ${speaker.status === "done" ? "done" : ""}`}
							>
								<div className="speaker-history-avatar">
									{speaker.name.charAt(0)}
								</div>
								<div className="speaker-history-info">
									{adminMode ? (
										<>
											<input
												type="text"
												value={speaker.name}
												onChange={(e) =>
													editSpeaker(index, "name", e.target.value)
												}
												className={`admin-input speaker-edit-input ${speaker.status === "done" ? "crossed" : ""}`}
											/>
											<input
												type="text"
												value={speaker.role || ""}
												onChange={(e) =>
													editSpeaker(index, "role", e.target.value)
												}
												className="admin-input speaker-edit-input speaker-role-input"
											/>
										</>
									) : (
										<>
											<div
												className={`speaker-history-name ${speaker.status === "done" ? "crossed" : ""}`}
											>
												{speaker.name}
											</div>
											<div className="speaker-history-role">{speaker.role}</div>
										</>
									)}
								</div>
								{speaker.status === "done" && (
									<span className="speaker-history-status done">✓</span>
								)}
								{speaker.status === "active" && (
									<span className="speaker-history-status active">●</span>
								)}
								{speaker.status === "waiting" && (
									<span className="speaker-history-status waiting">○</span>
								)}
								<div className="speaker-history-time">{speaker.time}</div>
								{adminMode && (
									<div className="speaker-actions">
										{speaker.status !== "done" && (
											<button
												onClick={() => markSpeakerDone(index)}
												className="speaker-action-btn done-btn"
												title="Oznacz jako zrealizowane"
											>
												<Check size={14} />
											</button>
										)}
										{speaker.status === "done" && (
											<button
												onClick={() => markSpeakerActive(index)}
												className="speaker-action-btn active-btn"
												title="Przywróć"
											>
												<RotateCcw size={14} />
											</button>
										)}
										<button
											onClick={() => removeSpeaker(index)}
											className="speaker-action-btn delete-btn"
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
			<section className="session-live">
				{showSpeaker && (
					<div className="live-card">
						<h2>AKTUALNIE MÓWI</h2>
						{adminMode ? (
							<div className="admin-speaker-edit">
								<div className="autocomplete-wrapper">
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
										className="admin-input"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												selectSpeaker(draftSpeakerName);
											}
										}}
									/>
									{showSuggestions && filteredSpeakers.length > 0 && (
										<ul className="suggestions-list">
											{filteredSpeakers.map((name) => (
												<li key={name} onMouseDown={() => selectSpeaker(name)}>
													{name}
												</li>
											))}
										</ul>
									)}
								</div>
								<div className="admin-speaker-preview">
									<div
										className={`speaker-wrapper ${speakerChanging ? "changing" : ""}`}
									>
										<div className="speaker">
											<div className="speaker-avatar">
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
										<div className="speech-time">
											Wystąpienie od {displaySpeaker?.time || ""}
										</div>
									</div>
								</div>

								<div className="admin-add-speaker">
									<h4>Dodaj nowego mówcę</h4>
									<form
										onSubmit={addCustomSpeaker}
										className="add-speaker-form"
									>
										<input
											type="text"
											placeholder="Imię i nazwisko"
											value={newSpeakerName}
											onChange={(e) => setNewSpeakerName(e.target.value)}
											className="admin-input"
											required
										/>
										<input
											type="text"
											placeholder="Klub (opcjonalne)"
											value={newSpeakerClub}
											onChange={(e) => setNewSpeakerClub(e.target.value)}
											className="admin-input"
										/>
										<input
											type="text"
											placeholder="Rola (np. Parlamentarzysta)"
											value={newSpeakerRole}
											onChange={(e) => setNewSpeakerRole(e.target.value)}
											className="admin-input"
										/>
										<button type="submit" className="add-btn">
											Dodaj mówcę
										</button>
									</form>
									<div className="speakerBts">
										<button
											className="previous-speaker"
											onClick={goToPreviousSpeaker}
											disabled={currentSpeakerIndex <= 0}
										>
											<ChevronLeft size={18} /> Poprzedni mówca
										</button>
										<button
											className="next-speaker"
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
								className={`speaker-wrapper ${speakerChanging ? "changing" : ""}`}
							>
								<div className="speaker">
									<div className="speaker-avatar">
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
								<div className="speech-time">
									Wystąpienie od {displaySpeaker?.time || ""}
								</div>
							</div>
						)}
					</div>
				)}

				{displayPoint && !isPointDisabled ? (
					<div className="live-card">
						<h2>AKTUALNY PUNKT</h2>
						<div
							className={`agenda-current ${pointChanging ? "changing" : ""}`}
						>
							<span>PUNKT {displayPoint.number}</span>
							<h3>{displayPoint.title}</h3>
							<p>{displayPoint.type}</p>
						</div>
						{adminMode && (
							<div className="admin-point-actions">
								{sessionMode === "break" ? (
									<div className="break-controls">
										<span className="break-info">
											Przerwa do:
											<input
												type="time"
												value={breakEndTime}
												onChange={(e) => setBreakEndTime(e.target.value)}
												className="admin-input break-time-input"
												step="60"
											/>
										</span>
										<button className="confirm-btn" onClick={confirmBreakEnd}>
											Zatwierdź
										</button>
										<button className="cancel-btn" onClick={cancelBreak}>
											Anuluj przerwę
										</button>
									</div>
								) : sessionMode === "zo" ? (
									<div className="break-controls">
										<span className="break-info">
											Tryb ZO -
											{isEditingZO ? (
												<input
													type="text"
													value={zoContent}
													onChange={(e) => setZoContent(e.target.value)}
													onBlur={saveZOContent}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															saveZOContent();
														}
													}}
													className="admin-input zo-content-input"
													autoFocus
												/>
											) : (
												<span
													onClick={toggleZOContentEdit}
													className="zo-content-display"
												>
													{zoContent}
												</span>
											)}
										</span>
										<button className="cancel-btn" onClick={cancelZO}>
											Zakończ ZO
										</button>
									</div>
								) : (
									<>
										<button className="break-btn" onClick={startBreak}>
											PRZERWA
										</button>
										<button className="zo-btn" onClick={setOrganizationalTeam}>
											ZO
										</button>
										<button
											className="disable-point-btn"
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
						<div className="live-card">
							<h2>AKTUALNY PUNKT</h2>
							<div className="agenda-current point-disabled">
								<h3>Wyłączono wyświetlanie punktu</h3>
								<p>Kliknij "Przywróć punkt" aby ponownie pokazać</p>
							</div>
							<div className="admin-point-actions">
								{sessionMode === "break" ? (
									<div className="break-controls">
										<span className="break-info">
											Przerwa do:
											<input
												type="time"
												value={breakEndTime}
												onChange={(e) => setBreakEndTime(e.target.value)}
												className="admin-input break-time-input"
												step="60"
											/>
										</span>
										<button className="confirm-btn" onClick={confirmBreakEnd}>
											Zatwierdź
										</button>
										<button className="cancel-btn" onClick={cancelBreak}>
											Anuluj przerwę
										</button>
									</div>
								) : sessionMode === "zo" ? (
									<div className="break-controls">
										<span className="break-info">
											Tryb ZO –
											{isEditingZO ? (
												<input
													type="text"
													value={zoContent}
													onChange={(e) => setZoContent(e.target.value)}
													onBlur={saveZOContent}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															saveZOContent();
														}
													}}
													className="admin-input zo-content-input"
													autoFocus
												/>
											) : (
												<span
													onClick={toggleZOContentEdit}
													className="zo-content-display"
												>
													{zoContent} ✏️
												</span>
											)}
										</span>
										<button className="cancel-btn" onClick={cancelZO}>
											Zakończ ZO
										</button>
									</div>
								) : (
									<>
										<button className="break-btn" onClick={startBreak}>
											PRZERWA
										</button>
										<button className="zo-btn" onClick={setOrganizationalTeam}>
											ZO
										</button>
										<button
											className="restore-point-btn"
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

			<section className="session-content">
				<div className="session-panel">
					<div className="panel-header">
						<h2>HARMONOGRAM POSIEDZENIA</h2>
						{adminMode && (
							<div className="admin-nav">
								<button onClick={prevItem} className="nav-btn">
									Poprzedni
								</button>
								<button onClick={nextItem} className="nav-btn">
									Dalej
								</button>
							</div>
						)}
					</div>

					<div className="timeline">
						{schedule.map((item, index) => (
							<div className={`timeline-item ${item.status}`} key={index}>
								<div className="timeline-time">
									{adminMode ? (
										<input
											type="text"
											value={item.time}
											onChange={(e) => {
												const newSchedule = [...schedule];
												newSchedule[index].time = e.target.value;
												setSchedule(newSchedule);
											}}
											className="admin-input time-input"
										/>
									) : (
										item.time
									)}
								</div>
								<div className="timeline-dot"></div>
								<div className="timeline-content">
									{adminMode ? (
										<div className="admin-schedule-item">
											<input
												type="text"
												value={item.time}
												onChange={(e) => {
													const newSchedule = [...schedule];
													newSchedule[index].time = e.target.value;
													setSchedule(newSchedule);
												}}
												className="admin-input time-input"
											/>
											<input
												type="text"
												value={item.title}
												onChange={(e) => {
													const newSchedule = [...schedule];
													newSchedule[index].title = e.target.value;
													setSchedule(newSchedule);
												}}
												className={`admin-input title-input ${item.status === "crossed" ? "crossed" : ""}`}
											/>
											<div className="admin-item-actions">
												<button
													onClick={() => setActiveItem(index)}
													className="action-btn set-active"
													title="Ustaw jako aktywny"
												></button>
												<button
													onClick={() => toggleCrossItem(index)}
													className={`action-btn cross ${item.status === "crossed" ? "active" : ""}`}
													title="Wykreśl punkt"
												>
													{item.status === "crossed" ? "↻" : "—"}
												</button>
												<button
													onClick={() => moveScheduleItem(index, -1)}
													className="action-btn move"
													title="Przenieś w górę"
												>
													↑
												</button>
												<button
													onClick={() => moveScheduleItem(index, 1)}
													className="action-btn move"
													title="Przenieś w dół"
												>
													↓
												</button>
												<button
													onClick={() => removeScheduleItem(index)}
													className="action-btn delete"
													title="Usuń punkt"
												>
													✕
												</button>
											</div>
										</div>
									) : (
										<h3 className={item.status === "crossed" ? "crossed" : ""}>
											{item.title}
										</h3>
									)}
								</div>
							</div>
						))}
					</div>

					{adminMode && (
						<div className="admin-add-point">
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
								className="add-point-form"
							>
								<input
									type="text"
									name="time"
									placeholder="Czas (np. 15:30)"
									className="admin-input"
								/>
								<input
									type="text"
									name="title"
									placeholder="Tytuł punktu"
									className="admin-input"
									required
								/>
								<button type="submit" className="add-btn">
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
