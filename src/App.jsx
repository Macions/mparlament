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
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import ResolutionDetails from "./pages/ResolutionDetails";

export default function App() {
	const location = useLocation();

	return (
		<div
			className={`app ${location.pathname === "/zloz-uchwale" ? "no-bg" : ""}`}
		>
			<Header />
			<main className="main">
				<Routes>
					<Route path="/" element={<Home />} />

					<Route path="/o-parlamencie" element={<About />} />
					<Route path="/posiedzenia" element={<Meetings />} />
					<Route path="/parlamentarzysci" element={<Members />} />

					<Route path="/zaloguj" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/uchwaly" element={<Resolutions />} />
					<Route path="/zloz-uchwale" element={<SubmitResolution />} />
					<Route path="/uchwaly/:id" element={<ResolutionDetails />} />
				</Routes>
			</main>
			<SocialFooter />
		</div>
	);
}
