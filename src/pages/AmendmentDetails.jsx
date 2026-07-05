import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentDetails.css";

import { bills, amendments, resolutions } from "../data/legislation";

function applyAllChanges(bill, changes) {
	const updated = structuredClone(bill);

	changes.forEach((change) => {
		const article = updated.articles.find((a) => a.id === change.articleId);
		if (article) {
			article.before = article.content;
			article.content = change.to || article.content;
			article.changed = true;
		}
	});

	return updated;
}

export default function AmendmentDetails() {
	const { slug, amendmentId } = useParams();

	const bill = bills.find((b) => b.slug === slug);
	const resolution = resolutions.find((r) => r.slug === slug);

	const relatedBill =
		bill ||
		(resolution?.billId ? bills.find((b) => b.id === resolution.billId) : null);

	const group = amendments.find((a) => a.id === amendmentId);

	// bierzemy wszystkie zmiany które pasują do tego billa
	const changes =
		group?.changes?.filter((c) =>
			relatedBill?.articles.some((a) => a.id === c.articleId),
		) || [];

	const processedBill = useMemo(() => {
		if (!relatedBill || changes.length === 0) return null;
		return applyAllChanges(relatedBill, changes);
	}, [relatedBill, changes]);

	if (!relatedBill || !group) {
		return <div>Nie znaleziono poprawki</div>;
	}

	// console.log(group?.changes);
	const changedArticles =
		processedBill?.articles.filter((a) => a.changed) || [];

	return (
		<div className="amendment-details">
			<div className="uchwaly-bar">
				<Link to={`/${slug}/poprawki`} className="uchwaly-title">
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

			<div className="main-content">
				<h1 className="page-title">Poprawki autorstwa {group.author}</h1>

				<div className={`status-badge ${group.status}`}>
					{group.status === "accepted" && "Przyjęta"}
					{group.status === "pending" && "Oczekuje"}
					{group.status === "rejected" && "Odrzucona"}
				</div>

				{changedArticles.length > 0 ? (
					changedArticles.map((article, index) => (
						<div key={article.id} className="changes-group">
							<h3>Zmiana {index + 1}</h3>
							<div className="diff-section">
								<div className="old-section">
									<h4>Przed poprawką</h4>
									<p>{article.before || "(nowy artykuł)"}</p>
								</div>

								<div className="new-section">
									<h4>Po poprawce</h4>
									<p>{article.content || "(usunięcie artykułu)"}</p>
								</div>
							</div>
						</div>
					))
				) : (
					<p className="no-changes">Brak zmian do wyświetlenia.</p>
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
