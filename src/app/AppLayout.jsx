import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../features/dashboard/components/Sidebar";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }) {
	return (
		<div className={styles.layout}>
			<Sidebar />
			<div className={styles.main}>
				<Header />
				<main className={styles.content}>{children ?? <Outlet />}</main>
			</div>
		</div>
	);
}
