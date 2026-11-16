import { X, Vote } from "lucide-react";
import { useNotifications } from "./NotificationsContext";
import styles from "./Notifications.module.css";

export default function NotificationsModal() {
	const { showModal, pendingVotings, dismissModal, openVoting } =
		useNotifications();

	if (!showModal || pendingVotings.length === 0) return null;

	return (
		<div className={styles.overlay} onClick={dismissModal}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<header className={styles.modalHead}>
					<div className={styles.modalHeadLeft}>
						<span className={styles.modalIcon}>
							<Vote size={18} />
						</span>
						<div>
							<h2 className={styles.modalTitle}>Masz aktywne głosowania</h2>
							<p className={styles.modalSubtitle}>
								Nie oddałeś jeszcze głosu w {pendingVotings.length}{" "}
								{pendingVotings.length === 1 ? "głosowaniu" : "głosowaniach"}.
							</p>
						</div>
					</div>
					<button
						type="button"
						className={styles.closeBtn}
						onClick={dismissModal}
						aria-label="Zamknij"
					>
						<X size={16} />
					</button>
				</header>

				<ul className={styles.list}>
					{pendingVotings.map((v) => (
						<li key={v.id} className={styles.item}>
							<div className={styles.itemMain}>
								<span className={styles.itemTitle}>{v.title}</span>
								{v.endTime && (
									<span className={styles.itemMeta}>
										Koniec:{" "}
										{new Date(v.endTime).toLocaleString("pl-PL", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								)}
							</div>
							<button
								type="button"
								className={styles.btnPrimary}
								onClick={() => openVoting(v.id)}
							>
								Zagłosuj
							</button>
						</li>
					))}
				</ul>

				<footer className={styles.modalFooter}>
					<button
						type="button"
						className={styles.btnGhost}
						onClick={dismissModal}
					>
						Później
					</button>
				</footer>
			</div>
		</div>
	);
}
