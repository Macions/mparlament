// src/features/dashboard/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	Vote,
	FileText,
	FilePlus2,
	ShieldCheck,
	CalendarDays,
	ArrowRight,
	ArrowUpRight,
} from "lucide-react";
import styles from "./Dashboard.module.css";
import useCountdown from "./useCountdown";
import { useAuth } from "../../auth/AuthContext";

const formatDate = (dateStr) => {
	if (!dateStr) return "";
	if (typeof dateStr === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
		return dateStr;
	}
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "";
	return date.toLocaleDateString("pl-PL", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

const STATUS_LABEL = {
	pending: "Oczekuje",
	accepted: "Przyjęta",
	rejected: "Odrzucona",
	active: "Aktywne",
	closed: "Zakończone",
	scheduled: "Zaplanowane",
};

const STATUS_TONE = {
	pending: "warn",
	accepted: "ok",
	rejected: "bad",
	active: "warn",
	closed: "neutral",
	scheduled: "neutral",
};

function StatusPill({ status }) {
	const tone = STATUS_TONE[status] ?? "neutral";
	const label = STATUS_LABEL[status] ?? status;
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>{label}</span>
	);
}

function Skeleton({ rows = 3 }) {
	return (
		<div className={styles.skeleton} aria-hidden="true">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className={styles.skeletonRow} />
			))}
		</div>
	);
}

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, isAdmin, loading: authLoading } = useAuth();

	const [currentSession, setCurrentSession] = useState(null);
	const [nextSession, setNextSession] = useState(null);
	const [amendments, setAmendments] = useState([]);
	const [votings, setVotings] = useState([]);
	const [resolutions, setResolutions] = useState([]);

	// Osobne loading dla każdej sekcji
	const [sessionsLoading, setSessionsLoading] = useState(true);
	const [amendmentsLoading, setAmendmentsLoading] = useState(true);
	const [votingsLoading, setVotingsLoading] = useState(true);
	const [resolutionsLoading, setResolutionsLoading] = useState(true);

	// 1. Sessions (current + next)
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		const headers = { Authorization: `Bearer ${token}` };

		(async () => {
			try {
				const [curRes, nextRes] = await Promise.all([
					fetch("/api/sessions/current", { headers }),
					fetch("/api/sessions/next", { headers }),
				]);
				if (curRes.ok) setCurrentSession(await curRes.json());
				if (nextRes.ok) setNextSession(await nextRes.json());
			} catch (e) {
				console.error("[Dashboard] sessions:", e);
			} finally {
				setSessionsLoading(false);
			}
		})();
	}, []);

	// 2. Amendments
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		const headers = { Authorization: `Bearer ${token}` };

		(async () => {
			try {
				const res = await fetch("/api/amendments", { headers });
				if (res.ok) setAmendments((await res.json()).amendments ?? []);
			} catch (e) {
				console.error("[Dashboard] amendments:", e);
			} finally {
				setAmendmentsLoading(false);
			}
		})();
	}, []);

	// 3. Votings
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		const headers = { Authorization: `Bearer ${token}` };

		(async () => {
			try {
				const res = await fetch("/api/votings", { headers });
				if (res.ok) setVotings((await res.json()).votings ?? []);
			} catch (e) {
				console.error("[Dashboard] votings:", e);
			} finally {
				setVotingsLoading(false);
			}
		})();
	}, []);

	// 4. Resolutions
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		const headers = { Authorization: `Bearer ${token}` };

		(async () => {
			try {
				const res = await fetch("/api/resolutions", { headers });
				if (res.ok) setResolutions((await res.json()).resolutions ?? []);
			} catch (e) {
				console.error("[Dashboard] resolutions:", e);
			} finally {
				setResolutionsLoading(false);
			}
		})();
	}, []);

	// Tylko authLoading blokuje render (krótko, bo AuthProvider ma user z localStorage)
	if (authLoading) {
		return (
			<div className={styles.page}>
				<Skeleton rows={6} />
			</div>
		);
	}

	const myId = user?.id ?? user?.userId ?? user?.parliamentarianId;

	const myAmendments = amendments
		.filter((a) => a.authorId === myId)
		.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

	const myPendingAmendments = myAmendments.filter(
		(a) => a.status === "pending",
	);

	const votingsToCast = votings.filter((v) => {
		const notVoted = Array.isArray(v.notVotedUsers) ? v.notVotedUsers : [];
		return notVoted.some((u) => u.id === myId);
	});

	const pendingResolutions = resolutions.filter((r) => r.status === "pending");

	const resolutionTitleById = Object.fromEntries(
		resolutions.map((r) => [r.id, r.title]),
	);

	const links = [
		{
			to: "/glosowania",
			label: "Głosowania",
			hint: "Przejdź do listy głosowań",
			icon: Vote,
		},
		{
			to: "/uchwaly",
			label: "Uchwały",
			hint: "Przeglądaj uchwały i poprawki",
			icon: FileText,
		},
		{
			to: "/zloz-uchwale",
			label: "Nowa uchwała",
			hint: "Złóż projekt uchwały",
			icon: FilePlus2,
		},
		...(isAdmin
			? [
					{
						to: "/finalizuj-uchwale",
						label: "Administrator",
						hint: "Finalizuj uchwałę",
						icon: ShieldCheck,
					},
				]
			: []),
	];

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<h1 className={styles.pageTitle}>Przegląd</h1>
				<p className={styles.pageSubtitle}>
					Witaj, {user?.name?.split(" ")[0]}. Oto co dzieje się w Parlamencie
					Młodych.
				</p>
				<div className={styles.stats}>
					<span>
						<strong>
							{amendmentsLoading ? "…" : myPendingAmendments.length}
						</strong>{" "}
						Twoje poprawki
					</span>
					<span className={styles.statsSep}>·</span>
					<span>
						<strong>{votingsLoading ? "…" : votingsToCast.length}</strong>{" "}
						Głosowania do oddania
					</span>
					<span className={styles.statsSep}>·</span>
					<span>
						<strong>
							{resolutionsLoading ? "…" : pendingResolutions.length}
						</strong>{" "}
						Uchwały w toku
					</span>
				</div>
			</header>

			<section className={styles.tiles}>
				{links.map(({ to, label, hint, icon: Icon }) => (
					<Link key={to} to={to} className={styles.tile}>
						<span className={styles.tileIcon}>
							<Icon size={20} />
						</span>
						<span className={styles.tileText}>
							<span className={styles.tileEyebrow}>{label}</span>
							<span className={styles.tileLabel}>{hint}</span>
						</span>
						<span className={styles.tileGo}>
							<ArrowUpRight size={14} />
						</span>
					</Link>
				))}
			</section>

			<div className={styles.row}>
				{sessionsLoading ? (
					<section className={styles.hero}>
						<div className={styles.heroBody}>
							<div className={styles.skeletonRow} style={{ width: "40%" }} />
							<div
								className={styles.skeletonRow}
								style={{ width: "70%", marginTop: 12 }}
							/>
						</div>
					</section>
				) : currentSession && currentSession.active ? (
					<LiveHero session={currentSession} />
				) : nextSession ? (
					<UpcomingHero session={nextSession} />
				) : (
					<section className={styles.heroIdle}>
						<h2 className={styles.heroIdleTitle}>Brak posiedzeń</h2>
						<p className={styles.heroIdleText}>
							Nie ma zaplanowanych posiedzeń.
						</p>
					</section>
				)}

				<section className={styles.calendar} title="W budowie...">
					<span className={styles.tileIcon}>
						<CalendarDays size={20} />
					</span>
					<div>
						<h2 className={styles.calendarTitle}>Kalendarz</h2>
						<p className={styles.calendarSubtitle}>
							Harmonogram posiedzeń pojawi się wkrótce.
						</p>
					</div>
				</section>
			</div>

			{/* Twoje poprawki */}
			<section className={styles.panel}>
				<header className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Twoje ostatnie poprawki</h2>
					<Link to="/uchwaly" className={styles.panelLink}>
						Wszystkie
					</Link>
				</header>

				{amendmentsLoading ? (
					<Skeleton rows={3} />
				) : myAmendments.length === 0 ? (
					<p className={styles.empty}>Nie złożyłeś jeszcze żadnych poprawek.</p>
				) : (
					<ul className={styles.list}>
						{myAmendments.slice(0, 5).map((a) => (
							<li key={a.id} className={styles.listItem}>
								<div className={styles.listItemMain}>
									<span className={styles.listItemTitle}>
										{resolutionTitleById[a.resolutionId] ??
											`Uchwała #${a.resolutionId}`}
									</span>
									<span className={styles.listItemMeta}>
										{formatDate(a.createdAt)}
										{a.target?.chapter_id ? ` · ${a.target.chapter_id}` : ""}
									</span>
								</div>
								<StatusPill status={a.status} />
							</li>
						))}
					</ul>
				)}
			</section>

			{/* Głosowania do oddania */}
			<section className={styles.panel}>
				<header className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Głosowania do oddania</h2>
					<Link to="/glosowania" className={styles.panelLink}>
						Wszystkie
					</Link>
				</header>

				{votingsLoading ? (
					<Skeleton rows={2} />
				) : votingsToCast.length === 0 ? (
					<p className={styles.empty}>Brak głosowań do oddania.</p>
				) : (
					<ul className={styles.list}>
						{votingsToCast.slice(0, 3).map((v) => (
							<li key={v.id} className={styles.listItem}>
								<div className={styles.listItemMain}>
									<Link
										to={`/glosowanie/${v.id}`}
										className={styles.listItemTitle}
									>
										{v.title}
									</Link>
									<span className={styles.listItemMeta}>
										{v.endTime
											? `Do ${formatDate(v.endTime)}`
											: v.startTime
												? `Od ${formatDate(v.startTime)}`
												: "Brak terminu"}
									</span>
								</div>
								<StatusPill status={v.status ?? "active"} />
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function CtaArrow() {
	return <ArrowRight size={18} aria-hidden="true" />;
}

function LiveHero({ session }) {
	return (
		<section className={styles.hero}>
			<div className={styles.heroBody}>
				<span className={styles.heroBadge}>
					<span className={`${styles.heroBadgeDot} ${styles.heroBadgeLive}`} />
					Trwa teraz
				</span>
				<h2 className={styles.heroTitle}>{session.title}</h2>
				<p className={styles.heroTime}>
					{session.start || session.startTime}
					<span className={styles.heroTimeSep}>–</span>
					{session.end || session.endTime}
				</p>
			</div>
			<Link to="/posiedzenie" className={styles.heroCta}>
				<span>Śledź posiedzenie</span>
				<CtaArrow />
			</Link>
		</section>
	);
}

function UpcomingHero({ session }) {
	const startRaw = session.start || session.startTime;
	const { text } = useCountdown(startRaw);

	return (
		<section className={styles.hero}>
			<div className={styles.heroBody}>
				<span className={styles.heroBadge}>
					<span className={styles.heroBadgeDot} />
					Najbliższe posiedzenie
				</span>
				<h2 className={styles.heroTitle}>{session.title}</h2>
				<p className={styles.heroTime}>
					{formatDate(startRaw)}
					<span className={styles.heroTimeSep}>•</span>
					{new Date(startRaw).toLocaleTimeString("pl-PL", {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
				<p className={styles.heroCountdown} aria-live="polite">
					{text}
				</p>
			</div>
			<Link to="/posiedzenie" className={styles.heroCta}>
				<span>Szczegóły posiedzenia</span>
				<CtaArrow />
			</Link>
		</section>
	);
}
