import React from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentsPage.css";

import { bills, amendments, resolutions } from "../data/legislation";

export default function AmendmentsPage() {
	const { id } = useParams();
	const billId = Number(id);

	const currentBill = bills.find((bill) => bill.id === billId);
	const currentResolution = resolutions.find((r) => r.id === billId);

	const billAmendments = amendments.filter(
		(amendment) => amendment.billId === billId
	);

	if (!currentBill && !currentResolution) {
		return <div>Nie znaleziono uchwały #{id}</div>;
	}

	// Pobieramy dane z bills lub resolutions
	const title = currentBill?.title || currentResolution?.title;
	const submittedBy = currentResolution?.submittedBy;
	const date = currentResolution?.date;
	const meeting = currentResolution?.meeting;

	// Rozbijamy meeting na części
	const meetingParts = meeting ? meeting.split(": ") : ["Posiedzenie: Warszawa", "20.05"];

	return (
		<div className="amendments-page">
			<div className="uchwaly-bar">
				<Link to={`/uchwala/${billId}`} className="uchwaly-title">
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
					{meetingParts[0]}
					<br />
					<span>{meetingParts[1] || ""}</span>
				</div>
			</div>

			<div className="amendments-container">
				<h1 className="page-title">
					Poprawki do uchwały #{billId}
					{title && (
						<>
							<br />
							<blockquote>&bdquo;{title}&rdquo;</blockquote>
						</>
					)}
				</h1>

				{submittedBy && (
					<p className="submitted-info">
						Wrzucona przez: <strong>{submittedBy}</strong>
					</p>
				)}

				{date && (
					<p className="date-info">
						Data: <strong>{date}</strong>
					</p>
				)}

				<div className="addAmendment">
					<button>Dodaj poprawkę</button>
				</div>

				<div className="amendments-list">
					{billAmendments.length > 0 ? (
						billAmendments.map((amendment) => (
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
										to={`/uchwala/${billId}/poprawka/${amendment.id}`}
										className="read-more"
										state={{ amendment }}
									>
										Wyświetl szczegóły
									</Link>
								</div>
							</div>
						))
					) : (
						<p>Nie ma jeszcze żadnych poprawek do tej uchwały.</p>
					)}
				</div>
			</div>
		</div>
	);
}