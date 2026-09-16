import React, { useEffect, useState } from "react";
import BackButton from "../../../components/PageBack";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "./VotingDetailsPage.module.css";
import { Lock, Check, X, Minus } from "lucide-react";

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

function getRecipientsLabel(vote) {
	switch (vote.recipientsType) {
		case "all":
			return "Wszyscy członkowie";
		case "groups":
			return "Wybrane grupy:";
		case "members":
			return "Wybrani członkowie:";
		default:
			return "Nieokreślone";
	}
}

export default function VotingDetailsPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [vote, setVote] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [recipientsDetails, setRecipientsDetails] = useState(null);

	const token = localStorage.getItem("token");

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
				const response = await fetch(`/newapp/api/votings/${id}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.message || "Nie udało się pobrać głosowania");
				}

				setVote(data);

				if (data.recipientsType === "groups" && data.selectedGroups) {
					try {
						const groupsResponse = await fetch("/newapp/api/groups", {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						});
						const groupsData = await groupsResponse.json();

						const selectedGroupsDetails = groupsData.filter((g) =>
							data.selectedGroups.includes(g.id),
						);
						setRecipientsDetails({
							type: "groups",
							data: selectedGroupsDetails,
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
						const membersResponse = await fetch("/newapp/api/users", {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						});
						const membersData = await membersResponse.json();

						const selectedMembersDetails = membersData.filter((m) =>
							data.selectedMembers.includes(m.id),
						);
						setRecipientsDetails({
							type: "members",
							data: selectedMembersDetails,
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
					setRecipientsDetails({
						type: "all",
						data: null,
					});
				}
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
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={`${styles.skeleton} ${styles.skeletonBody}`} />
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.page}>
				<BackButton to="/glosowania" label="Głosowania" />
				<div className={styles.errorBanner}>{error}</div>
			</div>
		);
	}

	if (!vote) {
		return (
			<div className={styles.page}>
				<BackButton to="/glosowania" label="Głosowania" />
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

	const recipientsLabel = getRecipientsLabel(vote);
	const categoryTranslations = {
		resolution: "Uchwała",
		law: "Ustawa",
		other: "Inne",
		bill: "Projekt ustawy",
		amendment: "Poprawka",
		motion: "Wniosek",
	};

	const renderVotersList = () => {
		if (
			!vote.isAnonymous &&
			(statusClass === "finished" || statusClass === "archived")
		) {
			const voters = vote.votedUsers || [];

			if (voters.length === 0) {
				return (
					<div className={styles.votersEmpty}>
						<p>Brak danych o głosujących</p>
					</div>
				);
			}

			return (
				<div className={styles.votersSection}>
					<h3 className={styles.votersTitle}>Lista głosujących</h3>

					<div className={styles.votersTableWrap}>
						<table className={styles.votersTable}>
							<thead>
								<tr>
									<th>Lp.</th>
									<th>Imię i nazwisko</th>
									<th>Klub</th>
									<th>Głos</th>
								</tr>
							</thead>
							<tbody>
								{voters.map((voter, index) => {
									const voteValue = voter.vote || "abstain";
									return (
										<tr key={voter.id || index}>
											<td className={styles.voterIndex}>{index + 1}</td>
											<td>{voter.name || `Użytkownik ${voter.id}`}</td>
											<td>{voter.club || "—"}</td>
											<td>
												<span
													className={`${styles.voteBadge} ${
														styles[`vote_${voteValue}`] || ""
													}`}
												>
													{voteValue === "for" && <Check size={14} />}
													{voteValue === "against" && <X size={14} />}
													{voteValue === "abstain" && <Minus size={14} />}
													{formatVote(voter.vote)}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			);
		}

		if (vote.isAnonymous) {
			return (
				<div className={styles.anonymousBox}>
					<Lock size={18} />
					<span>
						Głosowanie jest niejawne — lista głosujących nie jest dostępna.
					</span>
				</div>
			);
		}

		return null;
	};

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<BackButton to="/glosowania" label="Głosowania" />
			</header>

			<main className={styles.main}>
				<div className={styles.head}>
					<div className={styles.meta}>
						<span className={styles.category}>
							{categoryTranslations[vote.category] || vote.category}
						</span>
						<span
							className={`${styles.statusBadge} ${
								styles[`status_${statusClass}`] || ""
							}`}
						>
							{statusLabel}
						</span>
					</div>

					<h1 className={styles.title}>{vote.title}</h1>
					{vote.description && (
						<p className={styles.description}>{vote.description}</p>
					)}
				</div>

				<section className={styles.infoGrid}>
					<div className={styles.infoItem}>
						<span className={styles.infoLabel}>Start głosowania</span>
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

					<div className={styles.infoItem}>
						<span className={styles.infoLabel}>Koniec głosowania</span>
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

					<div className={styles.infoItem}>
						<span className={styles.infoLabel}>Autor</span>
						<span className={styles.infoValue}>
							{vote.createdBy || "Nieznany"}
						</span>
					</div>

					<div className={styles.infoItem}>
						<span className={styles.infoLabel}>Łączna liczba głosów</span>
						<span className={styles.infoValue}>{totalVotes}</span>
					</div>
				</section>

				<section className={styles.section}>
					<h2 className={styles.sectionTitle}>Uprawnieni do głosowania</h2>

					<div className={styles.recipients}>
						<span className={styles.recipientsType}>{recipientsLabel}</span>

						{recipientsDetails?.type === "all" && (
							<p className={styles.recipientsText}>
								Wszyscy członkowie Parlamentu Młodych RP są uprawnieni do
								głosowania.
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

						{recipientsDetails?.type === "members" &&
							recipientsDetails.data && (
								<div className={styles.tags}>
									{recipientsDetails.data.map((member, index) => (
										<span key={index} className={styles.tag}>
											{member.name || `Członek ${member.id}`}
										</span>
									))}
								</div>
							)}
					</div>
				</section>

				{(statusClass === "finished" || statusClass === "archived") && (
					<section className={styles.section}>
						<h2 className={styles.sectionTitle}>Wyniki głosowania</h2>

						<div className={styles.resultsBars}>
							<div className={styles.resultRow}>
								<div className={styles.resultLabel}>
									<span className={styles.resultLabelText}>
										<Check size={14} /> ZA
									</span>
									<span className={styles.resultCount}>{vote.votesFor}</span>
								</div>
								<div className={styles.resultTrack}>
									<div
										className={`${styles.resultFill} ${styles.resultFor}`}
										style={{ width: `${forPercentage}%` }}
									/>
								</div>
								<span className={styles.resultPercentage}>
									{forPercentage}%
								</span>
							</div>

							<div className={styles.resultRow}>
								<div className={styles.resultLabel}>
									<span className={styles.resultLabelText}>
										<X size={14} /> PRZECIW
									</span>
									<span className={styles.resultCount}>
										{vote.votesAgainst}
									</span>
								</div>
								<div className={styles.resultTrack}>
									<div
										className={`${styles.resultFill} ${styles.resultAgainst}`}
										style={{ width: `${againstPercentage}%` }}
									/>
								</div>
								<span className={styles.resultPercentage}>
									{againstPercentage}%
								</span>
							</div>

							<div className={styles.resultRow}>
								<div className={styles.resultLabel}>
									<span className={styles.resultLabelText}>
										<Minus size={14} /> WSTRZYMANIE
									</span>
									<span className={styles.resultCount}>{vote.abstained}</span>
								</div>
								<div className={styles.resultTrack}>
									<div
										className={`${styles.resultFill} ${styles.resultAbstained}`}
										style={{ width: `${abstainPercentage}%` }}
									/>
								</div>
								<span className={styles.resultPercentage}>
									{abstainPercentage}%
								</span>
							</div>
						</div>

						<div
							className={`${styles.finalResult} ${
								styles[`finalResult_${result}`] || ""
							}`}
						>
							{result === "passed" && "Uchwała przyjęta"}
							{result === "rejected" && "Uchwała odrzucona"}
							{result === "tie" && "Remis"}
						</div>

						<div className={styles.stats}>
							<div className={styles.stat}>
								<span className={styles.statLabel}>Frekwencja</span>
								<span className={styles.statValue}>
									{totalVotes > 0 ? Math.round((totalVotes / 300) * 100) : 0}%
								</span>
							</div>
							<div className={styles.stat}>
								<span className={styles.statLabel}>Twój głos</span>
								<span className={styles.statValue}>
									{vote.hasVoted ? formatVote(vote.myVote) : "Nie głosowałeś"}
								</span>
							</div>
						</div>

						{renderVotersList()}
					</section>
				)}

				{statusClass === "upcoming" && (
					<section className={styles.upcoming}>
						<p className={styles.upcomingTitle}>
							Głosowanie jeszcze się nie rozpoczęło
						</p>
						<p className={styles.upcomingText}>
							Rozpocznie się: {new Date(vote.startTime).toLocaleString("pl-PL")}
						</p>
					</section>
				)}

				{statusClass === "archived" && (
					<section className={styles.archived}>
						<p>To głosowanie zostało zarchiwizowane.</p>
					</section>
				)}
			</main>
		</div>
	);
}
