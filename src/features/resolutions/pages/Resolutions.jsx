import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./resolutions.module.css";
import BackButton from "../../../components/PageBack";

export default function Resolutions() {
	const location = useLocation();
	const navigate = useNavigate();

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
				setSessions(sessionsData);

				const resolutionsRes = await fetch("/newapp/api/resolutions");
				if (!resolutionsRes.ok) throw new Error("Nie udało się pobrać uchwał");
				const resolutionsData = await resolutionsRes.json();
				setResolutions(resolutionsData.resolutions);
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
				<BackButton to="/panel" label="Panel" />
			</header>

			<main className={styles.content}>
				<div className={styles.head}>
					<div className={styles.headText}>
						<span className={styles.eyebrow}>Rejestr</span>
						<h1 className={styles.title}>Uchwały</h1>
						<p className={styles.subtitle}>
							{loading
								? "Ładowanie…"
								: `${filteredResolutions.length} ${
										filteredResolutions.length === 1 ? "uchwała" : "uchwał"
									}`}
						</p>
					</div>

					<div className={styles.filter}>
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
				</div>

				{loading ? (
					<div className={styles.skeletons}>
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className={styles.skeleton} />
						))}
					</div>
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
									<span className={styles.itemEyebrow}>
										{getSessionName(resolution.sessionId)}
									</span>
									<p className={styles.itemTitle}>{resolution.title}</p>
								</div>

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
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
									>
										<path
											d="M5 12h14M13 6l6 6-6 6"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</Link>
							</li>
						))}
					</ul>
				)}
			</main>
		</div>
	);
}
