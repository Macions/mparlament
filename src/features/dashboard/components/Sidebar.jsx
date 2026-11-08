import ParlamentLogo from "../../../components/ParlamentLogo";
import { NavLink } from "react-router-dom";
import {
	Vote,
	FileText,
	FilePlus2,
	ShieldCheck,
	LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
	const { user, isAdmin } = useAuth();

	const links = [
		{ to: "/glosowania", label: "Głosowania", icon: Vote },
		{ to: "/uchwaly", label: "Uchwały", icon: FileText },
		{ to: "/zloz-uchwale", label: "Nowa uchwała", icon: FilePlus2 },
		...(isAdmin
			? [
					{
						to: "/finalizuj-uchwale",
						label: "Administrator",
						icon: ShieldCheck,
					},
				]
			: []),
	];

	return (
		<aside className={styles.sidebar}>
			<div className={styles.brand}>
				<ParlamentLogo />
			</div>

			<nav className={styles.nav}>
				<NavLink
					to="/panel"
					end
					className={({ isActive }) =>
						isActive
							? `${styles.navItem} ${styles.navItemActive}`
							: styles.navItem
					}
				>
					<LayoutDashboard size={18} />
					Przegląd
				</NavLink>
				{links.map(({ to, label, icon: Icon }) => (
					<NavLink
						key={to}
						to={to}
						className={({ isActive }) =>
							isActive
								? `${styles.navItem} ${styles.navItemActive}`
								: styles.navItem
						}
					>
						<Icon size={18} />
						{label}
					</NavLink>
				))}
			</nav>

			<div className={styles.sidebarUser}>
				<div className={styles.avatar}>
					{(user?.name?.[0] || "?").toUpperCase()}
				</div>
				<div className={styles.identityText}>
					<strong className={styles.identityName}>{user?.name}</strong>
					{user?.club && (
						<span className={styles.identityClub}>{user.club}</span>
					)}
				</div>
			</div>
		</aside>
	);
}
