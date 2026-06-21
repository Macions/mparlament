import { Link } from "react-router-dom";
import ParlamentLogo from "./ParlamentLogo";
import MParlamentLogo from "./MParlamentLogo";
import "../App.css";

export default function Header() {
	return (
		<header className="header">
			<ParlamentLogo />

			<MParlamentLogo />

			<Link to="/zaloguj" className="login-button">
				<span className="login-button__icon">
					<LoginIcon />
				</span>

				<span className="login-button__label">Zaloguj się</span>
			</Link>
		</header>
	);
}

function LoginIcon() {
	return (
		<svg viewBox="0 0 24 24">
			<circle
				cx="12"
				cy="8"
				r="4"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="M5 20 C5 16 8 14 12 14 C16 14 19 16 19 20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}