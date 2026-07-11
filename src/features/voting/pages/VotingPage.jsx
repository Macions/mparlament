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

export default function VotingPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [vote, setVote] = useState(null);
	const [pendingVote, setPendingVote] = useState(null);
	const [now, setNow] = useState(Date.now());
	const [error, setError] = useState("");

	const token = localStorage.getItem("token");

	// Pobranie głosowania
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
			} catch (error) {
				setError(error.message);
			}
		}

		fetchVote();
	}, [id, token]);

	// Aktualizacja zegara
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

	return (
		<>
			<div className="voting-page">
				<button className="back-btn" onClick={() => navigate(-1)}>
					← Powrót
				</button>

				<div className="voting-container">
					<div className="voting-header">
						<span className="voting-type">{vote.category}</span>

						<span
							className={`voting-status ${
								isActive ? "active" : isFinished ? "finished" : "upcoming"
							}`}
						>
							{isActive ? "TRWA" : isFinished ? "ZAKOŃCZONE" : "OCZEKUJE"}
						</span>
					</div>

					<h1 className="voting-title">{vote.title}</h1>

					<p className="voting-description">{vote.description}</p>

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
