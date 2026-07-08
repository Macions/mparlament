import { useEffect, useState } from "react";
import "./SessionDetails.css";

// Bazowa lista mówców
const defaultSpeakers = {
    "Jan Kowalski": { club: "Klub Parlamentarny Czas Młodych", role: "Parlamentarzysta" },
    "Anna Nowak": { club: "Klub Obywatelski", role: "Parlamentarzystka" },
    "Piotr Wiśniewski": { club: "Klub Niezależnych", role: "Parlamentarzysta" },
    "Maria Lewandowska": { club: "Klub Lewicy", role: "Parlamentarzystka" },
    "Tomasz Zieliński": { club: "Klub Centrum", role: "Parlamentarzysta" },
};

const getSpeakerData = (name, customSpeakers) => {
    if (customSpeakers && customSpeakers[name]) {
        return customSpeakers[name];
    }
    return defaultSpeakers[name] || { club: "", role: "Parlamentarzysta" };
};

const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

const initialSession = {
    title: "III POSIEDZENIE PARLAMENTU",
    date: "08.07.2026",
    status: "TRWA",
    currentSpeaker: {
        name: "Jan Kowalski",
        club: "Klub Parlamentarny Czas Młodych",
        role: "Parlamentarzysta",
        time: "12:45",
    },
    currentPoint: {
        number: "2",
        title: "Debata nad ustawą o cyfryzacji administracji",
        type: "Dyskusja",
    },
    schedule: [
        { time: "10:00", title: "Otwarcie posiedzenia", status: "done" },
        { time: "10:30", title: "Sprawozdanie komisji", status: "done" },
        { time: "12:00", title: "Debata nad ustawą o cyfryzacji administracji", status: "active" },
        { time: "14:00", title: "Głosowania", status: "waiting" },
    ],
};

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr.includes("Przerwa") || timeStr.includes("Nowy")) return Infinity;
    const parts = timeStr.split(":");
    if (parts.length !== 2) return Infinity;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return Infinity;
    return hours * 60 + minutes;
};

