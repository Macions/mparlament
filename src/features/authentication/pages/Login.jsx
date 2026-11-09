import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import fullLogo from "../../../assets/full_logo.png";

export default function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const token = localStorage.getItem("token");
		const expiresAt = Number(localStorage.getItem("tokenExpiresAt") || 0);

		if (!token) {
			localStorage.removeItem("user");
			return;
		}

		if (expiresAt && Date.now() > expiresAt) {
			localStorage.removeItem("token");
			localStorage.removeItem("tokenExpiresAt");
			localStorage.removeItem("user");
			return;
		}

		navigate("/panel", { replace: true });
	}, [navigate]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await fetch("/newapp/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.message || "Nieprawidłowa nazwa użytkownika lub hasło.",
				);
			}

			localStorage.setItem("token", data.token);
			localStorage.setItem(
				"tokenExpiresAt",
				String(Date.now() + 10 * 60 * 60 * 1000),
			);
			localStorage.setItem("user", JSON.stringify(data.user));
			navigate("/panel");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.page}>
			<div className={styles.layout}>
				<aside className={styles.intro}>
					<img
						src={fullLogo}
						alt="Parlament Młodych Rzeczypospolitej Polskiej"
						className={styles.logo}
					/>
					<h1 className={styles.heading}>Panel organizacyjny</h1>
					<p className={styles.lead}>
						Dostęp wyłącznie dla członków zespołu organizacyjnego, posłów oraz
						współpracowników z uprawnieniami do uchwał i głosowań.
					</p>
					<p className={styles.help}>
						Nie masz konta? Skontaktuj się z Działem Technicznym PMRP.
					</p>
				</aside>

				<main className={styles.form}>
					<header className={styles.formHeader}>
						<h2 className={styles.formTitle}>Zaloguj się</h2>
						<p className={styles.formSubtitle}>
							Podaj dane otrzymane od administratora.
						</p>
					</header>

					{error && (
						<div className={styles.error} role="alert">
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} noValidate>
						<div className={styles.field}>
							<label htmlFor="username" className={styles.label}>
								Nazwa użytkownika
							</label>
							<input
								id="username"
								type="text"
								name="username"
								className={styles.input}
								autoComplete="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<div className={styles.field}>
							<div className={styles.labelRow}>
								<label htmlFor="password" className={styles.label}>
									Hasło
								</label>
								<a className={styles.inlineLink} href="mailto:it@pmrp.pl">
									Zresetuj hasło
								</a>
							</div>
							<input
								id="password"
								type="password"
								name="password"
								className={styles.input}
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<button type="submit" className={styles.submit} disabled={loading}>
							{loading ? "Logowanie…" : "Zaloguj się"}
						</button>
					</form>
				</main>
			</div>
		</div>
	);
}
