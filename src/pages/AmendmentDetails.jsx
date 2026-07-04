import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentDetails.css";

// MOCK ustawy (docx już "sparowany")
const bills = [
	{
		id: 1,
		title: "Ustawa o rolnictwie",
		articles: [
			{ id: 1, content: "Art. 1: Państwo wspiera rolnictwo." },
			{ id: 2, content: "Art. 2: Dotacje są przyznawane rolnikom." },
			{ id: 4, content: "Art. 4: Rolnictwo jest strategiczne." },
		],
	},
];

// MOCK poprawek (docx/DB później)
const amendments = [
	{
		id: 1,
		billId: 1,
		title: "Zmiana art. 4",
		type: "change",
		target: {
			article: 4,
		},
		from: "Rolnictwo jest strategiczne.",
		to: "Rolnictwo jest kluczowe dla bezpieczeństwa państwa.",
	},
];

function applyAmendment(bill, amendment) {
	const updated = structuredClone(bill);

	const article = updated.articles.find(
		(a) => a.id === amendment.target.article,
	);

	if (article) {
		article.before = article.content;
		article.content = amendment.to;
		article.changed = true;
	}

	return updated;
}

export default function AmendmentDetails() {
	const { id } = useParams();

	const amendment = amendments.find((a) => a.id === Number(id));

	const bill = bills.find((b) => b.id === amendment?.billId);

	const processedBill = useMemo(() => {
		if (!bill || !amendment) return null;
		return applyAmendment(bill, amendment);
	}, [bill, amendment]);

	if (!amendment || !bill) {
		return <div>Nie znaleziono poprawki</div>;
	}

	return (
		<div className="amendment-details">
			<div className="top-bar">
				<Link to={`/uchwaly/${bill.id}/poprawki`}>← wróć do listy</Link>

				<h1>{amendment.title}</h1>

				<button>Generuj nową ustawę</button>
			</div>

			<div className="grid">
				{/* BEFORE */}
				<div className="panel">
					<h2>Przed poprawką</h2>

					{bill.articles.map((a) => (
						<div key={a.id} className="article">
							<h3>Art. {a.id}</h3>
							<p>{a.content}</p>
						</div>
					))}
				</div>

				{/* AFTER */}
				<div className="panel">
					<h2>Po poprawce</h2>

					{processedBill.articles.map((a) => (
						<div key={a.id} className="article">
							<h3>Art. {a.id}</h3>

							<p>{a.content}</p>

							{a.before && (
								<div className="diff">
									<span className="old">{a.before}</span>
									<span className="arrow">→</span>
									<span className="new">{a.content}</span>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
