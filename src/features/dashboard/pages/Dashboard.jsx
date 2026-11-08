import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	Vote,
	FileText,
	FilePlus2,
	ShieldCheck,
	LayoutDashboard,
	CalendarDays,
	ArrowRight,
	ArrowUpRight,
} from "lucide-react";
import styles from "./Dashboard.module.css";
import BackButton from "../../../components/PageBack";
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

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, isAdmin, loading: authLoading } = useAuth();

	const [currentSession, setCurrentSession] = useState(null);
	const [nextSession, setNextSession] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchSessions = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					navigate("/zaloguj");
					return;
				}
				const headers = { Authorization: `Bearer ${token}` };

				const sessionResponse = await fetch("/newapp/api/sessions/current", {
					headers,
				});
				if (sessionResponse.ok) setCurrentSession(await sessionResponse.json());

				const nextResponse = await fetch("/newapp/api/sessions/next", {
					headers,
				});
				if (nextResponse.ok) setNextSession(await nextResponse.json());
			} catch {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
				navigate("/zaloguj");
			} finally {
				setLoading(false);
			}
		};

		fetchSessions();
	}, [navigate]);

	if (authLoading || loading) return null;

	const links = [
		{
			to: "/glosowania",
			label: "Głosowania",
			hint: "Przejdź do głosowań",
			icon: Vote,
			tone: "teal",
		},
		{
			to: "/uchwaly",
			label: "Uchwały",
			hint: "Sprawdź uchwały",
			icon: FileText,
			tone: "blue",
		},
		{
			to: "/zloz-uchwale",
			label: "Nowa uchwała",
			hint: "Złóż uchwałę",
			icon: FilePlus2,
			tone: "violet",
		},
		...(isAdmin
			? [
					{
						to: "/finalizuj-uchwale",
						label: "Administrator",
						hint: "Finalizuj uchwałę",
						icon: ShieldCheck,
						tone: "amber",
					},
				]
			: []),
	];

	return (
		<div className={styles.shell}>
			<div className={styles.frame}>
				<div className={styles.main}>
					<header className={styles.topbar}>
						<div className={styles.topbarTitle}>
							<BackButton to="/" label="Strona główna" />
							<h1 className={styles.pageTitle}>Przegląd</h1>
							<p className={styles.pageSubtitle}>
								Witaj, {user?.name?.split(" ")[0]}! Oto co dzieje się w Twojej
								radzie.
							</p>
						</div>

						<div className={styles.identity}>
							<div className={styles.avatar}>
								{(user?.name?.[0] || "?").toUpperCase()}
							</div>
							<div className={styles.identityText}>
								<span className={styles.identityGreeting}>Zalogowano jako</span>
								<strong className={styles.identityName}>{user?.name}</strong>
							</div>
						</div>
					</header>

					<main className={styles.content}>
						{/* Kafle akcji */}
						<section className={styles.tiles}>
							{links.map(({ to, label, hint, icon: Icon, tone }) => (
								<Link key={to} to={to} className={styles.tile}>
									<span
										className={`${styles.tileIcon} ${styles[`tone-${tone}`]}`}
									>
										<Icon size={22} />
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

						{/* Hero + kalendarz */}
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
								<span className={`${styles.tileIcon} ${styles["tone-blue"]}`}>
									<CalendarDays size={22} />
								</span>
								<div className={styles.calendarText}>
									<h2 className={styles.calendarTitle}>Kalendarz</h2>
									<p className={styles.calendarSubtitle}>
										Harmonogram posiedzeń pojawi się wkrótce.
									</p>
								</div>
							</section>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

function CtaArrow() {
	return <ArrowRight size={18} aria-hidden="true" />;
}

/* ---------- Hero: TRWA ---------- */
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

/* ---------- Hero: NADCHODZĄCE ---------- */
function UpcomingHero({ session }) {
	const startRaw = session.start || session.startTime;
	const { text, diff } = useCountdown(startRaw);

	const urgency =
		diff < 60 * 60 * 1000
			? "urgent"
			: diff < 24 * 60 * 60 * 1000
				? "soon"
				: "calm";

	return (
		<section
			className={`${styles.hero} ${styles.heroUpcoming} ${styles[`heroUpcoming--${urgency}`]}`}
		>
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
