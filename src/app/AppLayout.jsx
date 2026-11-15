// src/app/AppLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../features/dashboard/components/Sidebar";
import styles from "./AppLayout.module.css";

export default function AppLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const openSidebar = () => setSidebarOpen(true);
	const closeSidebar = () => setSidebarOpen(false);

	return (
		<div className={styles.layout}>
			<Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />

			{sidebarOpen && (
				<div
					className={styles.overlay}
					onClick={closeSidebar}
					aria-hidden="true"
				/>
			)}

			<div className={styles.main}>
				<Header onMenuClick={openSidebar} />
				<main className={styles.content}>{children ?? <Outlet />}</main>
			</div>
		</div>
	);
}
