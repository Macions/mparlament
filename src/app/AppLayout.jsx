import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../features/dashboard/components/Sidebar";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
	return (
		<div className={styles.layout}>
			<Sidebar />
			<Header />
			<main className={styles.content}>
				<Outlet />
			</main>
		</div>
	);
}
