import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentDetails.css";

export default function AmendmentDetails() {
	const { slug, amendmentId } = useParams();

	const [resolution, setResolution] = useState(null);
	const [amendment, setAmendment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetch(`/api/resolutions/${slug}/amendments/${amendmentId}`)
			.then((res) => {
				if (!res.ok) {
					throw new Error("Nie znaleziono poprawki");
				}
				return res.json();
			})
			.then((data) => {
				setResolution(data.resolution);
				setAmendment(data.amendment);
				setError(null);
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [slug, amendmentId]);

	if (loading) {
		return <div className="loading">Ładowanie poprawki...</div>;
	}

	if (error || !amendment) {
		return <div className="error">Nie znaleziono poprawki</div>;
	}

	const getStatusLabel = (status) => {
		const statusMap = {
			accepted: "Przyjęta",
			pending: "Oczekuje",
			rejected: "Odrzucona",
			withdrawn: "Wycofana",
		};
		return statusMap[status] || status;
	};

	return (
		<div className="amendments-details">
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
				<h1 className="page-title">
					Poprawka do uchwały
					<br />
					<span className="resolution-title">„{resolution?.title}”</span>
				</h1>

				<div className="amendment-meta">
					<div className="amendment-author">
						Autor: <strong>{amendment.author}</strong>
					</div>

					<div className={`status-badge ${amendment.status}`}>
						{getStatusLabel(amendment.status)}
					</div>
				</div>

				{amendment.withdrawnReason && (
					<div className="withdrawn-reason">
						Powód wycofania: {amendment.withdrawnReason}
					</div>
				)}

				<div className="amendment-content">
					<h2>Treść poprawki</h2>
					<div className="content-box">
						{amendment.content}
					</div>
				</div>

				{amendment.changes && amendment.changes.length > 0 && (
					<div className="changes-section">
						<h2>Zmiany w uchwale</h2>
						{amendment.changes.map((change, index) => (
							<div key={index} className="change-item">
								<h3>Zmiana {index + 1}</h3>
								<div className="diff-section">
									<div className="old-section">
										<h4>Przed poprawką</h4>
										<p>{change.before || "(nowy artykuł)"}</p>
									</div>
									<div className="new-section">
										<h4>Po poprawce</h4>
										<p>{change.after || "(usunięcie artykułu)"}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}