export default function SessionDetails() {
    const isAdmin = true;

    const [customSpeakers, setCustomSpeakers] = useState({});
    const allSpeakers = { ...defaultSpeakers, ...customSpeakers };

    // Stan wyświetlany
    const [displaySpeaker, setDisplaySpeaker] = useState(initialSession.currentSpeaker);
    const [displayPoint, setDisplayPoint] = useState(initialSession.currentPoint);
    const [schedule, setSchedule] = useState(initialSession.schedule);
    const [status, setStatus] = useState(initialSession.status);
    const [title, setTitle] = useState(initialSession.title);
    const [date, setDate] = useState(initialSession.date);

    // Tryb sesji: 'normal' | 'break' | 'zo'
    const [sessionMode, setSessionMode] = useState('normal');
    // Kopia harmonogramu i aktywności do przywrócenia
    const [scheduleBackup, setScheduleBackup] = useState(null);
    const [activeIndexBackup, setActiveIndexBackup] = useState(null);

    // Stan mówcy w edycji
    const [draftSpeakerName, setDraftSpeakerName] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Stan dla nowego mówcy
    const [newSpeakerName, setNewSpeakerName] = useState("");
    const [newSpeakerClub, setNewSpeakerClub] = useState("");
    const [newSpeakerRole, setNewSpeakerRole] = useState("Parlamentarzysta");

    // Stan przerwy
    const [breakEndTime, setBreakEndTime] = useState("");
    const [breakStartTime, setBreakStartTime] = useState("");

    // Flagi animacji
    const [speakerChanging, setSpeakerChanging] = useState(false);
    const [pointChanging, setPointChanging] = useState(false);

    // Synchronizacja punktu z aktywnym elementem harmonogramu (tylko w trybie normalnym)
    useEffect(() => {
        if (sessionMode !== 'normal') return;
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

    // Wybór mówcy (z listy lub Enter)
    const selectSpeaker = (name) => {
        if (!name.trim()) return;
        // Jeśli jesteśmy w trybie przerwy lub ZO, anuluj
        if (sessionMode === 'break') cancelBreak();
        if (sessionMode === 'zo') cancelZO();
        const data = getSpeakerData(name, customSpeakers);
        const newSpeaker = {
            name: name.trim(),
            club: data.club || "",
            role: data.role || "Parlamentarzysta",
            time: getCurrentTime(),
        };
        setDisplaySpeaker(newSpeaker);
        setSpeakerChanging(true);
        setTimeout(() => setSpeakerChanging(false), 400);
        setDraftSpeakerName("");
        setShowSuggestions(false);
        setSessionMode('normal');
    };

    // Dodawanie niestandardowego mówcy
    const addCustomSpeaker = (e) => {
        e.preventDefault();
        const name = newSpeakerName.trim();
        if (!name) return;
        if (allSpeakers[name]) {
            alert("Taki mówca już istnieje!");
            return;
        }
        const club = newSpeakerClub.trim() || "";
        const role = newSpeakerRole.trim() || "Parlamentarzysta";
        setCustomSpeakers((prev) => ({
            ...prev,
            [name]: { club, role },
        }));
        setNewSpeakerName("");
        setNewSpeakerClub("");
        setNewSpeakerRole("Parlamentarzysta");
    };

    // --- PRZERWA ---
    const startBreak = () => {
        if (sessionMode === 'break') return;
        // Zapamiętaj obecny harmonogram i aktywność
        const activeIdx = schedule.findIndex(item => item.status === 'active');
        setScheduleBackup([...schedule]);
        setActiveIndexBackup(activeIdx);

        const now = getCurrentTime();
        setBreakStartTime(now);
        const end = new Date();
        end.setMinutes(end.getMinutes() + 15);
        const endStr = end.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        setBreakEndTime(endStr);

        // Tworzymy nowy punkt "Przerwa" z czasem rozpoczęcia
        const breakItem = { time: now, title: "Przerwa", status: "waiting" };

        // Wstawiamy w odpowiednie miejsce chronologiczne
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

        // Ustawiamy statusy: przed przerwą -> done, przerwa -> active, po -> waiting
        const updatedSchedule = newSchedule.map((item, idx) => {
            if (idx < insertIndex) return { ...item, status: "done" };
            if (idx === insertIndex) return { ...item, status: "active" };
            return { ...item, status: "waiting" };
        });

        setSchedule(updatedSchedule);

        // Ustaw punkt wyświetlany na przerwę
        const breakPoint = {
            number: "PRZERWA",
            title: "Przerwa",
            type: `do ${endStr}`,
        };
        setDisplayPoint(breakPoint);
        setPointChanging(true);
        setTimeout(() => setPointChanging(false), 400);

        // Ukrywamy mówcę
        setDisplaySpeaker(null);
        setSessionMode('break');
    };

    const confirmBreakEnd = () => {
        if (!breakEndTime) return;
        // Aktualizujemy tytuł punktu przerwy w harmonogramie
        const updatedSchedule = schedule.map(item => {
            if (item.status === 'active') {
                return { ...item, title: `Przerwa do ${breakEndTime}` };
            }
            return item;
        });
        setSchedule(updatedSchedule);
        // Aktualizujemy displayPoint
        setDisplayPoint(prev => ({
            ...prev,
            title: `Przerwa do ${breakEndTime}`,
        }));
        setPointChanging(true);
        setTimeout(() => setPointChanging(false), 400);
    };

    const cancelBreak = () => {
        if (sessionMode !== 'break' || !scheduleBackup) return;
        // Przywracamy zapisany harmonogram
        setSchedule(scheduleBackup);
        setScheduleBackup(null);
        setActiveIndexBackup(null);
        setBreakEndTime("");
        setBreakStartTime("");
        setSessionMode('normal');
        // Przywracamy punkt i mówcę z backupu (lub domyślne)
        // Ponieważ backup zawiera harmonogram, ale nie przechowuje mówcy, odtwarzamy z initialSession lub ostatniego wybranego
        setDisplaySpeaker(initialSession.currentSpeaker);
        setDisplayPoint(initialSession.currentPoint);
        setSpeakerChanging(true);
        setTimeout(() => setSpeakerChanging(false), 400);
        setPointChanging(true);
        setTimeout(() => setPointChanging(false), 400);
    };

    // --- ZO ---
    const setOrganizationalTeam = () => {
        if (sessionMode === 'zo') return;
        // Jeśli w trybie przerwy, anuluj przerwę
        if (sessionMode === 'break') cancelBreak();

        // Zapamiętuj harmonogram i aktywność
        const activeIdx = schedule.findIndex(item => item.status === 'active');
        setScheduleBackup([...schedule]);
        setActiveIndexBackup(activeIdx);

        // Tymczasowo usuń aktywność (ustaw wszystkie jako 'waiting')
        const neutralSchedule = schedule.map(item => ({ ...item, status: 'waiting' }));
        setSchedule(neutralSchedule);

        // Ustaw punkt i mówcę ZO
        const zoPoint = {
            number: "ZO",
            title: "Zespół Organizacyjny",
            type: "Sprawdzanie obecności",
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
        setSessionMode('zo');
        setDraftSpeakerName("");
        setShowSuggestions(false);
    };

    const cancelZO = () => {
        if (sessionMode !== 'zo' || !scheduleBackup) return;
        // Przywracamy zapisany harmonogram
        setSchedule(scheduleBackup);
        setScheduleBackup(null);
        setActiveIndexBackup(null);
        setSessionMode('normal');
        // Przywracamy punkt i mówcę z backupu (lub domyślne)
        setDisplaySpeaker(initialSession.currentSpeaker);
        setDisplayPoint(initialSession.currentPoint);
        setSpeakerChanging(true);
        setTimeout(() => setSpeakerChanging(false), 400);
        setPointChanging(true);
        setTimeout(() => setPointChanging(false), 400);
    };

    // Funkcje harmonogramu (dodawanie, usuwanie, przesuwanie, ustawianie aktywnego, nawigacja)
    const addScheduleItem = (time, title) => {
        if (!title.trim()) return;
        const newItem = { time: time || "Nowy", title: title.trim(), status: "waiting" };
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
        // Jeśli jesteśmy w trybie ZO, nie zmieniamy aktywności (neutral)
        if (sessionMode === 'zo') return;
        const newSchedule = schedule.map((item, i) => {
            if (i < index) return { ...item, status: "done" };
            if (i === index) return { ...item, status: "active" };
            return { ...item, status: "waiting" };
        });
        setSchedule(newSchedule);
    };

    const nextItem = () => {
        if (sessionMode === 'zo') return;
        const activeIndex = schedule.findIndex((item) => item.status === "active");
        if (activeIndex < schedule.length - 1) {
            setActiveItem(activeIndex + 1);
        }
    };

    const prevItem = () => {
        if (sessionMode === 'zo') return;
        const activeIndex = schedule.findIndex((item) => item.status === "active");
        if (activeIndex > 0) {
            setActiveItem(activeIndex - 1);
        }
    };

    const speakerNames = Object.keys(allSpeakers);
    const filteredSpeakers = speakerNames.filter((name) =>
        name.toLowerCase().includes(draftSpeakerName.toLowerCase())
    );

    // Czy pokazywać kartę mówcy? – tylko gdy nie ma przerwy
    const showSpeaker = sessionMode !== 'break' && displaySpeaker !== null;

    return (
        <div className="session-page">
            <header className="session-header">
                <div>
                    <p className="session-status">● {status}</p>
                    <h1>{title}</h1>
                    <p className="session-date">{date}</p>
                </div>
            </header>

            <section className="session-live">
                {/* Karta mówcy – ukryta tylko w trybie 'break' */}
                {showSpeaker && (
                    <div className="live-card">
                        <h2>AKTUALNIE MÓWI</h2>
                        {isAdmin ? (
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
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                                    <div className={`speaker-wrapper ${speakerChanging ? "changing" : ""}`}>
                                        <div className="speaker">
                                            <div className="speaker-avatar">
                                                {displaySpeaker?.name?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                                <h3>{displaySpeaker?.name || "Brak"}</h3>
                                                <p>{displaySpeaker?.role || ""}</p>
                                                {displaySpeaker?.club && displaySpeaker.club !== "Nieznany klub" && (
                                                    <span>{displaySpeaker.club}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="speech-time">
                                            Wystąpienie od {displaySpeaker?.time || ""}
                                        </div>
                                    </div>
                                </div>
                                {/* Formularz dodawania mówcy */}
                                <div className="admin-add-speaker">
                                    <h4>Dodaj nowego mówcę</h4>
                                    <form onSubmit={addCustomSpeaker} className="add-speaker-form">
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
                                        <button type="submit" className="add-btn">Dodaj mówcę</button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className={`speaker-wrapper ${speakerChanging ? "changing" : ""}`}>
                                <div className="speaker">
                                    <div className="speaker-avatar">
                                        {displaySpeaker?.name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <h3>{displaySpeaker?.name || "Brak"}</h3>
                                        <p>{displaySpeaker?.role || ""}</p>
                                        {displaySpeaker?.club && displaySpeaker.club !== "Nieznany klub" && (
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

                {/* Karta aktualnego punktu z przyciskami */}
                <div className="live-card">
                    <h2>AKTUALNY PUNKT</h2>
                    <div className={`agenda-current ${pointChanging ? "changing" : ""}`}>
                        <span>PUNKT {displayPoint.number}</span>
                        <h3>{displayPoint.title}</h3>
                        <p>{displayPoint.type}</p>
                    </div>
                    {isAdmin && (
                        <div className="admin-point-actions">
                            {sessionMode === 'break' ? (
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
                            ) : sessionMode === 'zo' ? (
                                <div className="break-controls">
                                    <span className="break-info">Tryb ZO – harmonogram neutralny</span>
                                    <button className="cancel-btn" onClick={cancelZO}>
                                        Zakończ ZO
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button className="break-btn" onClick={startBreak}>
                                        ⏸️ PRZERWA
                                    </button>
                                    <button className="zo-btn" onClick={setOrganizationalTeam}>
                                        ZO
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Harmonogram */}
            <section className="session-content">
                <div className="session-panel">
                    <div className="panel-header">
                        <h2>HARMONOGRAM POSIEDZENIA</h2>
                        {isAdmin && (
                            <div className="admin-nav">
                                <button onClick={prevItem} className="nav-btn">◀ Poprzedni</button>
                                <button onClick={nextItem} className="nav-btn">Dalej ▶</button>
                            </div>
                        )}
                    </div>

                    <div className="timeline">
                        {schedule.map((item, index) => (
                            <div className={`timeline-item ${item.status}`} key={index}>
                                <div className="timeline-time">
                                    {isAdmin ? (
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
                                    {isAdmin ? (
                                        <div className="admin-schedule-item">
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) => {
                                                    const newSchedule = [...schedule];
                                                    newSchedule[index].title = e.target.value;
                                                    setSchedule(newSchedule);
                                                }}
                                                className="admin-input title-input"
                                            />
                                            <div className="admin-item-actions">
                                                <button onClick={() => setActiveItem(index)} className="action-btn set-active" title="Ustaw jako aktywny">⏺</button>
                                                <button onClick={() => moveScheduleItem(index, -1)} className="action-btn move" title="Przenieś w górę">↑</button>
                                                <button onClick={() => moveScheduleItem(index, 1)} className="action-btn move" title="Przenieś w dół">↓</button>
                                                <button onClick={() => removeScheduleItem(index)} className="action-btn delete" title="Usuń punkt">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <h3>{item.title}</h3>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isAdmin && (
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
                                <input type="text" name="time" placeholder="Czas (np. 15:30)" className="admin-input" />
                                <input type="text" name="title" placeholder="Tytuł punktu" className="admin-input" required />
                                <button type="submit" className="add-btn">Dodaj</button>
                            </form>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}