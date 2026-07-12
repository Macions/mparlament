import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate  } from "react-router-dom";
import "./VotingList.css";

function getVoteStatus(vote) {

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

	const days = Math.floor(seconds / 86400);
	seconds %= 86400;

	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	const parts = [];

	if (days > 0) parts.push(`${days} ${days === 1 ? "dzień" : "dni"}`);
	if (hours > 0) parts.push(`${hours} godz.`);
	if (minutes > 0) parts.push(`${minutes} min`);
	if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

	return parts.join(" ");
}

function getResult(vote) {
	if (vote.votesFor > vote.votesAgainst) return "passed";
	if (vote.votesFor < vote.votesAgainst) return "rejected";
	return "tie";
}

function getCategoryLabel(category) {
	const labels = {
		amendment: "Poprawka",
		committee: "Komisja",
		resolution: "Uchwała",
		law: "Ustawa",
		budget: "Budżet",
		other: "Inne",
	};
	return labels[category] || category || "Inne";
}

export default function Votings() {
		const location = useLocation();
	const navigate = useNavigate()
	const [votes, setVotes] = useState([]);
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [archivingId, setArchivingId] = useState(null);
	const [showArchiveModal, setShowArchiveModal] = useState(false);
	const [userId, setUserId] = useState(null);



	const [showActivateModal, setShowActivateModal] = useState(false);
	const [activatingId, setActivatingId] = useState(null);
	const [activationDuration, setActivationDuration] = useState(1); // w godzinach
	const [activationStartDelay, setActivationStartDelay] = useState(0); // w minutach

	const token = localStorage.getItem("token");
	const canManageVote = (vote) => {
		if (isAdmin) return true;
		if (!userId) return false;
		if (vote.managers && Array.isArray(vote.managers)) {
			return vote.managers.includes(userId);
		}
		return false;
	};
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
				console.log("👤 Zalogowany użytkownik:", user);
				setUserId(user.id);
				setIsAdmin(
					user.role === "admin" || user.permissions?.includes("MANAGE_VOTINGS")
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
				setVotes(data);

				if (!response.ok)
					throw new Error(data.message || "Nie udało się pobrać głosowań");

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


	const handleActivate = async (voteId) => {
		try {

			const now = new Date();
			const startTime = new Date(now.getTime() + activationStartDelay * 60000);
			const endTime = new Date(startTime.getTime() + activationDuration * 3600000);

			const response = await fetch(`/api/votings/${voteId}/activate`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					startTime: startTime.toISOString(),
					endTime: endTime.toISOString(),
					duration: activationDuration,
					delay: activationStartDelay,
				}),
			});

			if (!response.ok) {
				throw new Error("Nie udało się aktywować głosowania");
			}


			const updatedResponse = await fetch("/api/votings", {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await updatedResponse.json();
			setVotes(data);
			setShowActivateModal(false);
			setActivatingId(null);
			setActivationDuration(1);
			setActivationStartDelay(0);
		} catch (err) {
			setError(err.message);
		}
	};

	const openActivateModal = (voteId) => {
		setActivatingId(voteId);
		setActivationDuration(1);
		setActivationStartDelay(0);
		setShowActivateModal(true);
	};

	if (loading) {
		return <h2>Ładowanie głosowań...</h2>;
	}

	if (error) {
		return <h2>{error}</h2>;
	}

	const filteredVotes = votes.filter((vote) => {
		const status = getVoteStatus(vote);

		if (filter === "archived") return status === "archived";
		if (filter === "all") return status !== "archived";
		if (filter === "active") return status === "active";
		if (filter === "finished") return status === "finished";
		if (filter === "upcoming") return status === "upcoming";

		return true;
	});

	return (
		<>
			<div className="votings-page">
				<button
					className="back-to-home-btn"
					onClick={() => navigate("/panel")}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M15 18L9 12L15 6"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>

					Panel
				</button>
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
						...(isAdmin ? [["archived", "Zarchiwizowane"]] : [])
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
					{isAdmin && filter !== "archived" && (
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

						const canEdit = canManageVote(vote) && (status === "active" || status === "upcoming");
						const canArchive = canManageVote(vote) && status === "finished";
						const canActivate = canManageVote(vote) && status === "upcoming";

						return (
							<div key={vote.id} className={`voting-card ${status}`}>
								<div className="voting-card-header">
									<span className="voting-type">{getCategoryLabel(vote.category)}</span>
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
														background: '#166534'
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
														background: '#991b1b'
													}}
												/>
												<strong>{vote.votesAgainst}</strong>
											</div>


											<div className="result-abstained">
												<span>WSTRZYMAŁO SIĘ</span>
												<div
													className="bar"
													style={{
														width: `${(vote.abstained / (vote.votesFor + vote.votesAgainst + vote.abstained)) * 100 || 0}%`,
														background: '#6c757d'
													}}
												/>
												<strong>{vote.abstained}</strong>
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
											To głosowanie zostało zarchiwizowane
										</p>
										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className="see-details-btn"
										>
											Zobacz szczegóły
										</Link>
									</div>
								)}


								{!isArchived && status === "upcoming" && (
									<div className="voting-actions">
										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className="see-details-btn"
										>
											Szczegóły
										</Link>

										{canEdit && (
											<Link
												to={`/glosowanie/${vote.id}/edytuj`}
												className="edit-vote-btn"
											>
												Edytuj
											</Link>
										)}

										{canActivate && (
											<button
												onClick={() => openActivateModal(vote.id)}
												className="activate-vote-btn"
											>
												Aktywuj
											</button>
										)}
									</div>
								)}


								{!isArchived && status === "active" && (
									<div className="voting-actions">
										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className="see-details-btn"
										>
											Zobacz szczegóły
										</Link>

										{canEdit && (
											<Link
												to={`/glosowanie/${vote.id}/edytuj`}
												className="edit-vote-btn"
											>
												Edytuj
											</Link>
										)}
									</div>
								)}

								{!isArchived && status === "finished" && (
									<div className="voting-actions">
										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className="see-results-btn"
										>
											Zobacz szczegóły
										</Link>

										{canArchive && (
											<button
												onClick={() => openArchiveModal(vote.id)}
												className="archive-vote-btn"
											>
												Archiwizuj
											</button>
										)}
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
							<strong>UWAGA!</strong>
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


			{showActivateModal && (
				<div
					className="activate-modal-overlay"
					onClick={() => setShowActivateModal(false)}
				>
					<div
						className="activate-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<h2>Aktywacja głosowania</h2>

						<div className="activate-modal-info">
							<p>
								<strong>{votes.find(v => v.id === activatingId)?.title}</strong>
							</p>
							<p className="activate-modal-subtitle">
								Ustaw czas trwania i opóźnienie startu głosowania.
							</p>
						</div>

						<div className="activate-modal-fields">
							<div className="activate-field">
								<label htmlFor="duration">
									Czas trwania głosowania
								</label>
								<div className="activate-field-input">
									<input
										id="duration"
										type="number"
										min="0.5"
										max="72"
										step="0.5"
										value={activationDuration}
										onChange={(e) => setActivationDuration(parseFloat(e.target.value) || 1)}
									/>
									<span className="activate-field-unit">godzin</span>
								</div>
								<small className="activate-field-hint">
									(min. 0.5h, max. 72h)
								</small>
							</div>

							<div className="activate-field">
								<label htmlFor="delay">
									Opóźnienie startu
								</label>
								<div className="activate-field-input">
									<input
										id="delay"
										type="number"
										min="0"
										max="60"
										step="1"
										value={activationStartDelay}
										onChange={(e) => setActivationStartDelay(parseInt(e.target.value) || 0)}
									/>
									<span className="activate-field-unit">minut</span>
								</div>
								<small className="activate-field-hint">
									(maks. 60 minut)
								</small>
							</div>
						</div>

						<div className="activate-modal-preview">
							<p>
								<strong>Podgląd:</strong>
							</p>
							<p>
								Start: <span className="preview-time">
									{new Date(Date.now() + activationStartDelay * 60000).toLocaleString("pl-PL")}
								</span>
							</p>
							<p>
								Koniec: <span className="preview-time">
									{new Date(Date.now() + activationStartDelay * 60000 + activationDuration * 3600000).toLocaleString("pl-PL")}
								</span>
							</p>
							<p className="preview-duration">
								Czas trwania: <strong>{activationDuration} godzin</strong>
								{activationStartDelay > 0 && ` (start za ${activationStartDelay} minut)`}
							</p>
						</div>

						<div className="activate-modal-actions">
							<button
								className="activate-modal-btn-cancel"
								onClick={() => setShowActivateModal(false)}
							>
								Anuluj
							</button>
							<button
								className="activate-modal-btn-confirm"
								onClick={() => handleActivate(activatingId)}
							>
								Aktywuj głosowanie
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}