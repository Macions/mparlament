import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "./VotingPage.css";

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

function getResult(vote) {
	if (vote.votesFor > vote.votesAgainst) return "passed";
	if (vote.votesFor < vote.votesAgainst) return "rejected";
	return "tie";
}

function getStatusLabel(vote) {
	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();

	if (vote.status === "archived") return "ZARCHIWIZOWANE";
	if (now < start) return "OCZEKUJE";
	if (now >= start && now < end) return "TRWA";
	return "ZAKOŃCZONE";
}

function getStatusClass(vote) {
	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();

	if (vote.status === "archived") return "archived";
	if (now < start) return "upcoming";
	if (now >= start && now < end) return "active";
	return "finished";
}

export default function VotingDetailsPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [vote, setVote] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);

	const token = localStorage.getItem("token");

	useEffect(() => {
		async function fetchUser() {
			try {
				const response = await fetch("/api/auth/me", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) throw new Error();

				const user = await response.json();

				setIsAdmin(
					user.role === "admin" || user.permissions?.includes("MANAGE_VOTINGS"),
				);
			} catch {
				setIsAdmin(false);
			}
		}

		fetchUser();
	}, [token]);

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
			} finally {
				setLoading(false);
			}
		}

		fetchVote();
	}, [id, token]);

	if (loading) {
		return (
			<div className="voting-details-loading">
				<h2>Ładowanie szczegółów głosowania...</h2>
			</div>
		);
	}

	if (error) {
		return (
			<div className="voting-details-error">
				<h2>{error}</h2>
				<button onClick={() => navigate(-1)} className="back-btn">
					← Powrót
				</button>
			</div>
		);
	}

	if (!vote) {
		return (
			<div className="voting-details-notfound">
				<h2>Nie znaleziono głosowania</h2>
				<button onClick={() => navigate(-1)} className="back-btn">
					← Powrót
				</button>
			</div>
		);
	}

	const statusClass = getStatusClass(vote);
	const statusLabel = getStatusLabel(vote);
	const result =
		statusClass === "finished" || statusClass === "archived"
			? getResult(vote)
			: null;

	const totalVotes = vote.votesFor + vote.votesAgainst + vote.abstained;
	const forPercentage =
		totalVotes > 0 ? Math.round((vote.votesFor / totalVotes) * 100) : 0;
	const againstPercentage =
		totalVotes > 0 ? Math.round((vote.votesAgainst / totalVotes) * 100) : 0;
	const abstainPercentage =
		totalVotes > 0 ? Math.round((vote.abstained / totalVotes) * 100) : 0;

	return (
		<div className="voting-details-page">
			<div className="voting-details-header">
				<button className="back-btn" onClick={() => navigate(-1)}>
					← Powrót
				</button>

				{isAdmin && (
					<Link
						to={`/glosowania/${vote.id}/edytuj`}
						className="edit-voting-btn"
					>
						✏️ Edytuj głosowanie
					</Link>
				)}
			</div>

			<div className="voting-details-container">
				<div className="voting-details-top">
					<div className="voting-details-meta">
						<span className="voting-details-type">{vote.category}</span>
						<span className={`voting-details-status ${statusClass}`}>
							{statusLabel}
						</span>
					</div>

					<h1 className="voting-details-title">{vote.title}</h1>
					<p className="voting-details-description">{vote.description}</p>
				</div>

				<div className="voting-details-info-grid">
					<div className="info-item">
						<span className="info-label">Start głosowania</span>
						<span className="info-value">
							{new Date(vote.startTime).toLocaleString("pl-PL", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</div>

					<div className="info-item">
						<span className="info-label">Koniec głosowania</span>
						<span className="info-value">
							{new Date(vote.endTime).toLocaleString("pl-PL", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</div>

					<div className="info-item">
						<span className="info-label">Autor</span>
						<span className="info-value">{vote.createdBy || "Nieznany"}</span>
					</div>

					<div className="info-item">
						<span className="info-label">Łączna liczba głosów</span>
						<span className="info-value">{totalVotes}</span>
					</div>
				</div>

				{(statusClass === "finished" || statusClass === "archived") && (
					<div className="voting-details-results">
						<h2>Wyniki głosowania</h2>

						<div className="results-summary">
							<div className={`result-badge ${result}`}>
								{result === "passed" && "✅ Uchwała przyjęta"}
								{result === "rejected" && "❌ Uchwała odrzucona"}
								{result === "tie" && "⚖️ Remis"}
							</div>
						</div>

						<div className="results-bars">
							<div className="result-bar-item for">
								<div className="result-bar-label">
									<span>ZA</span>
									<span className="result-bar-count">{vote.votesFor}</span>
								</div>
								<div className="result-bar-track">
									<div
										className="result-bar-fill for"
										style={{ width: `${forPercentage}%` }}
									/>
								</div>
								<span className="result-bar-percentage">{forPercentage}%</span>
							</div>

							<div className="result-bar-item against">
								<div className="result-bar-label">
									<span>PRZECIW</span>
									<span className="result-bar-count">{vote.votesAgainst}</span>
								</div>
								<div className="result-bar-track">
									<div
										className="result-bar-fill against"
										style={{ width: `${againstPercentage}%` }}
									/>
								</div>
								<span className="result-bar-percentage">
									{againstPercentage}%
								</span>
							</div>

							<div className="result-bar-item abstain">
								<div className="result-bar-label">
									<span>WSTRZYMANIE</span>
									<span className="result-bar-count">{vote.abstained}</span>
								</div>
								<div className="result-bar-track">
									<div
										className="result-bar-fill abstain"
										style={{ width: `${abstainPercentage}%` }}
									/>
								</div>
								<span className="result-bar-percentage">
									{abstainPercentage}%
								</span>
							</div>
						</div>

						<div className="results-stats">
							<div className="stat-item">
								<span className="stat-label">Frekwencja</span>
								<span className="stat-value">
									{totalVotes > 0 ? Math.round((totalVotes / 300) * 100) : 0}%
								</span>
							</div>
							<div className="stat-item">
								<span className="stat-label">Twój głos</span>
								<span className="stat-value">
									{vote.hasVoted ? formatVote(vote.myVote) : "Nie głosowałeś"}
								</span>
							</div>
						</div>
					</div>
				)}

				{statusClass === "active" && (
					<div className="voting-details-active">
						<h2>Głosowanie trwa!</h2>
						{vote.hasVoted ? (
							<p className="my-vote-info">
								Już zagłosowałeś: <strong>{formatVote(vote.myVote)}</strong>
							</p>
						) : (
							<Link to={`/glosowanie/${vote.id}`} className="vote-now-btn">
								🗳️ Weź udział w głosowaniu
							</Link>
						)}
					</div>
				)}

				{statusClass === "upcoming" && (
					<div className="voting-details-upcoming">
						<p>⏳ Głosowanie jeszcze się nie rozpoczęło</p>
						<p className="upcoming-info">
							Rozpocznie się: {new Date(vote.startTime).toLocaleString("pl-PL")}
						</p>
					</div>
				)}

				{statusClass === "archived" && (
					<div className="voting-details-archived">
						<p>📦 To głosowanie zostało zarchiwizowane</p>
					</div>
				)}
			</div>
		</div>
	);
}
