import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./VotingList.css";

function getVoteStatus(vote) {
	// Jeśli zarchiwizowane - zawsze zwracamy "archived"
	if (vote.status === "archived") return "archived";

	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();

	if (now < start) return "upcoming";
	if (now >= start && now < end) return "active";
	return "finished";
}

function formatTime(seconds) {
	if (seconds <= 0) return "0s";

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes === 0) return `${remainingSeconds}s`;
	if (remainingSeconds === 0) return `${minutes} min`;
	return `${minutes} min ${remainingSeconds}s`;
}

function getResult(vote) {
	if (vote.votesFor > vote.votesAgainst) return "passed";
	if (vote.votesFor < vote.votesAgainst) return "rejected";
	return "tie";
}

export default function Votings() {
	const [votes, setVotes] = useState([]);
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [archivingId, setArchivingId] = useState(null);
	const [showArchiveModal, setShowArchiveModal] = useState(false);

	const token = localStorage.getItem("token");

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

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
		async function fetchVotings() {
			try {
				const response = await fetch("/api/votings", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const data = await response.json();

				if (!response.ok)
					throw new Error(data.message || "Nie udało się pobrać głosowań");

				setVotes(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		fetchVotings();
	}, [token]);

	const handleArchive = async (voteId) => {
		try {
			const response = await fetch(`/api/votings/${voteId}/archive`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Nie udało się zarchiwizować głosowania");
			}

			// Odśwież listę
			const updatedResponse = await fetch("/api/votings", {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await updatedResponse.json();
			setVotes(data);
			setShowArchiveModal(false);
			setArchivingId(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const openArchiveModal = (voteId) => {
		setArchivingId(voteId);
		setShowArchiveModal(true);
	};

	if (loading) {
		return <h2>Ładowanie głosowań...</h2>;
	}

	if (error) {
		return <h2>{error}</h2>;
	}

	const filteredVotes = votes.filter((vote) => {
		const status = getVoteStatus(vote);

		// Jeśli filtr to "archived" - pokaż tylko zarchiwizowane
		if (filter === "archived") return status === "archived";

		// Jeśli filtr to "all" - pokaż WSZYSTKIE OPRÓCZ zarchiwizowanych
		if (filter === "all") return status !== "archived";

		// Dla pozostałych filtrów (active, finished, upcoming)
		if (filter === "active") return status === "active";
		if (filter === "finished") return status === "finished";
		if (filter === "upcoming") return status === "upcoming";

		return true;
	});

	return (
		<>
			<div className="votings-page">
				<div className="votings-header">
					<h1>Głosowania</h1>
					<p>Aktualne i zakończone głosowania Parlamentu Młodych RP</p>
				</div>

				<div className="votings-filters">
					{[
						["all", "Wszystkie"],
						["upcoming", "Oczekujące"],
						["active", "Aktywne"],
						["finished", "Zakończone"],
						["archived", "Zarchiwizowane"],
					].map(([key, label]) => (
						<button
							key={key}
							className={`filter-btn ${filter === key ? "active" : ""}`}
							onClick={() => setFilter(key)}
						>
							{label}
						</button>
					))}
				</div>

				<div className="votings-grid">
					{isAdmin && (
						<Link
							to="/glosowania/nowe"
							className="voting-card create-vote-card"
						>
							<div className="create-vote-content">
								<div className="create-vote-icon">+</div>
								<h3>Utwórz nowe głosowanie</h3>
							</div>
						</Link>
					)}

					{filteredVotes.map((vote) => {
						const status = getVoteStatus(vote);
						const end = new Date(vote.endTime).getTime();
						const remainingSec = Math.max(0, Math.floor((end - now) / 1000));
						const result = status === "finished" ? getResult(vote) : null;
						const isArchived = status === "archived";

						return (
							<div key={vote.id} className={`voting-card ${status}`}>
								<div className="voting-card-header">
									<span className="voting-type">{vote.category}</span>
									<span className={`voting-status ${status}`}>
										{isArchived
											? "ZARCHIWIZOWANE"
											: status === "active"
												? "TRWA"
												: status === "finished"
													? "ZAKOŃCZONE"
													: "OCZEKUJE"}
									</span>
								</div>

								<h3 className="voting-title">{vote.title}</h3>

								<p className="voting-description">{vote.description}</p>

								<div className="voting-info">
									<p>
										<strong>Start:</strong>{" "}
										{new Date(vote.startTime).toLocaleString("pl-PL")}
									</p>
									<p>
										<strong>Koniec:</strong>{" "}
										{new Date(vote.endTime).toLocaleString("pl-PL")}
									</p>
								</div>

								{status === "active" && (
									<div className="voting-active">
										<p className="live-indicator">
											Głosowanie trwa (koniec za{" "}
											<strong>{formatTime(remainingSec)}</strong>)
										</p>

										{vote.hasVoted ? (
											<p className="my-vote">
												Twój głos:{" "}
												<strong>
													{vote.myVote === "for"
														? "ZA"
														: vote.myVote === "against"
															? "PRZECIW"
															: "WSTRZYMANIE"}
												</strong>
											</p>
										) : (
											<Link
												to={`/glosowanie/${vote.id}`}
												className="vote-now-btn"
											>
												Weź udział w głosowaniu
											</Link>
										)}
									</div>
								)}

								{status === "finished" && (
									<div className="voting-result">
										<div className="result-bars">
											<div className="result-for">
												<span>ZA</span>
												<div
													className="bar"
													style={{
														width: `${(vote.votesFor / (vote.votesFor + vote.votesAgainst + vote.abstained)) * 100 || 0}%`,
													}}
												/>
												<strong>{vote.votesFor}</strong>
											</div>

											<div className="result-against">
												<span>PRZECIW</span>
												<div
													className="bar"
													style={{
														width: `${(vote.votesAgainst / (vote.votesFor + vote.votesAgainst + vote.abstained)) * 100 || 0}%`,
													}}
												/>
												<strong>{vote.votesAgainst}</strong>
											</div>
										</div>

										<p className={`final-result ${result}`}>
											{result === "passed"
												? "Uchwała przyjęta"
												: result === "rejected"
													? "Uchwała odrzucona"
													: "Remis"}
										</p>
									</div>
								)}

								{isArchived && (
									<div className="voting-archived">
										<p className="archived-info">
											📦 To głosowanie zostało zarchiwizowane
										</p>
										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className="vote-now-btn"
										>
											Zobacz szczegóły
										</Link>
									</div>
								)}

								{!isArchived &&
									status !== "active" &&
									status !== "finished" && (
										<div className="voting-actions">
											<Link
												to={`/glosowanie/${vote.id}`}
												className="vote-now-btn"
											>
												Szczegóły
											</Link>

											{isAdmin && (
												<>
													<Link
														to={`/glosowania/${vote.id}/edytuj`}
														className="edit-vote-btn"
													>
														Edytuj
													</Link>
													<button
														onClick={() => openArchiveModal(vote.id)}
														className="archive-vote-btn"
													>
														Archiwizuj
													</button>
												</>
											)}
										</div>
									)}

								{!isArchived && status === "finished" && isAdmin && (
									<div className="voting-actions">
										<Link
											to={`/glosowanie/${vote.id}`}
											className="vote-now-btn"
										>
											Zobacz wyniki
										</Link>
										<button
											onClick={() => openArchiveModal(vote.id)}
											className="archive-vote-btn"
										>
											Archiwizuj
										</button>
									</div>
								)}

								{!isArchived && status === "active" && isAdmin && (
									<div className="voting-actions">
										<Link
											to={`/glosowanie/${vote.id}`}
											className="vote-now-btn"
										>
											Zobacz szczegóły
										</Link>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{filteredVotes.length === 0 && (
					<p className="no-votes">Brak głosowań w wybranej kategorii.</p>
				)}
			</div>

			{/* Modal archiwizacji */}
			{showArchiveModal && (
				<div
					className="archive-modal-overlay"
					onClick={() => setShowArchiveModal(false)}
				>
					<div
						className="archive-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<h2>Archiwizacja głosowania</h2>

						<div className="archive-modal-warning">
							<strong>⚠️ UWAGA!</strong>
							<p>
								Czy na pewno chcesz zarchiwizować to głosowanie? Po archiwizacji
								będzie ono widoczne tylko w zakładce "Zarchiwizowane".
							</p>
						</div>

						<div className="archive-modal-actions">
							<button
								className="archive-modal-btn-cancel"
								onClick={() => setShowArchiveModal(false)}
							>
								Anuluj
							</button>
							<button
								className="archive-modal-btn-confirm"
								onClick={() => handleArchive(archivingId)}
							>
								Potwierdź archiwizację
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
