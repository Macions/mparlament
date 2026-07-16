import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		const tokenData = localStorage.getItem("token");

		if (tokenData) {
			try {
				const parsed = JSON.parse(tokenData);
				if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
					localStorage.removeItem("token");
					localStorage.removeItem("user");
					return;
				}
				navigate("/panel", { replace: true });
			} catch (e) {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
			}
		}
	}, [navigate]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Błąd logowania");
			}

			const tokenData = {
				token: data.token,
				expiresAt: Date.now() + 10 * 60 * 60 * 1000,
			};

			localStorage.setItem("token", JSON.stringify(tokenData));
			localStorage.setItem("user", JSON.stringify(data.user));

			navigate("/panel");
		} catch (error) {
			setError(error.message);
			console.error(error.message);
		}
	};

	return (
		<div className="login">
			<h1 className="login__title">Logowanie:</h1>

			{error && <div className="login__error">{error}</div>}

			<form className="login__form" onSubmit={handleSubmit}>
				<div className="login__field">
					<label htmlFor="username" className="login__label">
						Nazwa użytkownika:
					</label>
					<input
						id="username"
						type="text"
						name="username"
						className="login__input"
						autoComplete="username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>

				<div className="login__field">
					<label htmlFor="password" className="login__label">
						Hasło:
					</label>
					<input
						id="password"
						type="password"
						name="password"
						className="login__input"
						autoComplete="current-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>

				<button type="submit" className="login__button">
					Zaloguj się
				</button>
			</form>
		</div>
	);
}
