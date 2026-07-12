import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./VotingPage.css";

function formatTime(sec) {
	if (sec <= 0) return "0s";

	if (sec < 60) return `${sec}s`;

	const min = Math.floor(sec / 60);
	const s = sec % 60;

	if (min < 60) {
		return s ? `${min} min ${s}s` : `${min} min`;
	}

	const h = Math.floor(min / 60);
	const m = min % 60;

	return m ? `${h}h ${m}min` : `${h}h`;
}

function formatVote(v) {
	switch (v) {
		case "for":
			return "ZA";

		case "against":
			return "PRZECIW";

		case "abstain":
			return "WSTRZYMANIE";

		default:
			return "BRAK";
	}
}


const getCategoryLabel = (category) => {
	const labels = {
		resolution: "Uchwała",
		amendment: "Poprawka",
		law: "Ustawa",
		budget: "Budżet",
		committee: "Komisja",
		other: "Inne"
	};
	return labels[category] || category || "Nieznana";
};
const getApplicantLabel = (applicant) => {
	const labels = {
		marshal: "Marszałek Parlamentu",
		presidium: "Prezydium Parlamentu",
		group_15: "Grupa 15 posłów",
		individual: "Pojedynczy poseł"
	};
	return labels[applicant] || applicant || "Nieznany";
};
const getStatusLabel = (status) => {
	const statusMap = {
		pending: 'Oczekująca',
		accepted: 'Przyjęta',
		rejected: 'Odrzucona',
		withdrawn: 'Wycofana',
		active: 'Aktywna',
		inactive: 'Nieaktywna',
		archived: 'Zarchiwizowana'
	};
	return statusMap[status] || status || 'Nieznany';
};

