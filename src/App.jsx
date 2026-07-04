import Header from "./components/Header";
import SocialFooter from "./components/SocialFooter";

import Home from "./pages/Home";
import About from "./pages/About";
import Meetings from "./pages/Meetings";
import Members from "./pages/Members";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Resolutions from "./pages/Resolutions";
import SubmitResolution from "./pages/SubmitResolution";
import AmendmentDetails from "./pages/AmendmentDetails";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import ResolutionDetails from "./pages/ResolutionDetails";
import AmendmentsPage from "./pages/AmendmentsPage";
import { useEffect } from "react";
import usePageAnim from "./useReveal";

export default function App() {
	const location = useLocation();
	usePageAnim();

	return (
		<div className="app" key={location.pathname}>
			<Header />

			<main className="main" key={location.pathname}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/o-parlamencie" element={<About />} />
					<Route path="/posiedzenia" element={<Meetings />} />
					<Route path="/parlamentarzysci" element={<Members />} />
					<Route path="/zaloguj" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/uchwaly" element={<Resolutions />} />
					<Route path="/zloz-uchwale" element={<SubmitResolution />} />
					<Route path="/uchwala/:id" element={<ResolutionDetails />} />
					<Route path="/uchwala/:id/poprawki" element={<AmendmentsPage />} />
					<Route
						path="/uchwala/:id/poprawka/:amendmentId"
						element={<AmendmentDetails />}
					/>
				</Routes>
			</main>

			<SocialFooter />
		</div>
	);
}
