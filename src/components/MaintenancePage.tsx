import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import styles from "./MaintenancePage.module.css";
import ParlamentLogo from "./ParlamentLogo";
import MParlamentLogo from "./MParlamentLogo";

type Props = {
	message?: string | null;
	submitUrl?: string;
	contactEmail?: string;
};

export function MaintenancePage({
	message,
	submitUrl = "/newapp/api/ideas",
	contactEmail = "maciej.czarnecki@parlamentmlodych.eu",
}: Props) {
	const [idea, setIdea] = useState("");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const value = idea.trim();
		if (!value) return;

		setSending(true);
		setError(null);
		try {
			const res = await fetch(submitUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idea: value }),
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			setIdea("");
			setSent(true);
			setTimeout(() => setSent(false), 5000);
		} catch (err) {
			console.error(err);
			setError("Nie udało się zapisać propozycji. Spróbuj ponownie.");
		} finally {
			setSending(false);
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.logos}>
					<ParlamentLogo />
				</div>

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

					{error && (
						<div className={styles.error}>
							<AlertCircle size={18} />
							{error}
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
