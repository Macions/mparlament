import Header from "../components/Header";
import SocialFooter from "../components/SocialFooter";

import { useLocation } from "react-router-dom";

import AppRoutes from "../routes/AppRoutes";

import "./App.css";

import useReveal from "../hooks/useReveal";



export default function App() {
	const location = useLocation();

	useReveal();

	return (
		<div className="app" key={location.pathname}>
			<Header />

			<main className="main">
				<AppRoutes />
			</main>

			<SocialFooter />
		</div>
	);
}
