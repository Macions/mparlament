import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import SocialFooter from "./components/SocialFooter";

import Home from "./pages/Home";
import About from "./pages/About";
import Meetings from "./pages/Meetings";
import Members from "./pages/Members";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import "./App.css";

export default function App() {
	return (
		<div className="app">
			<Header />

			<main className="main">
				<Routes>
					<Route path="/" element={<Home />} />

					<Route path="/o-parlamencie" element={<About />} />
					<Route path="/posiedzenia" element={<Meetings />} />
					<Route path="/parlamentarzysci" element={<Members />} />

					<Route path="/zaloguj" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
				</Routes>
			</main>

			<SocialFooter />
		</div>
	);
}