export default function VotingPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [vote, setVote] = useState(null);
	const [pendingVote, setPendingVote] = useState(null);
	const [now, setNow] = useState(Date.now());
	const [error, setError] = useState("");
	const [linkedItem, setLinkedItem] = useState(null);
	const [linkedItemType, setLinkedItemType] = useState(null);

	const token = localStorage.getItem("token");


	useEffect(() => {
		async function fetchVote() {
			try {
				const response = await fetch(`/api/votings/${id}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.message || "Nie udało się pobrać głosowania");
				}

				setVote(data);


				if (data.linkedItemType && data.linkedItemType !== "none" && data.linkedItemId) {
					setLinkedItemType(data.linkedItemType);
					console.log("Dane głosowania:", data);
					console.log("linkedItemType:", data.linkedItemType);
					console.log("linkedItemId:", data.linkedItemId);

					let endpoint = "";
					if (data.linkedItemType === "resolution") {
						endpoint = `/api/resolutions/${data.linkedItemId}`;
					} else if (data.linkedItemType === "amendment") {
						endpoint = `/api/amendments/${data.linkedItemId}`;
					}

					if (endpoint) {
						try {
							const linkedRes = await fetch(endpoint, {
								headers: {
									Authorization: `Bearer ${token}`,
								},
							});
							if (linkedRes.ok) {
								const linkedData = await linkedRes.json();
								console.log("Pobrany linkedItem:", linkedData);
								setLinkedItem(linkedData.data || linkedData);
							}
						} catch (err) {
							console.error("Nie udało się pobrać powiązanego obiektu:", err);
						}
					}
				}
			} catch (error) {
				setError(error.message);
			}
		}

		fetchVote();
	}, [id, token]);


	useEffect(() => {
		const interval = setInterval(() => {
			setNow(Date.now());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	async function confirmVote() {
		try {
			const response = await fetch(`/api/votings/${id}/vote`, {
				method: "POST",

				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},

				body: JSON.stringify({
					vote: pendingVote,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Nie udało się oddać głosu");
			}

			setVote((prev) => ({
				...prev,

				hasVoted: true,
				myVote: data.vote,
			}));

			setPendingVote(null);
		} catch (error) {
			setError(error.message);
		}
	}

	if (error) {
		return <h2>{error}</h2>;
	}

	if (!vote) {
		return <h2>Ładowanie...</h2>;
	}

	const startTime = new Date(vote.startTime).getTime();
	const endTime = new Date(vote.endTime).getTime();

	const isUpcoming = now < startTime;
	const isActive = now >= startTime && now < endTime;
	const isFinished = now >= endTime;

	const remainingSec = Math.max(0, Math.floor((endTime - now) / 1000));

	const canEdit = vote.userRole === "admin" || vote.userRole === "marshal";


	const categoryLabel = getCategoryLabel(vote.category);
	const statusLabel = getStatusLabel(vote.status);

	return (
		<>
			<div className="voting-page">
				<button className="back-btn" onClick={() => navigate(-1)}>
					← Powrót
				</button>

				<div className="voting-container">
					<div className="voting-header">
						<span className="voting-type">{categoryLabel}</span>

						<span
							className={`voting-status ${isActive ? "active" : isFinished ? "finished" : "upcoming"
								}`}
						>
							{isActive ? "TRWA" : isFinished ? "ZAKOŃCZONE" : "OCZEKUJE"}
						</span>
					</div>

					<h1 className="voting-title">{vote.title}</h1>

					
					<div className="voting-details">
						{vote.description && (
							<div className="voting-description">
								<h3>Opis:</h3>
								<p>{vote.description}</p>
							</div>
						)}

						
						<div className="voting-meta">
							<div className="meta-item">
								<span className="meta-label">Kategoria:</span>
								<span className="meta-value">{categoryLabel}</span>
							</div>
							{vote.status && (
								<div className="meta-item">
									<span className="meta-label">Status:</span>
									<span className="meta-value">{statusLabel}</span>
								</div>
							)}
							{vote.applicant && (
								<div className="meta-item">
									<span className="meta-label">Wnioskodawca:</span>
									<span className="meta-value">{getApplicantLabel(vote.applicant)}</span>
								</div>
							)}
							<div className="meta-item">
								<span className="meta-label">Data rozpoczęcia:</span>
								<span className="meta-value">{new Date(startTime).toLocaleString()}</span>
							</div>
							<div className="meta-item">
								<span className="meta-label">Data zakończenia:</span>
								<span className="meta-value">{new Date(endTime).toLocaleString()}</span>
							</div>
						</div>

						
						{linkedItem && (
							<div className="voting-linked-item">
								<h3>Powiązane:</h3>
								<div className="linked-item-card">
									<div className="linked-item-header">
										<span className="linked-item-type">
											{linkedItemType === "resolution" ? "Uchwała" : "Poprawka"}
										</span>
										{linkedItem.status && (
											<span className="linked-item-status">
												{getStatusLabel(linkedItem.status)}
											</span>
										)}
									</div>
									<h4 className="linked-item-title">{linkedItem.title}</h4>
									{linkedItem.content && (
										<p className="linked-item-content">{linkedItem.content}</p>
									)}
									{linkedItem.description && (
										<p className="linked-item-content">{linkedItem.description}</p>
									)}
									{linkedItem.preamble && (
										<p className="linked-item-content">{linkedItem.preamble}</p>
									)}
									<div className="linked-item-meta">
										{linkedItem.author && (
											<span>Autor: {linkedItem.author}</span>
										)}
										{linkedItem.createdAt && (
											<span>Data: {new Date(linkedItem.createdAt).toLocaleDateString()}</span>
										)}
									</div>
									<button
										className="btn-goto-linked"
										onClick={() => {

											if (linkedItemType === "resolution") {
												navigate(`/${linkedItem.slug}`);
											} else if (linkedItemType === "amendment") {

												const resolutionSlug = linkedItem.resolution?.slug || linkedItem.resolutionId;
												navigate(`/${resolutionSlug}/poprawka/${linkedItem.id}`);
											}
										}}
									>
										Zobacz szczegóły →
									</button>
								</div>
							</div>
						)}

						
						{(!vote.linkedItemType || vote.linkedItemType === "none") && (
							<div className="voting-linked-item no-link">
								<p className="no-link-text">Brak powiązania z uchwałą lub poprawką</p>
							</div>
						)}
					</div>

					{isActive && (
						<p
							style={{
								fontSize: "1.1rem",
								marginBottom: "20px",
							}}
						>
							Do końca:
							<strong> {formatTime(remainingSec)}</strong>
						</p>
					)}

					{isUpcoming && (
						<p style={{ opacity: 0.7 }}>
							Głosowanie jeszcze się nie rozpoczęło
						</p>
					)}

					{isActive && (
						<div className="vote-options">
							<h3>Twój głos</h3>

							{vote.hasVoted ? (
								<p>
									Już zagłosowałeś:
									<strong> {formatVote(vote.myVote)}</strong>
								</p>
							) : (
								<div className="vote-buttons">
									<button
										className="vote-btn for"
										onClick={() => setPendingVote("for")}
									>
										ZA
									</button>

									<button
										className="vote-btn against"
										onClick={() => setPendingVote("against")}
									>
										PRZECIW
									</button>

									<button
										className="vote-btn abstain"
										onClick={() => setPendingVote("abstain")}
									>
										WSTRZYMANIE
									</button>
								</div>
							)}
						</div>
					)}

					{isFinished && (
						<div className="voting-finished">
							<h3>Głosowanie zakończone</h3>
							<p>Wyniki zostaną przedstawione na stronie głosowań.</p>
						</div>
					)}
				</div>
			</div>

			{pendingVote && (
				<div className="modal-backdrop">
					<div className="modal">
						<h3>Potwierdź głos</h3>

						<p>
							Czy na pewno chcesz zagłosować:
							<strong> {formatVote(pendingVote)}</strong>?
						</p>

						<div className="modal-actions">
							<button onClick={() => setPendingVote(null)}>Anuluj</button>

							<button onClick={confirmVote} className="confirm">
								Potwierdź
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}