import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./resolutions.module.css";

const STATUS_LABEL = {
	pending: "Oczekuje",
	accepted: "Przyjęta",
	rejected: "Odrzucona",
};

const STATUS_TONE = {
	pending: "warn",
	accepted: "ok",
	rejected: "bad",
};

function StatusPill({ status }) {
	const tone = STATUS_TONE[status] ?? "neutral";
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

export default function Resolutions() {
	const location = useLocation();

	const [resolutions, setResolutions] = useState([]);
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("all");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);

				const sessionsRes = await fetch("/newapp/api/sessions");
				if (!sessionsRes.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const sessionsData = await sessionsRes.json();
				setSessions(
					Array.isArray(sessionsData)
						? sessionsData
						: (sessionsData.sessions ?? []),
				);

				const resolutionsRes = await fetch("/newapp/api/resolutions");
				if (!resolutionsRes.ok) throw new Error("Nie udało się pobrać uchwał");
				const resolutionsData = await resolutionsRes.json();
				setResolutions(resolutionsData.resolutions ?? []);
			} catch (error) {
				console.error("Błąd podczas pobierania danych:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	useEffect(() => {
		const savedScroll = sessionStorage.getItem("resolutionsScroll");
		if (savedScroll) {
			window.scrollTo(0, Number(savedScroll));
			sessionStorage.removeItem("resolutionsScroll");
		}
	}, [location.pathname]);

	const filteredResolutions = resolutions.filter((resolution) => {
		if (selectedSessionId === "all") return true;
		return resolution.sessionId === Number(selectedSessionId);
	});

	const getSessionName = (sessionId) => {
		const session = sessions.find((s) => s.id === sessionId);
		return session ? session.name : "Nieznane";
	};

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<h1 className={styles.title}>Uchwały</h1>
				<p className={styles.subtitle}>
					{loading
						? "Ładowanie…"
						: `${filteredResolutions.length} ${
								filteredResolutions.length === 1 ? "uchwała" : "uchwał"
							}`}
				</p>
			</header>

			<div className={styles.filters}>
				<label htmlFor="session-select" className={styles.filterLabel}>
					Posiedzenie
				</label>
				<select
					id="session-select"
					value={selectedSessionId}
					onChange={(e) => setSelectedSessionId(e.target.value)}
					className={styles.select}
				>
					<option value="all">Wszystkie posiedzenia</option>
					{sessions.map((session) => (
						<option key={session.id} value={session.id}>
							{session.name} — {session.date}
						</option>
					))}
				</select>
			</div>

			{loading ? (
				<p className={styles.muted}>Ładowanie…</p>
			) : filteredResolutions.length === 0 ? (
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Brak uchwał</p>
					<p className={styles.emptyText}>
						Nie znaleziono uchwał dla wybranego posiedzenia.
					</p>
				</div>
			) : (
				<ul className={styles.list}>
					{filteredResolutions.map((resolution) => (
						<li key={resolution.id} className={styles.item}>
							<div className={styles.itemMain}>
								<div className={styles.itemMeta}>
									<span>{getSessionName(resolution.sessionId)}</span>
									{resolution.party && <span>{resolution.party}</span>}
								</div>
								<Link
									to={`/${resolution.slug}`}
									className={styles.itemTitle}
									onClick={() => {
										sessionStorage.setItem(
											"resolutionsScroll",
											window.scrollY.toString(),
										);
									}}
								>
									{resolution.title}
								</Link>
								<p className={styles.itemDates}>
									{resolution.author && `Autor: ${resolution.author}`}
									{resolution.createdAt && ` · ${resolution.createdAt}`}
									{typeof resolution.signatures === "number" &&
										` · Podpisy: ${resolution.signatures}`}
								</p>
							</div>

							<div className={styles.itemSide}>
								<StatusPill status={resolution.status} />
								<Link
									to={`/${resolution.slug}`}
									className={styles.itemBtn}
									onClick={() => {
										sessionStorage.setItem(
											"resolutionsScroll",
											window.scrollY.toString(),
										);
									}}
								>
									Przeczytaj
								</Link>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
