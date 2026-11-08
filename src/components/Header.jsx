import { Bell } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import styles from "./Header.module.css";

export default function Header() {
	const { user } = useAuth();
	const firstName = user?.name?.split(" ")[0] || "";

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				{/* LEWO: powitanie */}
				<div className={styles.textBlock}>
					<h1 className={styles.greeting}>
						Cześć{firstName ? `, ${firstName}` : ""}!
					</h1>
					<p className={styles.subtitle}>
						Jesteś członkiem zespołu organizacyjnego
					</p>
				</div>

				{/* PRAWO: badge z klubem + powiadomienia */}
				<div className={styles.right}>
					{user?.club && <span className={styles.badge}>{user.club}</span>}

					<button
						type="button"
						className={styles.notificationsBtn}
						aria-label="Powiadomienia"
					>
						<Bell size={22} />
					</button>
				</div>
			</div>
		</header>
	);
}
