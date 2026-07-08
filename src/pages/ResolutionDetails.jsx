import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./ResolutionDetails.css";
import { createPortal } from "react-dom";
import { resolutions } from "../data/legislation";

export default function ResolutionDetails() {
	useEffect(() => {
		window.scrollTo({
			top: 0,
			behavior: "instant",
		});
	}, []);

	const { slug } = useParams();

	const [showSignatures, setShowSignatures] = useState(false);

	const resolution = resolutions.find((r) => r.slug === slug);

	const signedUsers = [
		{
			name: "Jan Kowalski",
			club: "Klub Postępu",
			date: "07.07.2026, 14:32",
		},
		{
			name: "Anna Nowak",
			club: "Grono Koordynatorskie",
			date: "07.07.2026, 15:10",
		},
		{
			name: "Piotr Wiśniewski",
			club: "Koło Młodych",
			date: "07.07.2026, 16:05",
		},
	];

	if (!resolution) {
		return <h2>Nie znaleziono uchwały</h2>;
	}

	return (
		<div className="mparlament-page">
			<div className="uchwaly-bar">
				<Link className="uchwaly-title" to="/uchwaly">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="50"
						height="50"
						fill="currentColor"
						className="bi bi-arrow-left"
						viewBox="0 0 16 16"
					>
						<path
							fillRule="evenodd"
							d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
						/>
					</svg>
					WRÓĆ
				</Link>

				<div className="session-info">
					Posiedzenie: Warszawa
					<br />
					<span>20.05</span>
				</div>
			</div>

			<main className="resolution-card">
				<h1 className="resolution-title">{resolution.title}</h1>

				<div className="resolution-grid">
					<div className="resolution-left">
						<div className="file-box">
							<a
								href={`/${resolution.fileName}`}
								className="file-link"
								target="_blank"
								rel="noopener noreferrer"
							>
								{resolution.fileName}
							</a>
						</div>

						<div className="signatures-row">
							<div className="signatures-count">
								<div>Podpisy: {resolution.signatures}</div>

								<button
									className="btn btn-pill btn-cyan btn-small check-signatures-btn"
									onClick={() => setShowSignatures(true)}
								>
									Sprawdź kto podpisał
								</button>
							</div>
						</div>
					</div>

					<div className="resolution-right">
						<p className="resolution-author">
							Autor: <strong>{resolution.author}</strong> ({resolution.party})
						</p>

						<button className="btn btn-pill btn-cyan btn-wide sign-btn">
							PODPISZ UCHWAŁĘ
						</button>

						<Link
							to={`/${resolution.slug}/poprawki`}
							className="btn btn-pill btn-red btn-wide amend-btn"
						>
							WYŚWIETL POPRAWKI
						</Link>
					</div>
				</div>
			</main>
			{showSignatures &&
				createPortal(
					<>
						<div
							className="signatures-overlay"
							onClick={() => setShowSignatures(false)}
						></div>

						<div className="signatures-panel">
							<div className="signatures-header">
								<h2>Kto podpisał?</h2>

								<button
									className="close-panel"
									onClick={() => setShowSignatures(false)}
								>
									✕
								</button>
							</div>

							<div className="signatures-total">
								Liczba podpisów: <strong>{signedUsers.length}</strong>
							</div>

							<div className="signatures-list">
								{signedUsers.map((user, index) => (
									<div className="signature-item" key={index}>
										<div className="signature-avatar" style={{ background: `hsl(${index * 45 % 360}, 70%, 90%)` }}>
											{user.name.charAt(0).toUpperCase()}
										</div>
										<div className="signature-info">
											<strong>{user.name}</strong>
											<p>{user.club}</p>
											<span>{user.date}</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</>,
					document.body
				)}
		</div>
	);
}
