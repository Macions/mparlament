import "./Login.css";

export default function Login() {
	return (
		<div className="login">
			<h1 className="login__title">Logowanie:</h1>

			<form className="login__form">
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
