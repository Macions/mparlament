import React from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentsPage.css";

const amendments = [
  {
    id: "A-1",
    billId: 1,
    title: "Zmiana art. 4",
    status: "pending",
    author: "Klub XYZ"
  },
  {
    id: "A-2",
    billId: 2,
    title: "Usunięcie punktu",
    status: "accepted",
    author: "Klub ABC"
  },
  {
    id: "A-3",
    billId: 1,
    title: "Dodanie nowego ustępu",
    status: "rejected",
    author: "Klub DEF"
  }
];

export default function AmendmentsPage() {
	const { id } = useParams();

	return (
		<div className="amendments-page">
			{/* Pasek nawigacyjny */}
			<div className="nav-bar">
				<Link to={`/resolution/${id}`} className="back-btn">
					← WRÓĆ
				</Link>
				<div className="session-pill">
					Posiedzenie: Warszawa<br />
					<span>20.05</span>
				</div>
			</div>

			{/* Główna zawartość */}
			<div className="amendments-container">
				<h1 className="page-title">Poprawki do uchwały #{id}</h1>

				<div className="amendments-list">
					{amendments.map((amendment) => (
						<div key={amendment.id} className="amendment-card">
							<div className="amendment-main">
								<div className="amendment-id">{amendment.id}</div>
								<div className="amendment-title">{amendment.title}</div>
								<div className="amendment-author">
									Autor: {amendment.author}
								</div>
							</div>

							<div className="amendment-status">
								<span className={`status-badge ${amendment.status}`}>
									{amendment.status === "accepted" && "✅ Przyjęta"}
									{amendment.status === "pending" && "⏳ Oczekuje"}
									{amendment.status === "rejected" && "❌ Odrzucona"}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}