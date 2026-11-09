import { useEffect, useRef, useState } from "react";
import { Bell, Vote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useNotifications } from "../features/notifications/NotificationsContext";
import styles from "./Header.module.css";

export default function Header() {
	const { user } = useAuth();
	const { pendingVotings, unreadCount, openVoting } = useNotifications();
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

	const handleOpenVoting = (id) => {
		setOpen(false);
		navigate(`/glosowanie/${id}`);
	};

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<div className={styles.textBlock}>
					<h1 className={styles.greeting}>
						Cześć{firstName ? `, ${firstName}` : ""}!
					</h1>
					<p className={styles.subtitle}>
						Jesteś członkiem zespołu organizacyjnego
					</p>
				</div>

				<div className={styles.right}>
					{user?.club && <span className={styles.badge}>{user.club}</span>}

					<div className={styles.notifWrap} ref={panelRef}>
						<button
							type="button"
							className={styles.notificationsBtn}
							aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
							aria-expanded={open}
							onClick={() => setOpen((v) => !v)}
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
									<span className={styles.notifCount}>{unreadCount}</span>
								</header>

								{unreadCount === 0 ? (
									<p className={styles.notifEmpty}>Brak nowych powiadomień.</p>
								) : (
									<ul className={styles.notifList}>
										{pendingVotings.map((v) => (
											<li key={v.id} className={styles.notifItem}>
												<button
													type="button"
													className={styles.notifItemBtn}
													onClick={() => handleOpenVoting(v.id)}
												>
													<span className={styles.notifItemIcon}>
														<Vote size={16} />
													</span>
													<span className={styles.notifItemBody}>
														<span className={styles.notifItemTitle}>
															{v.title}
														</span>
														<span className={styles.notifItemMeta}>
															Głosowanie aktywne — nie oddałeś głosu
														</span>
													</span>
												</button>
											</li>
										))}
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
