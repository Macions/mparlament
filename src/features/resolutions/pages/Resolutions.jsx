import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./resolutions.css";

export default function Resolutions() {
	const location = useLocation();
	const navigate = useNavigate();

	const [resolutions, setResolutions] = useState([]);
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("all");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);

				const sessionsRes = await fetch("/api/sessions");
				if (!sessionsRes.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const sessionsData = await sessionsRes.json();
				setSessions(sessionsData);

				const resolutionsRes = await fetch("/api/resolutions");
				if (!resolutionsRes.ok) throw new Error("Nie udało się pobrać uchwał");
				const resolutionsData = await resolutionsRes.json();
				setResolutions(resolutionsData.resolutions);
			} catch (error) {
				console.error("Błąd podczas pobierania danych:", error);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, []);

	useEffect(() => {
		const savedScroll = sessionStorage.getItem("resolutionsScroll");
		if (savedScroll) {
			window.scrollTo(0, Number(savedScroll));
			sessionStorage.removeItem("resolutionsScroll");
		}
	}, [location.pathname]);

	const filteredResolutions = resolutions.filter((resolution) => {
		if (selectedSessionId === "all") return true;
		return resolution.sessionId === Number(selectedSessionId); 
	});

	const getSessionName = (sessionId) => {
		const session = sessions.find((s) => s.id === sessionId);
		return session ? session.name : "Nieznane";
	};

	return (
		<div className="resolutions-page">
			<main>
				<button className="back-to-home-btn" onClick={() => navigate("/panel")}>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M15 18L9 12L15 6"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Panel
				</button>

				<div className="uchwaly-bar">
					<h1 className="uchwaly-title">UCHWAŁY</h1>

					<div className="session-selector">
						<label htmlFor="session-select">Posiedzenie:</label>
						<select
							id="session-select"
							value={selectedSessionId}
							onChange={(e) => setSelectedSessionId(e.target.value)}
							className="session-select"
						>
							<option value="all">Wszystkie posiedzenia</option>
							{sessions.map((session) => (
								<option key={session.id} value={session.id}>
									{session.name} - {session.date}
								</option>
							))}
						</select>
					</div>
				</div>

				{loading ? (
					<p className="loading-text">Ładowanie uchwał...</p>
				) : (
					<>
						<div className="resolutions-list">
							{filteredResolutions.length === 0 ? (
								<p className="no-resolutions">
									Brak uchwał dla wybranego posiedzenia.
								</p>
							) : (
								filteredResolutions.map((resolution) => (
									<div key={resolution.id} className="resolution-item">
										<p className="resolution-title">{resolution.title}</p>
										<Link
											to={`/${resolution.slug}`}
											onClick={() => {
												sessionStorage.setItem(
													"resolutionsScroll",
													window.scrollY.toString()
												);
											}}
										>
											<button className="read-btn">Przeczytaj</button>
										</Link>
									</div>
								))
							)}
						</div>
					</>
				)}
			</main>
		</div>
	);
}