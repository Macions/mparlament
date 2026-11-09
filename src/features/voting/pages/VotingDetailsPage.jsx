import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./VotingDetailsPage.module.css";
import { Lock, Check, X, Minus } from "lucide-react";

function formatVote(v) {
	switch (v) {
		case "for":
			return "ZA";
		case "against":
			return "PRZECIW";
		case "abstain":
		case "abstained":
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
	if (vote.status === "archived") return "Zarchiwizowane";
	if (vote.status === "closed" || vote.status === "finished")
		return "Zakończone";
	if (now < start) return "Oczekuje";
	if (now >= start && now < end) return "Trwa";
	return "Zakończone";
}

function getStatusTone(vote) {
	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();
	if (vote.status === "archived") return "neutral";
	if (vote.status === "closed" || vote.status === "finished") return "neutral";
	if (now < start) return "neutral";
	if (now >= start && now < end) return "warn";
	return "neutral";
}

function getStatusClass(vote) {
	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = new Date(vote.endTime).getTime();
	if (vote.status === "archived") return "archived";
	if (vote.status === "closed" || vote.status === "finished") return "finished";
	if (now < start) return "upcoming";
	if (now >= start && now < end) return "active";
	return "finished";
}

function getRecipientsLabel(vote) {
	switch (vote.recipientsType) {
		case "all":
			return "Wszyscy członkowie";
		case "groups":
			return "Wybrane grupy";
		case "members":
			return "Wybrani członkowie";
		default:
			return "Nieokreślone";
	}
}

function StatusPill({ vote }) {
	const tone = getStatusTone(vote);
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>
			{getStatusLabel(vote)}
		</span>
	);
}

