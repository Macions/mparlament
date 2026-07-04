import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentDetails.css";

import { bills, amendments } from "../data/legislation";

function applyAmendment(bill, amendment) {
	const updated = structuredClone(bill);
	const article = updated.articles.find(a => a.id === amendment.target?.article);

	if (article) {
		article.before = article.content;
		article.content = amendment.to || article.content;
		article.changed = true;
	}
	return updated;
}

export default function AmendmentDetails() {
	const { id, amendmentId } = useParams();
	const billId = Number(id);
	const amdId = Number(amendmentId);

	const amendment = amendments.find(a => a.id === amdId);
	const bill = bills.find(b => b.id === billId);

	const processedBill = useMemo(() => {
		if (!bill || !amendment) return null;
		return applyAmendment(bill, amendment);
	}, [bill, amendment]);

	if (!amendment || !bill) {
		return <div>Nie znaleziono poprawki</div>;
	}

	const changedArticle = processedBill?.articles.find(a => a.changed);

	return (
		<div className="amendment-details">
			<div className="uchwaly-bar">
				<Link to={`/uchwala/${bill.id}/poprawki`} className="uchwaly-title">
					<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" viewBox="0 0 16 16">
						<path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
					</svg>
					WRÓĆ
				</Link>

				<div className="session-info">
					Posiedzenie: Warszawa<br />
					<span>20.05</span>
				</div>
			</div>

			<div className="main-content">
				<h1 className="page-title">{amendment.title}</h1>

				{changedArticle && (
					<div className="diff-section">
						<div className="old-section">
							<h3>Przed poprawką</h3>
							<p>{changedArticle.before}</p>
						</div>

						<div className="new-section">
							<h3>Po poprawce</h3>
							<p>{changedArticle.content}</p>
						</div>
					</div>
				)}

				<div className="generate-section">
					<button className="generate-btn">
						Generuj uchwałę po poprawkach
					</button>
				</div>
			</div>
		</div>
	);
}