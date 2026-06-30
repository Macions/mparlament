import React from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentsPage.css";

const amendments = [
	{
		id: 1,
		billId: 1,
		title: "Zmiana art. 4",
		status: "pending",
		author: "Klub XYZ",
	},
	{
		id: 2,
		billId: 2,
		title: "Usunięcie punktu",
		status: "accepted",
		author: "Klub ABC",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
	{
		id: 3,
		billId: 1,
		title: "Dodanie nowego ustępu",
		status: "rejected",
		author: "Klub DEF",
	},
];

export default function AmendmentsPage() {
	const { id } = useParams();

	return (
		<div className="amendments-page">
			{/* Pasek nawigacyjny */}
			<div className="uchwaly-bar">
				<a className="uchwaly-title" href="/uchwaly">
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
				</a>
				<div className="session-info">
					Posiedzenie: Warszawa
					<br />
					<span>20.05</span>
				</div>
			</div>

			{/* Główna zawartość */}
			<div className="amendments-container">
				<h1 className="page-title">
					Poprawki do uchwały #{id}
					{name !== "" && (
						<>
							<br />
							<blockquote>&bdquo;{name}&rdquo;</blockquote>
						</>
					)}
				</h1>
				<div className="addAmendment">
					<button>Dodaj poprawkę</button>
				</div>
				<div className="amendments-list">
					{amendments.map((amendment) => (
						<div key={amendment.id} className="amendment-card">
							<div className="amendment-main">
								<div className="amendment-id">Poprawka nr {amendment.id}</div>
								<div className="amendment-title">{amendment.title}</div>
								<div className="amendment-author">
									Autor: {amendment.author}
								</div>
							</div>

							<div className="amendment-status">
								<div className={`status-badge ${amendment.status}`}>
									{amendment.status === "accepted" && "Przyjęta"}
									{amendment.status === "pending" && "Oczekuje"}
									{amendment.status === "rejected" && "Odrzucona"}
								</div>

								<Link
									to={`/uchwaly/${id}/poprawki/${amendment.id}`}
									className="read-more"
								>
									Wyświetl szczegóły
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
