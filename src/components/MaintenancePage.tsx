// src/components/MaintenancePage.tsx
import { useState, type FormEvent } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import styles from "./MaintenancePage.module.css";

type Props = {
	message?: string | null;
	/** Endpoint API przyjmujący { idea: string } — opcjonalny */
	submitUrl?: string;
	contactEmail?: string;
};

export function MaintenancePage({
	message,
	submitUrl,
	contactEmail = "maciej.czarnecki@parlamentmlodych.eu",
}: Props) {
	const [idea, setIdea] = useState("");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const value = idea.trim();
		if (!value) return;

		setSending(true);
		try {
			if (submitUrl) {
				await fetch(submitUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ idea: value }),
				});
			} else {
				console.log("Propozycja:", value);
			}
			setIdea("");
			setSent(true);
			setTimeout(() => setSent(false), 5000);
		} catch (err) {
			console.error(err);
		} finally {
			setSending(false);
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<h1 className={styles.brand}>mParlament</h1>

				<p className={styles.subtitle}>
					{message ??
						"System jest w przebudowie. Prace potrwają kilka miesięcy — wracamy z nową, lepszą wersją."}
				</p>

				<form onSubmit={handleSubmit} className={styles.form}>
					<label htmlFor="idea" className={styles.label}>
						Co chciałbyś zobaczyć w nowym systemie?
					</label>
					<textarea
						id="idea"
						className={styles.textarea}
						placeholder="Wpisz swoje propozycje, pomysły, funkcje..."
						value={idea}
						onChange={(e) => setIdea(e.target.value)}
						required
					/>
					<button
						type="submit"
						className={styles.button}
						disabled={sending || !idea.trim()}
					>
						<Send size={18} />
						{sending ? "Wysyłanie..." : "Wyślij propozycję"}
					</button>

					{sent && (
						<div className={styles.success}>
							<CheckCircle2 size={18} />
							Dziękujemy! Twoja propozycja została zapisana.
						</div>
					)}
				</form>

				<p className={styles.footer}>
					Kontakt:{" "}
					<a href={`mailto:${contactEmail}`} className={styles.link}>
						{contactEmail}
					</a>
				</p>
			</div>
		</div>
	);
}