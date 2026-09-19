import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./VotingList.module.css";
import BackButton from "../../../components/PageBack";

function getVoteStatus(vote) {
	if (vote.status === "archived") return "archived";
	if (vote.status === "finished") return "finished";

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
	const navigate = useNavigate();
	const [votes, setVotes] = useState([]);
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [archivingId, setArchivingId] = useState(null);
	const [showArchiveModal, setShowArchiveModal] = useState(false);
	const [userId, setUserId] = useState(null);
	const [user, setUser] = useState(null);

	const [showActivateModal, setShowActivateModal] = useState(false);
	const [activatingId, setActivatingId] = useState(null);
	const [activationDuration, setActivationDuration] = useState(1);
	const [activationStartDelay, setActivationStartDelay] = useState(0);

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
				const response = await fetch("/newapp/api/auth/me", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) throw new Error();

				const user = await response.json();
				setUserId(user.id);
				setIsAdmin(
					user.role === "admin" || user.permissions?.includes("MANAGE_VOTINGS"),
				);

				setUser(user);
			} catch {
				setIsAdmin(false);
			}
		}

		fetchUser();
	}, [token]);

	const fetchVotings = React.useCallback(async () => {
		try {
			if (!user && !isAdmin) {
				try {
					const userResponse = await fetch("/newapp/api/auth/me", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (userResponse.ok) {
						const userData = await userResponse.json();
						setUser(userData);
						setIsAdmin(
							userData.role === "admin" ||
							userData.permissions?.includes("MANAGE_VOTINGS"),
						);
						return;
					}
				} catch (err) {
					// ignore
				}
			}

			let url = "/newapp/api/votings";
			if (!isAdmin && user) {
				url = `/newapp/api/votings?userId=${user.id}&role=${user.role}`;
			}

			const response = await fetch(url, {
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
	}, [token, user, isAdmin]);

	useEffect(() => {
		fetchVotings();
	}, [fetchVotings]);
	useEffect(() => {
		if (showArchiveModal || showActivateModal) return;

		const interval = setInterval(() => {
			fetchVotings();
		}, 5000);

		return () => clearInterval(interval);
	}, [fetchVotings, showArchiveModal, showActivateModal]);
	const handleArchive = async (voteId) => {
		try {
			const response = await fetch(`/newapp/api/votings/${voteId}/archive`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Nie udało się zarchiwizować głosowania");
			}

			let url = "/newapp/api/votings";
			if (!isAdmin && user) {
				url = `/newapp/api/votings?userId=${user.id}&role=${user.role}`;
			}
			const updatedResponse = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await updatedResponse.json();
			setVotes(data);
			setShowArchiveModal(false);
			setArchivingId(null);
		} catch (err) {
			setError(err.message);
		}
	};
	const handleFinish = async (voteId) => {
		if (!confirm("Czy na pewno zakończyć to głosowanie przed czasem?")) return;
		try {
			const response = await fetch(`/newapp/api/votings/${voteId}/finish`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				throw new Error("Nie udało się zakończyć głosowania");
			}
			let url = "/newapp/api/votings";
			if (!isAdmin && user) {
				url = `/newapp/api/votings?userId=${user.id}&role=${user.role}`;
			}
			const updatedResponse = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await updatedResponse.json();
			setVotes(data);
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
			const endTime = new Date(
				startTime.getTime() + activationDuration * 3600000,
			);

			const response = await fetch(`/newapp/api/votings/${voteId}/activate`, {
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

			let url = "/newapp/api/votings";
			if (!isAdmin && user) {
				url = `/newapp/api/votings?userId=${user.id}&role=${user.role}`;
			}
			const updatedResponse = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
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
		return (
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={styles.skeletonGrid}>
					<div className={styles.skeleton} />
					<div className={styles.skeleton} />
					<div className={styles.skeleton} />
					<div className={styles.skeleton} />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.page}>
				<BackButton to="/panel" label="Panel" />
				<div className={styles.errorBanner}>{error}</div>
			</div>
		);
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
			<div className={styles.page}>
				<header className={styles.topbar}>
					<BackButton to="/panel" label="Panel" />
				</header>

				<main className={styles.main}>
					<div className={styles.head}>
						<span className={styles.eyebrow}>Parlament Młodych RP</span>
						<h1 className={styles.title}>Głosowania</h1>
						<p className={styles.subtitle}>
							Aktualne i zakończone głosowania Parlamentu Młodych RP.
						</p>
					</div>

					<div className={styles.filters}>
						{[
							["all", "Wszystkie"],
							["upcoming", "Oczekujące"],
							["active", "Aktywne"],
							["finished", "Zakończone"],
							...(isAdmin ? [["archived", "Zarchiwizowane"]] : []),
						].map(([key, label]) => (
							<button
								key={key}
								type="button"
								className={`${styles.filterBtn} ${filter === key ? styles.filterBtnActive : ""
									}`}
								onClick={() => setFilter(key)}
							>
								{label}
							</button>
						))}
					</div>

					<div className={styles.grid}>
						{isAdmin && filter !== "archived" && (
							<Link to="/glosowania/nowe" className={styles.createCard}>
								<div className={styles.createIcon}>+</div>
								<span className={styles.createLabel}>
									Utwórz nowe głosowanie
								</span>
							</Link>
						)}

						{filteredVotes.map((vote) => {
							const status = getVoteStatus(vote);
							const end = new Date(vote.endTime).getTime();
							const remainingSec = Math.max(0, Math.floor((end - now) / 1000));
							const result = status === "finished" ? getResult(vote) : null;
							const isArchived = status === "archived";

							const canEdit =
								canManageVote(vote) &&
								(status === "active" || status === "upcoming");
							const canArchive = canManageVote(vote) && status === "finished";
							const canActivate = canManageVote(vote) && status === "upcoming";

							const totalVotes =
								vote.votesFor + vote.votesAgainst + vote.abstained || 0;

							return (
								<article
									key={vote.id}
									className={`${styles.card} ${styles[status] || ""}`}
								>
									<header className={styles.cardHead}>
										<span className={styles.cardCategory}>
											{getCategoryLabel(vote.category)}
										</span>
										{vote.votingMode === "batch" && (
											<span className={styles.cardBatch}>
												{vote.questions?.length || 0} pytań
											</span>
										)}
										<span
											className={`${styles.statusBadge} ${styles[`status_${status}`] || ""
												}`}
										>
											{isArchived
												? "Zarchiwizowane"
												: status === "active"
													? "Trwa"
													: status === "finished"
														? "Zakończone"
														: "Oczekuje"}
										</span>
									</header>

									<h3 className={styles.cardTitle}>{vote.title}</h3>

									{vote.description && (
										<p className={styles.cardDescription}>{vote.description}</p>
									)}

									<dl className={styles.cardInfo}>
										<div className={styles.infoRow}>
											<dt>Start</dt>
											<dd>
												{new Date(vote.startTime).toLocaleString("pl-PL")}
											</dd>
										</div>
										<div className={styles.infoRow}>
											<dt>Koniec</dt>
											<dd>{new Date(vote.endTime).toLocaleString("pl-PL")}</dd>
										</div>
									</dl>

									{status === "active" && (
										<div className={styles.activeBox}>
											<div className={styles.liveRow}>
												<span className={styles.liveDot} />
												<span className={styles.liveLabel}>
													Głosowanie trwa
												</span>
												<span className={styles.liveTime}>
													koniec za <strong>{formatTime(remainingSec)}</strong>
												</span>
											</div>

											{vote.hasVoted ? (
												<p className={styles.myVote}>
													{vote.votingMode === "batch" ? (
														<>
															Zagłosowałeś na{" "}
															<strong>
																{vote.myAnswersCount} /{" "}
																{vote.questions?.length || 0}
															</strong>{" "}
															pytań
														</>
													) : (
														<>
															Twój głos:{" "}
															<strong>
																{vote.myVote === "for"
																	? "ZA"
																	: vote.myVote === "against"
																		? "PRZECIW"
																		: "WSTRZYMANIE"}
															</strong>
														</>
													)}
												</p>
											) : (
												<Link
													to={`/glosowanie/${vote.id}`}
													className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
												>
													{vote.votingMode === "batch"
														? "Weź udział w głosowaniu"
														: "Weź udział w głosowaniu"}
												</Link>
											)}
										</div>
									)}

									{status === "finished" && vote.votingMode === "batch" && (
										<div className={styles.batchSummary}>
											<p className={styles.batchSummaryText}>
												Głosowanie zbiorcze — {vote.questions?.length || 0}{" "}
												pytań
											</p>
											<p className={styles.batchSummaryHint}>
												Wyniki dla każdego pytania znajdziesz w szczegółach.
											</p>
										</div>
									)}

									{status === "finished" && vote.votingMode !== "batch" && (
										<div className={styles.resultBox}>
											{/* ...dotychczasowe paski ZA/PRZECIW/WSTRZYMANIE... */}
											<p className={`${styles.finalResult} ...`}>
												{result === "passed"
													? "Uchwała przyjęta"
													: result === "rejected"
														? "Uchwała odrzucona"
														: "Remis"}
											</p>
										</div>
									)}

									{isArchived && (
										<div className={styles.archivedBox}>
											<p className={styles.archivedText}>
												To głosowanie zostało zarchiwizowane.
											</p>
											<Link
												to={`/glosowanie/${vote.id}/szczegoly`}
												className={`${styles.btn} ${styles.btnOutline} ${styles.btnBlock}`}
											>
												Zobacz szczegóły
											</Link>
										</div>
									)}

									{!isArchived && status === "upcoming" && (
										<div className={styles.actions}>
											<Link
												to={`/glosowanie/${vote.id}/szczegoly`}
												className={`${styles.btn} ${styles.btnOutline}`}
											>
												Szczegóły
											</Link>

											{canEdit && (
												<Link
													to={`/glosowanie/${vote.id}/edytuj`}
													className={`${styles.btn} ${styles.btnGhost}`}
												>
													Edytuj
												</Link>
											)}
											{canActivate && (
												<button
													type="button"
													onClick={() => openActivateModal(vote.id)}
													className={`${styles.btn} ${styles.btnPrimary}`}
												>
													Aktywuj
												</button>
											)}
										</div>
									)}

									{!isArchived && status === "active" && (
										<div className={styles.actions}>
											<Link
												to={`/glosowanie/${vote.id}/szczegoly`}
												className={`${styles.btn} ${styles.btnOutline}`}
											>
												Zobacz szczegóły
											</Link>

											{canEdit && (
												<Link
													to={`/glosowanie/${vote.id}/live`}
													className={`${styles.btn} ${styles.btnGhost}`}
												>
													Live
												</Link>
											)}
											{canEdit && (
												<Link
													to={`/glosowanie/${vote.id}/edytuj`}
													className={`${styles.btn} ${styles.btnGhost}`}
												>
													Edytuj
												</Link>
											)}
											{canEdit && (
												<button
													type="button"
													onClick={() => handleFinish(vote.id)}
													className={`${styles.btn} ${styles.btnDanger}`}
												>
													Zakończ
												</button>
											)}
										</div>
									)}

									{!isArchived && status === "finished" && (
										<div className={styles.actions}>
											<Link
												to={`/glosowanie/${vote.id}/szczegoly`}
												className={`${styles.btn} ${styles.btnOutline}`}
											>
												Zobacz szczegóły
											</Link>

											{canArchive && (
												<button
													type="button"
													onClick={() => openArchiveModal(vote.id)}
													className={`${styles.btn} ${styles.btnDanger}`}
												>
													Archiwizuj
												</button>
											)}
										</div>
									)}
								</article>
							);
						})}
					</div>

					{filteredVotes.length === 0 && (
						<div className={styles.empty}>
							<p className={styles.emptyTitle}>Brak głosowań</p>
							<p className={styles.emptyText}>
								Nie ma głosowań w wybranej kategorii.
							</p>
						</div>
					)}
				</main>
			</div>

			{showArchiveModal && (
				<div
					className={styles.modalOverlay}
					onClick={() => setShowArchiveModal(false)}
				>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h2 className={styles.modalTitle}>Archiwizacja głosowania</h2>

						<div className={styles.modalWarning}>
							<strong>UWAGA!</strong>
							<p>
								Czy na pewno chcesz zarchiwizować to głosowanie? Po archiwizacji
								będzie ono widoczne tylko w zakładce „Zarchiwizowane”.
							</p>
						</div>

						<div className={styles.modalActions}>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost}`}
								onClick={() => setShowArchiveModal(false)}
							>
								Anuluj
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary}`}
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
					className={styles.modalOverlay}
					onClick={() => setShowActivateModal(false)}
				>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h2 className={styles.modalTitle}>Aktywacja głosowania</h2>

						<div className={styles.modalInfo}>
							<p className={styles.modalInfoTitle}>
								{votes.find((v) => v.id === activatingId)?.title}
							</p>
							<p className={styles.modalInfoText}>
								Ustaw czas trwania i opóźnienie startu głosowania.
							</p>
						</div>

						<div className={styles.fieldsGrid}>
							<div className={styles.modalField}>
								<label htmlFor="duration" className={styles.modalLabel}>
									Czas trwania głosowania
								</label>
								<div className={styles.modalInputWrap}>
									<input
										id="duration"
										type="number"
										min="0.5"
										max="72"
										step="0.5"
										value={activationDuration}
										onChange={(e) =>
											setActivationDuration(parseFloat(e.target.value) || 1)
										}
										className={styles.modalInput}
									/>
									<span className={styles.modalUnit}>godzin</span>
								</div>
								<small className={styles.modalHint}>
									(min. 0.5h, max. 72h)
								</small>
							</div>

							<div className={styles.modalField}>
								<label htmlFor="delay" className={styles.modalLabel}>
									Opóźnienie startu
								</label>
								<div className={styles.modalInputWrap}>
									<input
										id="delay"
										type="number"
										min="0"
										max="60"
										step="1"
										value={activationStartDelay}
										onChange={(e) =>
											setActivationStartDelay(parseInt(e.target.value) || 0)
										}
										className={styles.modalInput}
									/>
									<span className={styles.modalUnit}>minut</span>
								</div>
								<small className={styles.modalHint}>(maks. 60 minut)</small>
							</div>
						</div>

						<div className={styles.preview}>
							<p className={styles.previewLabel}>Podgląd</p>
							<p className={styles.previewRow}>
								Start:{" "}
								<span className={styles.previewTime}>
									{new Date(
										Date.now() + activationStartDelay * 60000,
									).toLocaleString("pl-PL")}
								</span>
							</p>
							<p className={styles.previewRow}>
								Koniec:{" "}
								<span className={styles.previewTime}>
									{new Date(
										Date.now() +
										activationStartDelay * 60000 +
										activationDuration * 3600000,
									).toLocaleString("pl-PL")}
								</span>
							</p>
							<p className={styles.previewDuration}>
								Czas trwania: <strong>{activationDuration} godzin</strong>
								{activationStartDelay > 0 &&
									` (start za ${activationStartDelay} minut)`}
							</p>
						</div>

						<div className={styles.modalActions}>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost}`}
								onClick={() => setShowActivateModal(false)}
							>
								Anuluj
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary}`}
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
