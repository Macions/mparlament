// src/features/authentication/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import fullLogo from "../../../assets/full_logo.png";

export default function Login() {
	const [view, setView] = useState("login"); // "login" | "email" | "reset"
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
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

	const reset = () => {
		setError("");
		setInfo("");
		setLoading(false);
	};

	/* ── LOGIN ── */
	const handleLogin = async (e) => {
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

	/* ── FORGOT PASSWORD (email) ── */
	const handleSendCode = async (e) => {
		e.preventDefault();
		setError("");
		setInfo("");
		setLoading(true);
		try {
			const response = await fetch("/newapp/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || "Nie udało się wysłać kodu");
			}
			setInfo("Kod został wysłany na podany email.");
			setView("reset");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	/* ── RESET PASSWORD (code + newPassword) ── */
	const handleReset = async (e) => {
		e.preventDefault();
		setError("");
		setInfo("");
		setLoading(true);
		try {
			const response = await fetch("/newapp/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, code, newPassword }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(data.message || "Nie udało się zmienić hasła");
			}
			setInfo("Hasło zostało zmienione. Możesz się zalogować.");
			setView("login");
			setUsername(email);
			setPassword("");
			setCode("");
			setNewPassword("");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	/* ── Render ── */
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
						Dostęp wyłącznie dla członków zespołu organizacyjnego i
						parlamentarzystów.
					</p>
					<p className={styles.help}>
						Nie masz konta? Skontaktuj się z Zespołem Technicznym PMRP.
					</p>
				</aside>

				<main className={styles.form}>
					{view === "login" && (
						<>
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
							{info && (
								<div className={styles.success} role="status">
									{info}
								</div>
							)}

							<form onSubmit={handleLogin} noValidate>
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
										<button
											type="button"
											className={styles.inlineLink}
											onClick={() => {
												setView("email");
												reset();
											}}
										>
											Zresetuj hasło
										</button>
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

								<button
									type="submit"
									className={styles.submit}
									disabled={loading}
								>
									{loading ? "Logowanie…" : "Zaloguj się"}
								</button>
							</form>
						</>
					)}

					{view === "email" && (
						<>
							<header className={styles.formHeader}>
								<h2 className={styles.formTitle}>Reset hasła</h2>
								<p className={styles.formSubtitle}>
									Podaj email powiązany z kontem. Wyślemy kod do resetu hasła.
								</p>
							</header>

							{error && (
								<div className={styles.error} role="alert">
									{error}
								</div>
							)}
							{info && (
								<div className={styles.success} role="status">
									{info}
								</div>
							)}

							<form onSubmit={handleSendCode} noValidate>
								<div className={styles.field}>
									<label htmlFor="email" className={styles.label}>
										Email
									</label>
									<input
										id="email"
										type="email"
										name="email"
										className={styles.input}
										autoComplete="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										disabled={loading}
									/>
								</div>

								<button
									type="submit"
									className={styles.submit}
									disabled={loading || !email}
								>
									{loading ? "Wysyłanie…" : "Wyślij kod"}
								</button>

								<button
									type="button"
									className={styles.backLink}
									onClick={() => {
										setView("login");
										reset();
									}}
									disabled={loading}
								>
									← Wróć do logowania
								</button>
							</form>
						</>
					)}

					{view === "reset" && (
						<>
							<header className={styles.formHeader}>
								<h2 className={styles.formTitle}>Nowe hasło</h2>
								<p className={styles.formSubtitle}>
									Wpisz kod z emaila i ustaw nowe hasło.
								</p>
							</header>

							{error && (
								<div className={styles.error} role="alert">
									{error}
								</div>
							)}
							{info && (
								<div className={styles.success} role="status">
									{info}
								</div>
							)}

							<form onSubmit={handleReset} noValidate>
								<div className={styles.field}>
									<label htmlFor="code" className={styles.label}>
										Kod z emaila
									</label>
									<input
										id="code"
										type="text"
										inputMode="numeric"
										pattern="[0-9]{6}"
										maxLength={6}
										name="code"
										className={styles.input}
										autoComplete="one-time-code"
										value={code}
										onChange={(e) =>
											setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
										}
										required
										disabled={loading}
										placeholder="6 cyfr"
									/>
								</div>

								<div className={styles.field}>
									<label htmlFor="newPassword" className={styles.label}>
										Nowe hasło
									</label>
									<input
										id="newPassword"
										type="password"
										name="newPassword"
										className={styles.input}
										autoComplete="new-password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										required
										disabled={loading}
										minLength={8}
									/>
								</div>

								<button
									type="submit"
									className={styles.submit}
									disabled={
										loading || code.length !== 6 || newPassword.length < 8
									}
								>
									{loading ? "Zmieniam…" : "Zmień hasło"}
								</button>

								<button
									type="button"
									className={styles.backLink}
									onClick={() => {
										setView("login");
										reset();
									}}
									disabled={loading}
								>
									← Wróć do logowania
								</button>
							</form>
						</>
					)}
				</main>
			</div>
		</div>
	);
}
