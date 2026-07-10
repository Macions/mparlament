import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./resolutions.css";


export default function Resolutions() {
	const location = useLocation();

	const [resolutions, setResolutions] = useState([]);
	const [session, setSession] = useState(null);


	useEffect(() => {
		fetch("/api/resolutions")
			.then((res) => res.json())
			.then((data) => {
				setResolutions(data.resolutions);
				setSession(data.session);
			})
			.catch((error) => {
				console.error(
					"Błąd podczas pobierania uchwał:",
					error
				);
			});
	}, []);



	useEffect(() => {
		const savedScroll = sessionStorage.getItem("resolutionsScroll");

		if (savedScroll) {
			window.scrollTo(0, Number(savedScroll));
			sessionStorage.removeItem("resolutionsScroll");
		}
	}, [location.pathname]);



	return (
		<div className="resolutions-page">
			<main>

				<div className="uchwaly-bar">

					<h1 className="uchwaly-title">
						<Link to="/dashboard" className="home-link">
							<i className="fas fa-house"></i>
						</Link>
						UCHWAŁY
					</h1>


					{session && (
						<div className="session-info">
							Posiedzenie: {session.city}
							<br />
							<span>{session.date}</span>
						</div>
					)}

				</div>



				<div className="resolutions-list">

					{resolutions.map((resolution) => (

						<div
							key={resolution.id}
							className="resolution-item"
						>

							<p className="resolution-title">
								{resolution.title}
							</p>


							<Link
								to={`/${resolution.slug}`}
								onClick={() => {
									sessionStorage.setItem(
										"resolutionsScroll",
										window.scrollY.toString()
									);
								}}
							>
								<button className="read-btn">
									Przeczytaj
								</button>
							</Link>

						</div>

					))}

				</div>

			</main>
		</div>
	);
}