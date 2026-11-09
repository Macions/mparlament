import { X, Vote } from "lucide-react";
import { useNotifications } from "./NotificationsContext";
import styles from "./Notifications.module.css";

export default function NotificationsToast() {
	const { toast, dismissToast, openVoting } = useNotifications();

	if (!toast) return null;

	return (
		<div className={styles.toast} role="status">
			<span className={styles.toastIcon}>
				<Vote size={18} />
			</span>
			<div className={styles.toastBody}>
				<strong className={styles.toastTitle}>{toast.title}</strong>
				<span className={styles.toastText}>{toast.text}</span>
			</div>
			<div className={styles.toastActions}>
				<button
					type="button"
					className={styles.toastBtn}
					onClick={() => openVoting(toast.votingId)}
				>
					Otwórz
				</button>
				<button
					type="button"
					className={styles.toastClose}
					onClick={dismissToast}
					aria-label="Zamknij"
				>
					<X size={14} />
				</button>
			</div>
		</div>
	);
}
