// src/components/Header.jsx
import { useEffect, useRef, useState } from "react";
import { Bell, Check, Vote, FileText, MessageSquare, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useNotifications } from "../features/notifications/NotificationsContext";
import styles from "./Header.module.css";

const TYPE_META = {
	voting_pending: {
		icon: Vote,
		description: "Głosowanie aktywne – nie oddałeś głosu",
	},
	resolution_created: {
		icon: FileText,
		description: "Nowa uchwała w systemie",
	},
	amendment_created: {
		icon: MessageSquare,
		description: "Nowa poprawka do Twojej uchwały",
	},
};

export default function Header({ onMenuClick }) {
	const { user } = useAuth();
	const {
		unreadNotifications,
		unreadCount,
		openNotification,
		markAllAsRead,
		refresh,
		loading,
		error,
	} = useNotifications();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const panelRef = useRef(null);

	const firstName = user?.name?.split(" ")[0] || "";

	useEffect(() => {
		if (!open) return;
		const onClick = (e) => {
			if (panelRef.current && !panelRef.current.contains(e.target)) {
				setOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const handleToggle = () => {
		setOpen((v) => {
			const next = !v;
			if (next) void refresh();
			return next;
		});
	};

	const handleOpen = (n) => {
		setOpen(false);
		void openNotification(n);
	};

	const handleMarkAll = () => {
		void markAllAsRead();
	};

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<div className={styles.headerLeft}>
					{onMenuClick && (
						<button
							type="button"
							className={styles.menuBtn}
							onClick={onMenuClick}
							aria-label="Otwórz menu"
						>
							<Menu size={20} />
						</button>
					)}
					<div className={styles.textBlock}>
						<h1 className={styles.greeting}>
							Cześć{firstName ? `, ${firstName}` : ""}!
						</h1>
						<p className={styles.subtitle}>
							Jesteś członkiem zespołu organizacyjnego
						</p>
					</div>
				</div>

				<div className={styles.right}>
					{user?.club && <span className={styles.badge}>{user.club}</span>}

					<div className={styles.notifWrap} ref={panelRef}>
						<button
							type="button"
							className={styles.notificationsBtn}
							aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
							aria-expanded={open}
							onClick={handleToggle}
						>
							<Bell size={18} />
							{unreadCount > 0 && (
								<span className={styles.notifBadge}>{unreadCount}</span>
							)}
						</button>

						{open && (
							<div className={styles.notifPanel} role="dialog">
								<header className={styles.notifHead}>
									<span className={styles.notifTitle}>Powiadomienia</span>
									<div className={styles.notifHeadRight}>
										<span className={styles.notifCount}>{unreadCount}</span>
										{unreadCount > 0 && (
											<button
												type="button"
												className={styles.notifMarkAll}
												onClick={handleMarkAll}
												title="Oznacz wszystkie jako przeczytane"
											>
												<Check size={14} />
												<span>Oznacz wszystkie</span>
											</button>
										)}
									</div>
								</header>

								{loading && unreadNotifications.length === 0 && (
									<p className={styles.notifEmpty}>Ładowanie…</p>
								)}

								{error && !loading && (
									<p className={styles.notifError} role="alert">
										{error}
									</p>
								)}

								{!loading && !error && unreadNotifications.length === 0 && (
									<p className={styles.notifEmpty}>Brak nowych powiadomień.</p>
								)}

								{!loading && !error && unreadNotifications.length > 0 && (
									<ul className={styles.notifList}>
										{unreadNotifications.map((n) => {
											const meta = TYPE_META[n.type] ?? {
												icon: FileText,
												description: "Powiadomienie",
											};
											const Icon = meta.icon;
											return (
												<li key={n.id} className={styles.notifItem}>
													<button
														type="button"
														className={styles.notifItemBtn}
														onClick={() => handleOpen(n)}
													>
														<span className={styles.notifItemIcon}>
															<Icon size={16} />
														</span>
														<span className={styles.notifItemBody}>
															<span className={styles.notifItemTitle}>
																{n.title}
															</span>
															<span className={styles.notifItemMeta}>
																{meta.description}
															</span>
														</span>
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
