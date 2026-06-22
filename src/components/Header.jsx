import { Link, useLocation } from "react-router-dom";
import ParlamentLogo from "./ParlamentLogo";
import MParlamentLogo from "./MParlamentLogo";
import "../App.css";

export default function Header() {
	const location = useLocation();

	const isDashboard = location.pathname === "/dashboard";
	const isResolutions = location.pathname === "/uchwaly";

	return (
		<header className="header">
			<a href="https://parlamentmlodych.eu/" className="header__logo">
				<ParlamentLogo />
			</a>

			<MParlamentLogo />

			{isDashboard ? (
				<button
					className="logout-button"
					onClick={() => {
						// logout logic
						localStorage.removeItem("admin");
						window.location.href = "/";
					}}
				>
					<span className="logout-button__icon">
						<LogoutIcon />
					</span>

					<span className="logout-button__label">Wyloguj się</span>
				</button>
			) : isResolutions ? (
				<button
					className="zlozUchwale-button"
					onClick={() => {
						// logout logic
						localStorage.removeItem("admin");
						window.location.href = "/";
					}}
				>
					<span className="zlozUchwale-button__label">Złóż uchwałę</span>
				</button>
			) : (
				<Link to="/zaloguj" className="login-button">
					<span className="login-button__icon">
						<LoginIcon />
					</span>

					<span className="login-button__label">Zaloguj się</span>
				</Link>
			)}
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

function LogoutIcon() {
	return (
		<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<g id="SVGRepo_bgCarrier" stroke-width="0"></g>
			<g
				id="SVGRepo_tracerCarrier"
				stroke-linecap="round"
				stroke-linejoin="round"
			></g>
			<g id="SVGRepo_iconCarrier">
				<path d="M7.707,8.707,5.414,11H17a1,1,0,0,1,0,2H5.414l2.293,2.293a1,1,0,1,1-1.414,1.414l-4-4a1,1,0,0,1,0-1.414l4-4A1,1,0,1,1,7.707,8.707ZM21,1H13a1,1,0,0,0,0,2h7V21H13a1,1,0,0,0,0,2h8a1,1,0,0,0,1-1V2A1,1,0,0,0,21,1Z"></path>
			</g>
		</svg>
	);
}
