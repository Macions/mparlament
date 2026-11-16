import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./LiveVoting.module.css";
import BackButton from "../../../components/PageBack";
import { useSocket } from "../../../socket/SocketProvider";

export default function LiveVoting() {
	const { id } = useParams();
	const navigate = useNavigate();
	const token = localStorage.getItem("token");
	const { socket, isConnected } = useSocket();

	const [voting, setVoting] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [user, setUser] = useState(null);
	const [timeLeft, setTimeLeft] = useState("");

	// single
	const [votedCount, setVotedCount] = useState(0);
	const [totalEligible, setTotalEligible] = useState(0);
	const [eligibleUsers, setEligibleUsers] = useState([]);
	const [votedUsers, setVotedUsers] = useState([]);
	const [notVotedUsers, setNotVotedUsers] = useState([]);

	// batch – mapa: questionId -> { votedCount, totalEligible, turnout, voters }
	const [perQuestion, setPerQuestion] = useState({});

	const [isLive, setIsLive] = useState(true);

	const isBatch = voting?.votingMode === "batch";
	const questions = voting?.questions || [];

	// ------------------------------------------------------------------
	// helper – wspólne rozpakowanie payloadu (REST / WebSocket)
	// ------------------------------------------------------------------
	const applyLivePayload = (data) => {
		// single
		setVotedCount(data.votedCount || 0);
		if (data.votedUsers) setVotedUsers(data.votedUsers);
		if (data.notVotedUsers) setNotVotedUsers(data.notVotedUsers);

		setVoting((prev) =>
			prev
				? {
					...prev,
					votesFor: data.votesFor ?? prev.votesFor,
					votesAgainst: data.votesAgainst ?? prev.votesAgainst,
					abstained: data.abstained ?? prev.abstained,
				}
				: prev,
		);

		// batch – votersPerQuestion (z backendu)
		if (Array.isArray(data.votersPerQuestion)) {
			const map = {};
			for (const entry of data.votersPerQuestion) {
				map[entry.questionId] = {
					votedCount: entry.votedCount ?? 0,
					totalEligible: entry.totalEligible ?? 0,
					turnout: entry.turnout ?? 0,
					voters: entry.voters || [],
				};
			}
			setPerQuestion(map);
			return;
		}

		// fallback – jeśli backend wysyła tylko resultsPerQuestion
		if (Array.isArray(data.resultsPerQuestion)) {
			const map = {};
			for (const r of data.resultsPerQuestion) {
				map[r.questionId] = {
					votedCount: r.totalVotes ?? 0,
					totalEligible: data.totalEligible ?? 0,
					turnout:
						data.totalEligible > 0
							? Math.round((r.totalVotes / data.totalEligible) * 100)
							: 0,
					voters: [],
				};
			}
			setPerQuestion(map);
		}
	};

	// ------------------------------------------------------------------
	// WebSocket – nasłuch voteUpdate:<id>
	// ------------------------------------------------------------------
	useEffect(() => {
		if (!socket) return;

		const handleVoteUpdate = (data) => {
			applyLivePayload(data);
		};

		socket.on(`voteUpdate:${id}`, handleVoteUpdate);
		return () => {
			socket.off(`voteUpdate:${id}`, handleVoteUpdate);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [socket, id]);

	// ------------------------------------------------------------------
	// kto jest requesterem (admin?)
	// ------------------------------------------------------------------
	useEffect(() => {
		async function fetchUser() {
			try {
				const response = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const userData = await response.json();
					setUser(userData);
					setIsAdmin(
						userData.role === "admin" ||
						userData.permissions?.includes("MANAGE_VOTINGS"),
					);
				}
			} catch {
				/* ignore */
			}
		}
		fetchUser();
	}, [token]);

	// ------------------------------------------------------------------
	// pobranie głosowania
	// ------------------------------------------------------------------
	useEffect(() => {
		async function fetchVoting() {
			try {
				setLoading(true);
				const response = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!response.ok) throw new Error("Nie udało się pobrać głosowania");
				const data = await response.json();
				setVoting(data);

				setEligibleUsers(data.eligibleUsers || []);
				setVotedUsers(data.votedUsers || []);
				setNotVotedUsers(data.notVotedUsers || []);
				setTotalEligible(data.totalEligible || 0);
				setVotedCount(data.votedCount || 0);

				if (Array.isArray(data.votersPerQuestion)) {
					const map = {};
					for (const entry of data.votersPerQuestion) {
						map[entry.questionId] = {
							votedCount: entry.votedCount ?? 0,
							totalEligible: entry.totalEligible ?? 0,
							turnout: entry.turnout ?? 0,
							voters: entry.voters || [],
						};
					}
					setPerQuestion(map);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		if (id) fetchVoting();
	}, [id, token]);

	// ------------------------------------------------------------------
	// timer
	// ------------------------------------------------------------------
	useEffect(() => {
		if (!voting) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const end = new Date(voting.endTime).getTime();
			const remaining = Math.max(0, Math.floor((end - now) / 1000));

			if (remaining <= 0) {
				setTimeLeft("00:00:00");
				setIsLive(false);
				clearInterval(interval);
				return;
			}

			const hours = Math.floor(remaining / 3600);
			const minutes = Math.floor((remaining % 3600) / 60);
			const seconds = remaining % 60;

			setTimeLeft(
				`${String(hours).padStart(2, "0")}:${String(minutes).padStart(
					2,
					"0",
				)}:${String(seconds).padStart(2, "0")}`,
			);
		}, 1000);

		return () => clearInterval(interval);
	}, [voting]);

	// ------------------------------------------------------------------
	// polling – gdy WebSocket nieaktywny
	// ------------------------------------------------------------------
	useEffect(() => {
		if (isConnected || !isLive || !voting) return;

		const interval = setInterval(async () => {
			try {
				const response = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const data = await response.json();
					applyLivePayload(data);
				}
			} catch {
				/* ignore */
			}
		}, 3000);

		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, token, isLive, voting, isConnected]);

	// ------------------------------------------------------------------
	// render
	// ------------------------------------------------------------------
	if (loading) {
		return (
			<div className={styles.page}>
				<div className={styles.loading}>
					<div className={styles.spinner} />
					<p>Ładowanie głosowania...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.page}>
				<BackButton to="/glosowania" label="Głosowania" />
				<div className={styles.errorCard}>
					<h2>Błąd</h2>
					<p>{error}</p>
					<button
						className={styles.btnPrimary}
						onClick={() => navigate("/glosowania")}
					>
						Wróć do głosowań
					</button>
				</div>
			</div>
		);
	}

	if (!voting) {
		return (
			<div className={styles.page}>
				<BackButton to="/glosowania" label="Głosowania" />
				<div className={styles.errorCard}>
					<h2>Nie znaleziono głosowania</h2>
					<button
						className={styles.btnPrimary}
						onClick={() => navigate("/glosowania")}
					>
						Wróć do głosowań
					</button>
				</div>
			</div>
		);
	}

	const voterTurnout =
		totalEligible > 0 ? Math.round((votedCount / totalEligible) * 100) : 0;

	const batchAggregate = (() => {
		if (!isBatch) return null;
		const entries = Object.values(perQuestion);
		if (entries.length === 0) return null;
		const totalVotes = entries.reduce((s, e) => s + e.votedCount, 0);
		const totalSlots = entries.reduce((s, e) => s + e.totalEligible, 0);
		return {
			totalVotes,
			totalSlots,
			turnout:
				totalSlots > 0 ? Math.round((totalVotes / totalSlots) * 100) : 0,
		};
	})();

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<BackButton to="/glosowania" label="Głosowania" />
			</header>

			<main className={styles.main}>
				<div className={styles.head}>
					<div className={styles.metaRow}>
						<span
							className={`${styles.statusDot} ${isLive ? styles.dotLive : styles.dotEnded
								}`}
						/>
						<span className={styles.statusText}>
							{isLive ? "GŁOSOWANIE TRWA" : "GŁOSOWANIE ZAKOŃCZONE"}
						</span>
						{isBatch && (
							<span className={styles.batchTag}>
								{questions.length} pytań
							</span>
						)}
					</div>

					<h1 className={styles.title}>{voting.title}</h1>
					{voting.description && (
						<p className={styles.description}>{voting.description}</p>
					)}
				</div>

				{/* ------------- GÓRNY RZĄD: timer + statystyki ------------- */}
				<section className={styles.gridTop}>
					<div className={styles.card}>
						<span className={styles.cardEyebrow}>Pozostały czas</span>
						<div className={styles.timer}>{timeLeft || "—"}</div>
						<div className={styles.timerDetails}>
							<span>
								Start:{" "}
								{new Date(voting.startTime).toLocaleString("pl-PL")}
							</span>
							<span>
								Koniec: {new Date(voting.endTime).toLocaleString("pl-PL")}
							</span>
						</div>
					</div>

					<div className={styles.card}>
						<span className={styles.cardEyebrow}>
							{isBatch ? "Statystyki zbiorcze" : "Statystyki głosowania"}
						</span>

						{!isBatch && (
							<>
								<div className={styles.statGrid}>
									<Stat label="Uprawnionych" value={totalEligible} />
									<Stat label="Zagłosowało" value={votedCount} accent />
									<Stat
										label="Brak głosu"
										value={Math.max(0, totalEligible - votedCount)}
									/>
									<Stat label="Frekwencja" value={`${voterTurnout}%`} />
								</div>
								<ProgressBar value={voterTurnout} />
							</>
						)}

						{isBatch && batchAggregate && (
							<>
								<div className={styles.statGrid}>
									<Stat label="Pytań" value={questions.length} />
									<Stat
										label="Uprawnionych / pytanie"
										value={batchAggregate.totalSlots / (questions.length || 1)}
									/>
									<Stat
										label="Głosów razem"
										value={batchAggregate.totalVotes}
										accent
									/>
									<Stat
										label="Frekwencja (średnia)"
										value={`${batchAggregate.turnout}%`}
									/>
								</div>
								<ProgressBar value={batchAggregate.turnout} />
							</>
						)}
					</div>
				</section>

				{/* ------------- ADMIN ------------- */}
				{isAdmin && !isBatch && (
					<section className={styles.section}>
						<h2 className={styles.sectionTitle}>Lista uprawnionych</h2>
						<div className={styles.tableCard}>
							<div className={styles.tableHeader}>
								<span>Imię i nazwisko</span>
								<span>Status</span>
							</div>
							<ul className={styles.list}>
								{eligibleUsers.map((u) => {
									const hasVoted = votedUsers.some((v) => v.id === u.id);
									return (
										<li
											key={u.id}
											className={`${styles.listItem} ${hasVoted ? styles.itemVoted : styles.itemNotVoted
												}`}
										>
											<span className={styles.personName}>{u.name}</span>
											<span
												className={`${styles.pill} ${hasVoted ? styles.pillVoted : styles.pillNotVoted
													}`}
											>
												{hasVoted ? "Zagłosował" : "Nie zagłosował"}
											</span>
										</li>
									);
								})}
							</ul>
						</div>
					</section>
				)}

				{isAdmin && isBatch && (
					<section className={styles.section}>
						<h2 className={styles.sectionTitle}>Pytania</h2>
						<p className={styles.sectionHint}>
							Każde pytanie liczone jest niezależnie — poniżej frekwencja
							na żywo.
						</p>

						<div className={styles.batchList}>
							{questions.map((q, idx) => {
								const stats = perQuestion[q.id] || {
									votedCount: 0,
									totalEligible: totalEligible,
									turnout: 0,
									voters: [],
								};
								const voters = stats.voters || [];

								return (
									<article key={q.id} className={styles.batchCard}>
										<header className={styles.batchHead}>
											<span className={styles.batchIndex}>
												{idx + 1}
											</span>
											<div className={styles.batchBody}>
												<h3 className={styles.batchTitle}>{q.text}</h3>
												{q.linkedItemType !== "none" && (
													<span className={styles.batchLink}>
														{q.linkedItemType === "resolution"
															? "Uchwała"
															: "Poprawka"}{" "}
														#{q.linkedItemId}
													</span>
												)}
											</div>
										</header>

										<div className={styles.statGrid}>
											<Stat
												label="Zagłosowało"
												value={stats.votedCount}
												accent
											/>
											<Stat
												label="Brak głosu"
												value={Math.max(
													0,
													stats.totalEligible - stats.votedCount,
												)}
											/>
											<Stat
												label="Frekwencja"
												value={`${stats.turnout}%`}
											/>
										</div>

										<ProgressBar value={stats.turnout} />

										{voters.length > 0 && (
											<details className={styles.details}>
												<summary className={styles.detailsSummary}>
													Lista głosujących
													<span className={styles.detailsCount}>
														{voters.filter((v) => v.vote).length} /{" "}
														{voters.length}
													</span>
												</summary>
												<ul className={styles.list}>
													{voters.map((u) => {
														const voted = !!u.vote;
														return (
															<li
																key={u.id}
																className={`${styles.listItem} ${voted
																		? styles.itemVoted
																		: styles.itemNotVoted
																	}`}
															>
																<span className={styles.personName}>
																	{u.name}
																</span>
																<span
																	className={`${styles.pill} ${voted
																			? styles.pillVoted
																			: styles.pillNotVoted
																		}`}
																>
																	{voted ? "Zagłosował" : "Brak głosu"}
																</span>
															</li>
														);
													})}
												</ul>
											</details>
										)}
									</article>
								);
							})}
						</div>
					</section>
				)}
			</main>
		</div>
	);
}

// ----------------------------------------------------------------------
// mikro-komponenty pomocnicze (lokalne)
// ----------------------------------------------------------------------

function Stat({ label, value, accent = false }) {
	return (
		<div className={`${styles.stat} ${accent ? styles.statAccent : ""}`}>
			<span className={styles.statLabel}>{label}</span>
			<span className={styles.statValue}>{value}</span>
		</div>
	);
}

function ProgressBar({ value }) {
	const safe = Math.max(0, Math.min(100, Number(value) || 0));
	return (
		<div className={styles.progress}>
			<div className={styles.progressFill} style={{ width: `${safe}%` }} />
		</div>
	);
}