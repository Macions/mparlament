import Header from "./components/Header";
import SocialFooter from "./components/SocialFooter";

import Home from "./pages/Home";
import About from "./pages/About";
import Meetings from "./pages/Meetings";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Resolutions from "./pages/Resolutions";
import SubmitResolution from "./pages/SubmitResolution";
import AmendmentDetails from "./pages/AmendmentDetails";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import ResolutionDetails from "./pages/ResolutionDetails";
import AmendmentsPage from "./pages/AmendmentsPage";
import AddAmendment from "./pages/AddAmendment";
import { useEffect } from "react";
import usePageAnim from "./useReveal";
import VotingList from "./pages/VotingList";
import VotingPage from "./pages/VotingPage";
import CreateVoting from "./pages/CreateVoting";
import SessionDetails from "./pages/SessionDetails";
import Parliamentarians from "./pages/Parliamentarians";

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
					<Route path="/zaloguj" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/uchwaly" element={<Resolutions />} />
					<Route path="/zloz-uchwale" element={<SubmitResolution />} />
					<Route path="/:slug" element={<ResolutionDetails />} />
					<Route path="/:slug/poprawki" element={<AmendmentsPage />} />
					<Route path="/:slug/dodaj-poprawke" element={<AddAmendment />} />
					<Route
						path="/:slug/poprawka/:amendmentId"
						element={<AmendmentDetails />}
					/>
					<Route path="/glosowania" element={<VotingList />} />
					<Route path="/glosowanie/:id" element={<VotingPage />} />
					<Route path="/glosowania/nowe" element={<CreateVoting />} />
					<Route path="/posiedzenie" element={<SessionDetails />} />
					<Route path="/parlamentarzysci" element={<Parliamentarians />} />
				</Routes>
			</main>

			<SocialFooter />
		</div>
	);
}
