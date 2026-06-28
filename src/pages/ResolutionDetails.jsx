import React from "react";
import { useParams } from "react-router-dom";
import "./ResolutionDetails.css";

const resolutions = [
	{
		id: 1,
		title: "Uchwała dotycząca wydobycia złota",
		fileName: "uchwała wydobycie złota.docx",
		author: "Piotr Nowak",
		party: "UNIA LIBERALNA",
		meeting: "Posiedzenie: Warszawa 20.05",
		signatures: 6,
		content: "Pełna treść uchwały o wydobyciu złota...",
	},
	{
		id: 2,
		title: "Uchwała dotycząca kalafiorów",
		fileName: "uchwała kalafiory.docx",
		author: "Anna Kowalska",
		party: "UNIA LIBERALNA",
		meeting: "Posiedzenie: Warszawa 20.05",
		signatures: 3,
		content: "Kalafiory są bardzo ważnym elementem gospodarki...",
	},
	{
		id: 3,
		title: "Uchwała na temat rolnictwa",
		fileName: "uchwała rolnictwo.docx",
		author: "Jan Wiśniewski",
		party: "UNIA LIBERALNA",
		meeting: "Posiedzenie: Warszawa 20.05",
		signatures: 8,
		content: "Rolnictwo to fundament państwa...",
	},
	{
		id: 4,
		title: "Uchwała na temat rolnictwa",
		fileName: "uchwała rolnictwo 2.docx",
		author: "Jan Wiśniewski",
		party: "UNIA LIBERALNA",
		meeting: "Posiedzenie: Warszawa 20.05",
		signatures: 2,
		content: "Druga uchwała o rolnictwie...",
	},
];

export default function ResolutionDetails() {
	const { id } = useParams();

	const resolution = resolutions.find((r) => r.id === Number(id));

	if (!resolution) {
		return <h2>Nie znaleziono uchwały</h2>;
	}

	return (
		<div className="mparlament-page">
			<div className="uchwaly-bar">
				<a className="uchwaly-title" href="/uchwaly">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="50"
						height="50"
						fill="currentColor"
						class="bi bi-arrow-left"
						viewBox="0 0 16 16"
					>
						<path
							fill-rule="evenodd"
							d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
						/>
					</svg>
					WRÓĆ
				</a>
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
								<button className="btn btn-pill btn-cyan btn-small check-signatures-btn">
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

						<button className="btn btn-pill btn-red btn-wide amend-btn">
							ZGŁOŚ POPRAWKĘ
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
