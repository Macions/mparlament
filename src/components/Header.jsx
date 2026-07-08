import { Link, useLocation } from "react-router-dom";
import ParlamentLogo from "./ParlamentLogo";
import MParlamentLogo from "./MParlamentLogo";

export default function Header() {
	const location = useLocation();

	const isDashboard = location.pathname === "/dashboard";
	const isResolutions = location.pathname === "/uchwaly";

	return (
		<header className="header">
			{/* Górny rząd - ParlamentLogo + MParlamentLogo + przycisk */}
			<div className="header__top">
				<div className="header__left">
					<a
						href="https://parlamentmlodych.eu/"
						className="parlament-logo-link"
					>
						<ParlamentLogo />
					</a>
				</div>

				{/* Środek - MParlamentLogo (widoczny na dużych ekranach) */}
				<div className="header__center">
					<MParlamentLogo />
				</div>

				<div className="header__right">
					{isDashboard ? (
						<button
							className="logout-button"
							onClick={() => {
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
						<Link to="/zloz-uchwale" className="zlozUchwale-button">
							<span className="zlozUchwale-button__label">Złóż uchwałę</span>
						</Link>
					) : (
						<Link to="/zaloguj" className="login-button">
							<span className="login-button__icon">
								<LoginIcon />
							</span>
							<span className="login-button__label">Zaloguj się</span>
						</Link>
					)}
				</div>
			</div>

			{/* Dolny rząd - tylko MParlamentLogo (widoczny na małych ekranach) */}
			<div className="header__bottom">
				<MParlamentLogo />
			</div>
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
			<g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
			<g
				id="SVGRepo_tracerCarrier"
				strokeLinecap="round"
				strokeLinejoin="round"
			></g>
			<g id="SVGRepo_iconCarrier">
				<path d="M7.707,8.707,5.414,11H17a1,1,0,0,1,0,2H5.414l2.293,2.293a1,1,0,1,1-1.414,1.414l-4-4a1,1,0,0,1,0-1.414l4-4A1,1,0,1,1,7.707,8.707ZM21,1H13a1,1,0,0,0,0,2h7V21H13a1,1,0,0,0,0,2h8a1,1,0,0,0,1-1V2A1,1,0,0,0,21,1Z"></path>
			</g>
		</svg>
	);
}
