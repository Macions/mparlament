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

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, isAdmin, loading: authLoading } = useAuth();

	const [currentSession, setCurrentSession] = useState(null);
	const [nextSession, setNextSession] = useState(null);
	const [amendments, setAmendments] = useState([]);
	const [votings, setVotings] = useState([]);
	const [resolutions, setResolutions] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					navigate("/zaloguj");
					return;
				}
				const headers = { Authorization: `Bearer ${token}` };

				const [curRes, nextRes, amendRes, votRes, resRes] = await Promise.all([
					fetch("/newapp/api/sessions/current", { headers }),
					fetch("/newapp/api/sessions/next", { headers }),
					fetch("/newapp/api/amendments", { headers }),
					fetch("/newapp/api/votings", { headers }),
					fetch("/newapp/api/resolutions", { headers }),
				]);

				if (curRes.ok) setCurrentSession(await curRes.json());
				if (nextRes.ok) setNextSession(await nextRes.json());
				if (amendRes.ok)
					setAmendments((await amendRes.json()).amendments ?? []);
				if (votRes.ok) setVotings((await votRes.json()).votings ?? []);
				if (resRes.ok) setResolutions((await resRes.json()).resolutions ?? []);
			} catch {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
				navigate("/zaloguj");
			} finally {
				setLoading(false);
			}
		};

		fetchAll();
	}, [navigate]);

	if (authLoading || loading) return null;

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
					Witaj, {user?.name?.split(" ")[0]}. Oto co dzieje się w Twojej radzie.
				</p>
				<div className={styles.stats}>
					<span>
						<strong>{myPendingAmendments.length}</strong> Twoje poprawki
					</span>
					<span className={styles.statsSep}>·</span>
					<span>
						<strong>{votingsToCast.length}</strong> Głosowania do oddania
					</span>
					<span className={styles.statsSep}>·</span>
					<span>
						<strong>{pendingResolutions.length}</strong> Uchwały w toku
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
				{currentSession && currentSession.active ? (
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

			{/* ─── Twoje poprawki ─── */}
			<section className={styles.panel}>
				<header className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Twoje ostatnie poprawki</h2>
					<Link to="/uchwaly" className={styles.panelLink}>
						Wszystkie
					</Link>
				</header>

				{myAmendments.length === 0 ? (
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

			{/* ─── Głosowania do oddania ─── */}
			<section className={styles.panel}>
				<header className={styles.panelHeader}>
					<h2 className={styles.panelTitle}>Głosowania do oddania</h2>
					<Link to="/glosowania" className={styles.panelLink}>
						Wszystkie
					</Link>
				</header>

				{votingsToCast.length === 0 ? (
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
