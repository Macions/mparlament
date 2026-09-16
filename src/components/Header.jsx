import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ParlamentLogo from "./ParlamentLogo";
import MParlamentLogo from "./MParlamentLogo";
import styles from "./Header.module.css";

export default function Header() {
	const location = useLocation();
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	useEffect(() => {
		setIsLoggedIn(!!localStorage.getItem("token"));
	}, [location]);

	const logout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setIsLoggedIn(false);
		window.location.href = "/newapp/#/";
	};

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<Link to="/" className={styles.logo}>
					<ParlamentLogo />
				</Link>

				<div className={styles.brand}>
					<MParlamentLogo />
				</div>

				<div className={styles.actions}>
					{isLoggedIn ? (
						<button className={styles.authBtn} onClick={logout}>
							<LogoutIcon />
							<span>Wyloguj</span>
						</button>
					) : (
						<Link to="/zaloguj" className={styles.authBtn}>
							<LoginIcon />
							<span>Zaloguj</span>
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}

function LoginIcon() {
	return (
		<svg
			className="header-icon"
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
			<polyline points="10 17 15 12 10 7" />
			<line x1="15" y1="12" x2="3" y2="12" />
		</svg>
	);
}

function LogoutIcon() {
	return (
		<svg
			className="header-icon"
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</svg>
	);
}