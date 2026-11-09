import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "./VotingList.module.css";
import BackButton from "../../../components/PageBack";

/* ─── Helpers ─── */

function getVoteStatus(vote) {
	if (vote.status === "archived") return "archived";
	if (vote.status === "closed") return "finished";
	if (vote.status === "finished") return "finished";

	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();

	if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
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
	return parts.join(" ") || "0s";
}

function getResult(vote) {
	const forV = vote.votesFor ?? 0;
	const againstV = vote.votesAgainst ?? 0;
	if (forV > againstV) return "passed";
	if (forV < againstV) return "rejected";
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

const STATUS_LABEL = {
	active: "Trwa",
	upcoming: "Oczekuje",
	finished: "Zakończone",
	archived: "Zarchiwizowane",
};

const STATUS_TONE = {
	active: "warn",
	upcoming: "neutral",
	finished: "neutral",
	archived: "neutral",
};

function StatusPill({ status }) {
	const tone = STATUS_TONE[status] ?? "neutral";
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

/* ─── Component ─── */

export default function Votings() {
	const [votes, setVotes] = useState([]);
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [userId, setUserId] = useState(null);
	const [user, setUser] = useState(null);
	const [now, setNow] = useState(Date.now());

	const [archivingId, setArchivingId] = useState(null);
	const [showArchiveModal, setShowArchiveModal] = useState(false);

	const [showActivateModal, setShowActivateModal] = useState(false);
	const [activatingId, setActivatingId] = useState(null);
	const [activationDuration, setActivationDuration] = useState(1);
	const [activationStartDelay, setActivationStartDelay] = useState(0);

	const token = localStorage.getItem("token");

	/* Tick co sekundę (dla odliczania) */
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	/* Pobierz usera raz */
	useEffect(() => {
		async function fetchMe() {
			if (!token) return;
			try {
				const res = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) return;
				const data = await res.json();
				setUser(data);
				setUserId(data.id);
				setIsAdmin(
					data.role === "admin" ||
						data.permissions?.includes("MANAGE_VOTINGS") === true,
				);
			} catch {
				/* ignore */
			}
		}
		fetchMe();
	}, [token]);

	/* Pobierz głosowania */
	const fetchVotings = useCallback(async () => {
		if (!token) return;
		try {
			let url = "/newapp/api/votings";
			if (!isAdmin && user?.id) {
				url = `/newapp/api/votings?userId=${user.id}&role=${user.role}`;
			}
			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			const list = Array.isArray(data) ? data : (data.votings ?? []);
			setVotes(list);
			if (!res.ok)
				throw new Error(data.message || "Nie udało się pobrać głosowań");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [token, isAdmin, user]);

	useEffect(() => {
		if (!user && !isAdmin) return;
		fetchVotings();
	}, [fetchVotings, user, isAdmin]);

	/* Autorefresh co 5 s (poza modalami) */
	useEffect(() => {
		if (showArchiveModal || showActivateModal) return;
		if (!user && !isAdmin) return;
		const interval = setInterval(fetchVotings, 5000);
		return () => clearInterval(interval);
	}, [fetchVotings, showArchiveModal, showActivateModal, user, isAdmin]);

	const canManageVote = (vote) => {
		if (isAdmin) return true;
		if (!userId) return false;
		return Array.isArray(vote.managers) && vote.managers.includes(userId);
	};

	/* Akcje */
	const handleArchive = async (voteId) => {
		try {
			const res = await fetch(`/newapp/api/votings/${voteId}/archive`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Nie udało się zarchiwizować głosowania");
			await fetchVotings();
			setShowArchiveModal(false);
			setArchivingId(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const handleFinish = async (voteId) => {
		if (!confirm("Czy na pewno zakończyć to głosowanie przed czasem?")) return;
		try {
			const res = await fetch(`/newapp/api/votings/${voteId}/finish`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Nie udało się zakończyć głosowania");
			await fetchVotings();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleActivate = async (voteId) => {
		try {
			const startTime = new Date(Date.now() + activationStartDelay * 60000);
			const endTime = new Date(
				startTime.getTime() + activationDuration * 3600000,
			);
			const res = await fetch(`/newapp/api/votings/${voteId}/activate`, {
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
			if (!res.ok) throw new Error("Nie udało się aktywować głosowania");
			await fetchVotings();
			setShowActivateModal(false);
			setActivatingId(null);
		} catch (err) {
			setError(err.message);
		}
	};

	/* Render */
	if (loading) {
		return (
			<div className={styles.page}>
				<p className={styles.muted}>Ładowanie…</p>
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
		return status === filter;
	});

	return (
		<>
			<div className={styles.page}>
				<header className={styles.topbar}>
					<h1 className={styles.title}>Głosowania</h1>
					<p className={styles.subtitle}>
						Aktualne i zakończone głosowania Parlamentu Młodych RP.
					</p>
				</header>

				<nav className={styles.filters} aria-label="Filtry głosowań">
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
							className={`${styles.filterBtn} ${
								filter === key ? styles.filterBtnActive : ""
							}`}
							onClick={() => setFilter(key)}
						>
							{label}
						</button>
					))}
				</nav>

				{isAdmin && filter !== "archived" && (
					<Link to="/glosowania/nowe" className={styles.createRow}>
						<span>Utwórz nowe głosowanie</span>
						<span aria-hidden="true">+</span>
					</Link>
				)}

				{filteredVotes.length === 0 ? (
					<div className={styles.empty}>
						<p className={styles.emptyTitle}>Brak głosowań</p>
						<p className={styles.emptyText}>
							Nie ma głosowań w wybranej kategorii.
						</p>
					</div>
				) : (
					<ul className={styles.list}>
						{filteredVotes.map((vote) => {
							const status = getVoteStatus(vote);
							const end = new Date(vote.endTime).getTime();
							const remainingSec = Math.max(0, Math.floor((end - now) / 1000));
							const result = status === "finished" ? getResult(vote) : null;
							const canEdit =
								canManageVote(vote) &&
								(status === "active" || status === "upcoming");
							const canArchive = canManageVote(vote) && status === "finished";
							const canActivate = canManageVote(vote) && status === "upcoming";

							return (
								<li key={vote.id} className={styles.item}>
									<div className={styles.itemMain}>
										<div className={styles.itemMeta}>
											<span>{getCategoryLabel(vote.category)}</span>
											{vote.votingMode === "batch" && (
												<span>{vote.questions?.length || 0} pytań</span>
											)}
										</div>
										<h2 className={styles.itemTitle}>{vote.title}</h2>
										{vote.description && (
											<p className={styles.itemDesc}>{vote.description}</p>
										)}
										<p className={styles.itemDates}>
											Start: {new Date(vote.startTime).toLocaleString("pl-PL")}
											{" · "}
											Koniec: {new Date(vote.endTime).toLocaleString("pl-PL")}
										</p>
										{status === "active" && (
											<p className={styles.itemLive}>
												<strong>Trwa</strong> — koniec za{" "}
												{formatTime(remainingSec)}
												{vote.hasVoted ? " · Twój głos oddany" : ""}
											</p>
										)}
										{status === "finished" && vote.votingMode !== "batch" && (
											<p className={styles.itemResult}>
												{result === "passed"
													? "Uchwała przyjęta"
													: result === "rejected"
														? "Uchwała odrzucona"
														: "Remis"}
											</p>
										)}
									</div>

									<div className={styles.itemSide}>
										<StatusPill status={status} />

										{status === "active" && !vote.hasVoted && (
											<Link
												to={`/glosowanie/${vote.id}`}
												className={`${styles.btn} ${styles.btnPrimary}`}
											>
												Weź udział
											</Link>
										)}

										{status === "upcoming" && canActivate && (
											<button
												type="button"
												className={`${styles.btn} ${styles.btnPrimary}`}
												onClick={() => {
													setActivatingId(vote.id);
													setActivationDuration(1);
													setActivationStartDelay(0);
													setShowActivateModal(true);
												}}
											>
												Aktywuj
											</button>
										)}

										{status === "active" && canEdit && (
											<button
												type="button"
												className={`${styles.btn} ${styles.btnDanger}`}
												onClick={() => handleFinish(vote.id)}
											>
												Zakończ
											</button>
										)}

										{status === "finished" && canArchive && (
											<button
												type="button"
												className={`${styles.btn} ${styles.btnOutline}`}
												onClick={() => {
													setArchivingId(vote.id);
													setShowArchiveModal(true);
												}}
											>
												Archiwizuj
											</button>
										)}

										<Link
											to={`/glosowanie/${vote.id}/szczegoly`}
											className={`${styles.btn} ${styles.btnGhost}`}
										>
											Szczegóły
										</Link>

										{canEdit && status === "active" && (
											<Link
												to={`/glosowanie/${vote.id}/edytuj`}
												className={`${styles.btn} ${styles.btnGhost}`}
											>
												Edytuj
											</Link>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{/* Modale — zostawiam logikę, upraszczam strukturę */}
			{showArchiveModal && (
				<div
					className={styles.modalOverlay}
					onClick={() => setShowArchiveModal(false)}
				>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h2 className={styles.modalTitle}>Archiwizacja głosowania</h2>
						<p className={styles.modalText}>
							Po archiwizacji głosowanie będzie widoczne tylko w zakładce
							„Zarchiwizowane”.
						</p>
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
								Archiwizuj
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

						<div className={styles.fields}>
							<label className={styles.field}>
								<span>Czas trwania (godziny)</span>
								<input
									type="number"
									min="0.5"
									max="72"
									step="0.5"
									value={activationDuration}
									onChange={(e) =>
										setActivationDuration(parseFloat(e.target.value) || 1)
									}
									className={styles.input}
								/>
							</label>
							<label className={styles.field}>
								<span>Opóźnienie startu (minuty)</span>
								<input
									type="number"
									min="0"
									max="60"
									step="1"
									value={activationStartDelay}
									onChange={(e) =>
										setActivationStartDelay(parseInt(e.target.value) || 0)
									}
									className={styles.input}
								/>
							</label>
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
								Aktywuj
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