export default function VotingDetailsPage() {
	const { id } = useParams();

	const [vote, setVote] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [recipientsDetails, setRecipientsDetails] = useState(null);

	const token = localStorage.getItem("token");

	useEffect(() => {
		async function fetchUser() {
			try {
				const res = await fetch("/newapp/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error();
				const user = await res.json();
				setIsAdmin(
					user.role === "admin" ||
						user.permissions?.includes("MANAGE_VOTINGS") === true,
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
				const res = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.message || "Nie udało się pobrać głosowania");
				}
				setVote(data);

				if (data.recipientsType === "groups" && data.selectedGroups) {
					try {
						const groupsRes = await fetch("/newapp/api/groups", {
							headers: { Authorization: `Bearer ${token}` },
						});
						const groupsData = await groupsRes.json();
						setRecipientsDetails({
							type: "groups",
							data: groupsData.filter((g) =>
								data.selectedGroups.includes(g.id),
							),
						});
					} catch {
						setRecipientsDetails({
							type: "groups",
							data: data.selectedGroups.map((id) => ({
								id,
								name: `Grupa ${id}`,
							})),
						});
					}
				} else if (data.recipientsType === "members" && data.selectedMembers) {
					try {
						const membersRes = await fetch("/newapp/api/users", {
							headers: { Authorization: `Bearer ${token}` },
						});
						const membersData = await membersRes.json();
						setRecipientsDetails({
							type: "members",
							data: membersData.filter((m) =>
								data.selectedMembers.includes(m.id),
							),
						});
					} catch {
						setRecipientsDetails({
							type: "members",
							data: data.selectedMembers.map((id) => ({
								id,
								name: `Członek ${id}`,
							})),
						});
					}
				} else {
					setRecipientsDetails({ type: "all", data: null });
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
		fetchVote();
	}, [id, token]);

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
				<div className={styles.errorBanner}>{error}</div>
			</div>
		);
	}

	if (!vote) {
		return (
			<div className={styles.page}>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono głosowania</p>
					<p className={styles.emptyText}>
						Głosowanie mogło zostać usunięte lub zmienił się link.
					</p>
				</div>
			</div>
		);
	}

	const statusClass = getStatusClass(vote);
	const isBatch = vote.votingMode === "batch";
	const isFinished = statusClass === "finished" || statusClass === "archived";

	const totalVotes = vote.votesFor + vote.votesAgainst + vote.abstained;
	const forPct =
		totalVotes > 0 ? Math.round((vote.votesFor / totalVotes) * 100) : 0;
	const againstPct =
		totalVotes > 0 ? Math.round((vote.votesAgainst / totalVotes) * 100) : 0;
	const abstainPct =
		totalVotes > 0 ? Math.round((vote.abstained / totalVotes) * 100) : 0;
	const result = isFinished ? getResult(vote) : null;

	const recipientsLabel = getRecipientsLabel(vote);
	const categoryTranslations = {
		resolution: "Uchwała",
		law: "Ustawa",
		other: "Inne",
		bill: "Projekt ustawy",
		amendment: "Poprawka",
		motion: "Wniosek",
		committee: "Komisja",
		budget: "Budżet",
	};

	/* ─── Lista głosujących (single) ─── */
	const renderVotersList = () => {
		if (!vote.isAnonymous && isFinished) {
			const voters = vote.votedUsers || [];
			if (voters.length === 0) {
				return <p className={styles.muted}>Brak danych o głosujących.</p>;
			}
			return (
				<div className={styles.votersSection}>
					<h3 className={styles.subTitle}>Lista głosujących</h3>
					<table className={styles.table}>
						<thead>
							<tr>
								<th className={styles.th}>Lp.</th>
								<th className={styles.th}>Imię i nazwisko</th>
								<th className={styles.th}>Klub</th>
								<th className={styles.th}>Głos</th>
							</tr>
						</thead>
						<tbody>
							{voters.map((voter, index) => {
								const value = voter.vote ?? null;
								return (
									<tr key={voter.id || index} className={styles.tr}>
										<td className={`${styles.td} ${styles.tdIndex}`}>
											{index + 1}
										</td>
										<td className={styles.td}>
											{voter.name || `Użytkownik ${voter.id}`}
										</td>
										<td className={styles.td}>{voter.club || "—"}</td>
										<td className={styles.td}>
											<span
												className={`${styles.voteBadge} ${
													value
														? styles[
																`vote_${value === "abstained" ? "abstain" : value}`
															]
														: styles.vote_missing
												}`}
											>
												{value === "for" && <Check size={12} />}
												{value === "against" && <X size={12} />}
												{(value === "abstain" || value === "abstained") && (
													<Minus size={12} />
												)}
												{formatVote(value)}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			);
		}

		if (vote.isAnonymous) {
			return (
				<div className={styles.note}>
					<Lock size={16} />
					<span>
						Głosowanie jest niejawne — lista głosujących nie jest dostępna.
					</span>
				</div>
			);
		}

		return null;
	};

	/* ─── Batch — wyniki per pytanie ─── */
	const renderBatchResults = () => {
		const results = vote.resultsPerQuestion || vote.questions || [];
		if (!results.length) {
			return <p className={styles.muted}>Brak danych o pytaniach.</p>;
		}

		return (
			<div className={styles.batchList}>
				{results.map((q, idx) => {
					const qFor = q.votesFor ?? 0;
					const qAgainst = q.votesAgainst ?? 0;
					const qAbstain = q.abstained ?? 0;
					const qTotal = qFor + qAgainst + qAbstain;

					const qForPct = qTotal ? Math.round((qFor / qTotal) * 100) : 0;
					const qAgainstPct = qTotal
						? Math.round((qAgainst / qTotal) * 100)
						: 0;
					const qAbstainPct = qTotal
						? Math.round((qAbstain / qTotal) * 100)
						: 0;

					let qResult = q.outcome;
					if (!qResult) {
						if (qFor > qAgainst) qResult = "passed";
						else if (qFor < qAgainst) qResult = "rejected";
						else qResult = "tie";
					}

					return (
						<article
							key={q.id || q.questionId || idx}
							className={styles.batchItem}
						>
							<header className={styles.batchHead}>
								<span className={styles.batchIdx}>{idx + 1}</span>
								<div className={styles.batchHeadBody}>
									<p className={styles.batchText}>{q.text || q.questionText}</p>
									{q.linkedItemType === "resolution" && (
										<p className={styles.batchLink}>
											Powiązanie: uchwała #{q.linkedItemId}
										</p>
									)}
									{q.linkedItemType === "amendment" && (
										<p className={styles.batchLink}>
											Powiązanie: poprawka #{q.linkedItemId}
											{q.resolutionId && ` (uchwała #${q.resolutionId})`}
										</p>
									)}
								</div>
								<span
									className={`${styles.pill} ${
										qResult === "passed"
											? styles["pill--ok"]
											: qResult === "rejected"
												? styles["pill--bad"]
												: styles["pill--neutral"]
									}`}
								>
									{qResult === "passed" && "Przyjęta"}
									{qResult === "rejected" && "Odrzucona"}
									{qResult === "tie" && "Remis"}
								</span>
							</header>

							<div className={styles.bars}>
								<div className={styles.barRow}>
									<span className={styles.barLabel}>
										<Check size={12} /> ZA
									</span>
									<div className={styles.barTrack}>
										<div
											className={`${styles.barFill} ${styles.barFor}`}
											style={{ width: `${qForPct}%` }}
										/>
									</div>
									<span className={styles.barCount}>
										{qFor} ({qForPct}%)
									</span>
								</div>
								<div className={styles.barRow}>
									<span className={styles.barLabel}>
										<X size={12} /> PRZECIW
									</span>
									<div className={styles.barTrack}>
										<div
											className={`${styles.barFill} ${styles.barAgainst}`}
											style={{ width: `${qAgainstPct}%` }}
										/>
									</div>
									<span className={styles.barCount}>
										{qAgainst} ({qAgainstPct}%)
									</span>
								</div>
								<div className={styles.barRow}>
									<span className={styles.barLabel}>
										<Minus size={12} /> WSTRZYMANIE
									</span>
									<div className={styles.barTrack}>
										<div
											className={`${styles.barFill} ${styles.barAbstain}`}
											style={{ width: `${qAbstainPct}%` }}
										/>
									</div>
									<span className={styles.barCount}>
										{qAbstain} ({qAbstainPct}%)
									</span>
								</div>
							</div>

							{!vote.isAnonymous &&
								vote.votersPerQuestion &&
								(() => {
									const qId = q.questionId || q.id;
									const allVoters =
										vote.votersPerQuestion.find(
											(v) => String(v.questionId) === String(qId),
										)?.voters || [];
									if (allVoters.length === 0) return null;
									const votedVoters = allVoters.filter((v) => v.vote);
									const missingCount = allVoters.length - votedVoters.length;

									return (
										<details className={styles.batchDetails}>
											<summary className={styles.batchSummary}>
												Lista głosujących — {votedVoters.length}{" "}
												{votedVoters.length === 1 ? "osoba" : "osób"}
												{missingCount > 0 &&
													` (${missingCount} nie zagłosowało)`}
											</summary>

											<table className={styles.table}>
												<thead>
													<tr>
														<th className={styles.th}>Lp.</th>
														<th className={styles.th}>Imię i nazwisko</th>
														<th className={styles.th}>Klub</th>
														<th className={styles.th}>Głos</th>
													</tr>
												</thead>
												<tbody>
													{votedVoters.map((voter, vIdx) => {
														const value = voter.vote;
														return (
															<tr key={voter.id || vIdx} className={styles.tr}>
																<td
																	className={`${styles.td} ${styles.tdIndex}`}
																>
																	{vIdx + 1}
																</td>
																<td className={styles.td}>
																	{voter.name || `Użytkownik ${voter.id}`}
																</td>
																<td className={styles.td}>
																	{voter.club || "—"}
																</td>
																<td className={styles.td}>
																	<span
																		className={`${styles.voteBadge} ${
																			styles[
																				`vote_${value === "abstained" ? "abstain" : value}`
																			] || ""
																		}`}
																	>
																		{value === "for" && <Check size={12} />}
																		{value === "against" && <X size={12} />}
																		{(value === "abstain" ||
																			value === "abstained") && (
																			<Minus size={12} />
																		)}
																		{formatVote(value)}
																	</span>
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>

											{missingCount > 0 && (
												<p className={styles.muted}>
													{missingCount}{" "}
													{missingCount === 1
														? "osoba nie oddała"
														: "osób nie oddało"}{" "}
													głosu na to pytanie.
												</p>
											)}
										</details>
									);
								})()}
						</article>
					);
				})}
			</div>
		);
	};

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<div className={styles.meta}>
					<span className={styles.metaText}>
						{categoryTranslations[vote.category] || vote.category}
					</span>
					{isBatch && (
						<span className={styles.metaText}>
							{vote.questions?.length || 0} pytań
						</span>
					)}
					<StatusPill vote={vote} />
				</div>
				<h1 className={styles.title}>{vote.title}</h1>
				{vote.description && (
					<p className={styles.description}>{vote.description}</p>
				)}
			</header>

			<section className={styles.infoGrid}>
				<div className={styles.infoCell}>
					<span className={styles.infoLabel}>Start</span>
					<span className={styles.infoValue}>
						{new Date(vote.startTime).toLocaleString("pl-PL", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
				<div className={styles.infoCell}>
					<span className={styles.infoLabel}>Koniec</span>
					<span className={styles.infoValue}>
						{new Date(vote.endTime).toLocaleString("pl-PL", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
				<div className={styles.infoCell}>
					<span className={styles.infoLabel}>Autor</span>
					<span className={styles.infoValue}>
						{vote.createdBy || "Nieznany"}
					</span>
				</div>
				<div className={styles.infoCell}>
					<span className={styles.infoLabel}>
						{isBatch ? "Liczba pytań" : "Liczba głosów"}
					</span>
					<span className={styles.infoValue}>
						{isBatch ? vote.questions?.length || 0 : totalVotes}
					</span>
				</div>
			</section>

			<section className={styles.section}>
				<h2 className={styles.sectionTitle}>Uprawnieni do głosowania</h2>
				<p className={styles.sectionText}>{recipientsLabel}</p>

				{recipientsDetails?.type === "all" && (
					<p className={styles.sectionText}>
						Wszyscy członkowie Parlamentu Młodych RP.
					</p>
				)}

				{recipientsDetails?.type === "groups" && recipientsDetails.data && (
					<div className={styles.tags}>
						{recipientsDetails.data.map((group, index) => (
							<span key={index} className={styles.tag}>
								{group.name || `Grupa ${group.id}`}
							</span>
						))}
					</div>
				)}

				{recipientsDetails?.type === "members" && recipientsDetails.data && (
					<div className={styles.tags}>
						{recipientsDetails.data.map((member, index) => (
							<span key={index} className={styles.tag}>
								{member.name || `Członek ${member.id}`}
							</span>
						))}
					</div>
				)}
			</section>

			{!isBatch && isFinished && (
				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>Wyniki głosowania</h2>

					<div className={styles.bars}>
						<div className={styles.barRow}>
							<span className={styles.barLabel}>
								<Check size={12} /> ZA
							</span>
							<div className={styles.barTrack}>
								<div
									className={`${styles.barFill} ${styles.barFor}`}
									style={{ width: `${forPct}%` }}
								/>
							</div>
							<span className={styles.barCount}>
								{vote.votesFor} ({forPct}%)
							</span>
						</div>
						<div className={styles.barRow}>
							<span className={styles.barLabel}>
								<X size={12} /> PRZECIW
							</span>
							<div className={styles.barTrack}>
								<div
									className={`${styles.barFill} ${styles.barAgainst}`}
									style={{ width: `${againstPct}%` }}
								/>
							</div>
							<span className={styles.barCount}>
								{vote.votesAgainst} ({againstPct}%)
							</span>
						</div>
						<div className={styles.barRow}>
							<span className={styles.barLabel}>
								<Minus size={12} /> WSTRZYMANIE
							</span>
							<div className={styles.barTrack}>
								<div
									className={`${styles.barFill} ${styles.barAbstain}`}
									style={{ width: `${abstainPct}%` }}
								/>
							</div>
							<span className={styles.barCount}>
								{vote.abstained} ({abstainPct}%)
							</span>
						</div>
					</div>

					<p className={styles.result}>
						{result === "passed" && "Uchwała przyjęta"}
						{result === "rejected" && "Uchwała odrzucona"}
						{result === "tie" && "Remis"}
					</p>

					<div className={styles.statsRow}>
						<div className={styles.statCell}>
							<span className={styles.infoLabel}>Frekwencja</span>
							<span className={styles.infoValue}>
								{vote.totalEligible > 0
									? Math.round((totalVotes / vote.totalEligible) * 100)
									: 0}
								%
							</span>
						</div>
						<div className={styles.statCell}>
							<span className={styles.infoLabel}>Twój głos</span>
							<span className={styles.infoValue}>
								{vote.hasVoted ? formatVote(vote.myVote) : "Nie głosowałeś"}
							</span>
						</div>
					</div>

					{renderVotersList()}
				</section>
			)}

			{isBatch && isFinished && (
				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>Wyniki głosowania</h2>
					<p className={styles.sectionText}>
						Głosowanie zbiorcze — {vote.questions?.length || 0} pytań, każde
						głosowane niezależnie.
					</p>
					{renderBatchResults()}
				</section>
			)}

			{isBatch && statusClass === "active" && (
				<section className={styles.section}>
					<div className={styles.note}>
						<Lock size={16} />
						<span>
							Wyniki głosowania zbiorczego są dostępne dopiero po jego
							zakończeniu.
						</span>
					</div>
				</section>
			)}

			{statusClass === "upcoming" && (
				<section className={styles.section}>
					<p className={styles.sectionText}>
						Głosowanie jeszcze się nie rozpoczęło. Rozpocznie się:{" "}
						{new Date(vote.startTime).toLocaleString("pl-PL")}
					</p>
				</section>
			)}

			{statusClass === "archived" && (
				<section className={styles.section}>
					<p className={styles.sectionText}>
						To głosowanie zostało zarchiwizowane.
					</p>
				</section>
			)}
		</div>
	);
}
