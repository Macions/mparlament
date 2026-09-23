// src/components/MaintenancePage.tsx
import { useEffect, useState } from "react";
import { Wrench, Clock, Mail, Phone, RefreshCw } from "lucide-react";
import styles from "./MaintenancePage.module.css";

type Props = {
	message?: string | null;
	/** ISO data zakończenia prac, np. "2026-09-23T18:00:00" */
	until?: string | null;
	/** Adres kontaktowy */
	contactEmail?: string;
	contactPhone?: string;
};

function useCountdown(target?: string | null) {
	const [left, setLeft] = useState<{ h: number; m: number; s: number } | null>(
		null,
	);

	useEffect(() => {
		if (!target) return;
		const tick = () => {
			const diff = new Date(target).getTime() - Date.now();
			if (diff <= 0) {
				setLeft({ h: 0, m: 0, s: 0 });
				return;
			}
			const h = Math.floor(diff / 3_600_000);
			const m = Math.floor((diff % 3_600_000) / 60_000);
			const s = Math.floor((diff % 60_000) / 1000);
			setLeft({ h, m, s });
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [target]);

	return left;
}

export function MaintenancePage({
	message,
	until,
	contactEmail = "support@mparlament.pl",
	contactPhone = "+48 22 000 00 00",
}: Props) {
	const left = useCountdown(until);

	return (
		<div className={styles.page}>
			{/* Animowane tło */}
			<div className={styles.bgLayer}>
				<div className={styles.blobIndigo} />
				<div className={styles.blobFuchsia} />
				<div className={styles.blobCyan} />
				<div className={styles.grid} />
			</div>

			{/* Karta */}
			<div className={styles.container}>
				<div className={styles.content}>
					{/* Logo / nazwa */}
					<div className={styles.brand}>
						<div className={styles.brandBadge}>
							<span>MP</span>
						</div>
						<span className={styles.brandName}>mParlament</span>
					</div>

					{/* Karta główna */}
					<div className={styles.card}>
						<div className={styles.iconWrap}>
							<div className={styles.iconRelative}>
								<div className={styles.iconPing} />
								<div className={styles.iconCircle}>
									<Wrench strokeWidth={2.2} />
								</div>
							</div>
						</div>

						<h1 className={styles.title}>Pracujemy nad czymś ważnym</h1>

						<p className={styles.subtitle}>
							{message ??
								"Trwają prace serwisowe. Wrócimy tak szybko, jak to możliwe — dziękujemy za cierpliwość."}
						</p>

						{/* Licznik */}
						{left && (
							<div className={styles.countdown}>
								<div className={styles.countdownLabel}>
									<Clock />
									<span>Powrót za</span>
								</div>
								<div className={styles.countdownGrid}>
									{[
										{ label: "godz.", value: left.h },
										{ label: "min", value: left.m },
										{ label: "sek", value: left.s },
									].map((u) => (
										<div key={u.label} className={styles.countdownCell}>
											<span className={styles.countdownValue}>
												{String(u.value).padStart(2, "0")}
											</span>
											<span className={styles.countdownUnit}>{u.label}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Pasek postępu (dekoracyjny) */}
						<div className={styles.progressTrack}>
							<div className={styles.progressBar} />
						</div>

						{/* Akcje */}
						<div className={styles.actions}>
							<button
								onClick={() => window.location.reload()}
								className={styles.btnPrimary}
							>
								<RefreshCw />
								Sprawdź ponownie
							</button>
							<a
								href={`mailto:${contactEmail}`}
								className={styles.btnSecondary}
							>
								<Mail />
								Napisz do nas
							</a>
						</div>

						{/* Kontakt */}
						<div className={styles.contact}>
							<span className={styles.contactItem}>
								<Mail /> {contactEmail}
							</span>
							<span className={styles.contactItem}>
								<Phone /> {contactPhone}
							</span>
						</div>
					</div>

					{/* Stopka */}
					<p className={styles.footer}>
						© {new Date().getFullYear()} mParlament · System legislacyjny
					</p>
				</div>
			</div>
		</div>
	);
}
