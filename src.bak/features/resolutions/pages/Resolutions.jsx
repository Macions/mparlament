import { useEffect, useMemo, useState } from "react";
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

function formatDate(iso) {
	if (!iso) return null;
	// "2026-09-17" → "17.09.2026"
	const [y, m, d] = iso.split("-");
	if (!y || !m || !d) return iso;
	return `${d}.${m}.${y}`;
}

function pluralize(n, one, few, many) {
	if (n === 1) return one;
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
	return many;
}

export default function Resolutions() {
	const location = useLocation();

	const [resolutions, setResolutions] = useState([]);
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState("newest");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);
				setError("");

				const token = localStorage.getItem("token");
				const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

				const sessionsRes = await fetch("/api/sessions", {
					headers: authHeaders,
				});
				if (!sessionsRes.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const sessionsData = await sessionsRes.json();
				setSessions(
					Array.isArray(sessionsData)
						? sessionsData
						: (sessionsData.sessions ?? []),
				);

				const resolutionsRes = await fetch("/api/resolutions", {
					headers: authHeaders,
				});
				if (!resolutionsRes.ok) throw new Error("Nie udało się pobrać uchwał");
				const resolutionsData = await resolutionsRes.json();
				setResolutions(
					Array.isArray(resolutionsData)
						? resolutionsData
						: (resolutionsData.resolutions ?? []),
				);
			} catch (err) {
				setError(err.message);
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

	const sessionNameById = useMemo(() => {
		const map = new Map();
		sessions.forEach((s) => map.set(s.id, s.name));
		return map;
	}, [sessions]);

	const getSessionName = (sessionId) => {
		if (sessionId == null) return "Bez posiedzenia";
		return sessionNameById.get(sessionId) ?? "Nieznane posiedzenie";
	};

	const statusCounts = useMemo(() => {
		const acc = {
			all: resolutions.length,
			accepted: 0,
			rejected: 0,
			pending: 0,
		};
		resolutions.forEach((r) => {
			if (r.status in acc) acc[r.status] += 1;
		});
		return acc;
	}, [resolutions]);

	const filteredResolutions = useMemo(() => {
		const q = search.trim().toLowerCase();

		const filtered = resolutions.filter((r) => {
			if (
				selectedSessionId !== "all" &&
				r.sessionId !== Number(selectedSessionId)
			) {
				return false;
			}
			if (statusFilter !== "all" && r.status !== statusFilter) {
				return false;
			}
			if (q) {
				const hay =
					`${r.title ?? ""} ${r.author ?? ""} ${r.party ?? ""}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		});

		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "oldest":
					return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
				case "author":
					return (a.author ?? "").localeCompare(b.author ?? "", "pl");
				case "status":
					return (a.status ?? "").localeCompare(b.status ?? "");
				case "newest":
				default:
					return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
			}
		});

		return sorted;
	}, [resolutions, selectedSessionId, statusFilter, search, sortBy]);

	// Grupowanie po posiedzeniu (zachowuje kolejność posortowaną)
	const grouped = useMemo(() => {
		const groups = new Map();
		filteredResolutions.forEach((r) => {
			const key = r.sessionId ?? "none";
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push(r);
		});
		return Array.from(groups.entries());
	}, [filteredResolutions]);

	const totalCount = filteredResolutions.length;
	const totalLabel = `${totalCount} ${pluralize(totalCount, "uchwała", "uchwały", "uchwał")}`;

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<div className={styles.topbarMain}>
					<p className={styles.eyebrow}>Parlament Młodych RP</p>
					<h1 className={styles.title}>Uchwały</h1>
				</div>
				<p className={styles.subtitle}>{loading ? "Ładowanie…" : totalLabel}</p>
			</header>

			<section className={styles.controls} aria-label="Filtry uchwał">
				<div className={styles.searchWrap}>
					<svg
						className={styles.searchIcon}
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						aria-hidden="true"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="m20 20-3.5-3.5" />
					</svg>
					<input
						type="search"
						className={styles.search}
						placeholder="Szukaj po tytule, autorze, klubie…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						aria-label="Szukaj uchwał"
					/>
				</div>

				<div className={styles.controlsRow}>
					<label className={styles.field}>
						<span className={styles.fieldLabel}>Posiedzenie</span>
						<select
							className={styles.select}
							value={selectedSessionId}
							onChange={(e) => setSelectedSessionId(e.target.value)}
						>
							<option value="all">Wszystkie</option>
							{sessions.map((session) => (
								<option key={session.id} value={session.id}>
									{session.name}
									{session.date ? ` — ${session.date}` : ""}
								</option>
							))}
						</select>
					</label>

					<label className={styles.field}>
						<span className={styles.fieldLabel}>Sortuj</span>
						<select
							className={styles.select}
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
						>
							<option value="newest">Najnowsze</option>
							<option value="oldest">Najstarsze</option>
							<option value="author">Autor (A–Z)</option>
							<option value="status">Status</option>
						</select>
					</label>
				</div>

				<nav className={styles.statusTabs} aria-label="Filtr statusu">
					{[
						{ key: "all", label: "Wszystkie" },
						{ key: "accepted", label: "Przyjęte" },
						{ key: "rejected", label: "Odrzucone" },
						{ key: "pending", label: "Oczekujące" },
					].map((t) => (
						<button
							key={t.key}
							type="button"
							className={`${styles.statusTab} ${
								statusFilter === t.key ? styles.statusTabActive : ""
							}`}
							aria-pressed={statusFilter === t.key}
							onClick={() => setStatusFilter(t.key)}
						>
							<span>{t.label}</span>
							<span className={styles.statusTabCount}>
								{statusCounts[t.key] ?? 0}
							</span>
						</button>
					))}
				</nav>
			</section>

			{error && (
				<div className={styles.error} role="alert">
					{error}
				</div>
			)}

			{loading ? (
				<p className={styles.muted}>Ładowanie uchwał…</p>
			) : totalCount === 0 ? (
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Brak uchwał</p>
					<p className={styles.emptyText}>
						Nie znaleziono uchwał spełniających wybrane kryteria. Zmień filtry
						lub wyczyść wyszukiwanie.
					</p>
				</div>
			) : (
				<div className={styles.groups}>
					{grouped.map(([sessionId, items]) => (
						<section key={sessionId} className={styles.group}>
							<header className={styles.groupHead}>
								<h2 className={styles.groupTitle}>
									{sessionId === "none"
										? "Bez posiedzenia"
										: getSessionName(Number(sessionId))}
								</h2>
								<span className={styles.groupCount}>
									{items.length}{" "}
									{pluralize(items.length, "uchwała", "uchwały", "uchwał")}
								</span>
							</header>

							<ul className={styles.list}>
								{items.map((resolution) => (
									<li
										key={resolution.id}
										className={`${styles.item} ${
											styles[`item--${resolution.status}`] ?? ""
										}`}
									>
										<div className={styles.itemMain}>
											<div className={styles.itemMeta}>
												{resolution.party && (
													<span className={styles.itemClub}>
														{resolution.party}
													</span>
												)}
												<span className={styles.itemSession}>
													{getSessionName(resolution.sessionId)}
												</span>
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
												{resolution.author && (
													<span>
														Autor: <strong>{resolution.author}</strong>
													</span>
												)}
												{resolution.createdAt && (
													<span>· {formatDate(resolution.createdAt)}</span>
												)}
												{typeof resolution.signatures === "number" && (
													<span>
														· {resolution.signatures}{" "}
														{pluralize(
															resolution.signatures,
															"podpis",
															"podpisy",
															"podpisów",
														)}
													</span>
												)}
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
												<svg
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													aria-hidden="true"
												>
													<path d="M5 12h14" />
													<path d="m13 6 6 6-6 6" />
												</svg>
											</Link>
										</div>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
