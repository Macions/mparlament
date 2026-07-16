import { Routes, Route } from "react-router-dom";

import Home from "../features/home/pages/Home";
import ProtectedRoute from "./ProtectedRoute";

import SessionDetails from "../features/meetings/pages/SessionDetails";

import Login from "../features/authentication/pages/Login";

import FinalizeResolution from "../features/resolutions/pages/FinalizeResolution";

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
import LiveVoting from "../features/voting/pages/LiveVoting";
import { SocketProvider } from "../socket/SocketProvider";

export default function AppRoutes() {
	return (
		<SocketProvider>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/zaloguj" element={<Login />} />
				<Route path="/parlamentarzysci" element={<Parliamentarians />} />

				<Route path="/posiedzenie" element={<SessionDetails />} />
				<Route element={<ProtectedRoute />}>
					<Route path="/panel" element={<Dashboard />} />

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

					<Route
						path="/glosowanie/:id/szczegoly"
						element={<VotingDetailsPage />}
					/>
					<Route path="/finalizuj-uchwale" element={<FinalizeResolution />} />

					<Route path="/glosowanie/:id/edytuj" element={<EditVoting />} />
					<Route path="/glosowanie/:id/live" element={<LiveVoting />} />
				</Route>
			</Routes>
		</SocketProvider>
	);
}
