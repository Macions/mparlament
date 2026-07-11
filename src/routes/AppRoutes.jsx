import { Routes, Route } from "react-router-dom";

import Home from "../features/home/pages/Home";

import SessionDetails from "../features/meetings/pages/SessionDetails";

import Login from "../features/authentication/pages/Login";

import Dashboard from "../features/dashboard/pages/Dashboard";

import Resolutions from "../features/resolutions/pages/Resolutions";
import ResolutionDetails from "../features/resolutions/pages/ResolutionDetails";
import SubmitResolution from "../features/resolutions/pages/SubmitResolution";

import AmendmentsPage from "../features/amendments/pages/AmendmentsPage";
import AddAmendment from "../features/amendments/pages/AddAmendment";
import AmendmentDetails from "../features/amendments/pages/AmendmentDetails";

import VotingList from "../features/voting/pages/VotingList";
import VotingPage from "../features/voting/pages/VotingPage";
import CreateVoting from "../features/voting/pages/CreateVoting";

import Parliamentarians from "../features/parliamentarians/pages/Parliamentarians";
import VotingDetailsPage from "../features/voting/pages/VotingDetailsPage";
import EditVoting from "../features/voting/pages/EditVoting";


export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Home />} />

			<Route path="/posiedzenie" element={<SessionDetails />} />

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

			<Route path="/parlamentarzysci" element={<Parliamentarians />} />
			<Route path="/glosowanie/:id/szczegoly" element={<VotingDetailsPage />} />
			<Route path="/glosowanie/:id/edytuj" element={<EditVoting />} />
		</Routes>
	);
}
