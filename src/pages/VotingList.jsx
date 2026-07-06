import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./VotingList.css";

const mockVotes = [
	{
		id: 1,
		title: "Uchwała w sprawie zwiększenia finansowania oświaty",
		type: "amendment",
		category: "Poprawka",
		startTime: "2026-07-06T16:19:00Z",
		durationMs: 10 * 60 * 2000,
		hasVoted: false,
		myVote: null,
		votesFor: 142,
		votesAgainst: 87,
		abstained: 12,
		total: 241,
	},
	{
		id: 2,
		title: "Zmiana w ustawie o ochronie środowiska",
		type: "committee",
		category: "Komisja",
		startTime: "2026-07-06T16:00:00Z",
		durationMs: 10 * 60 * 1000,
		hasVoted: false,
		myVote: null,
		votesFor: 0,
		votesAgainst: 0,
		abstained: 0,
		total: 241,
	},
	{
		id: 3,
		title: "Budowa nowej drogi ekspresowej S-19",
		type: "amendment",
		category: "Poprawka",
		startTime: "2026-07-05T11:00:00Z",
		durationMs: 24 * 60 * 60 * 1000,
		hasVoted: true,
		myVote: "for",
		votesFor: 168,
		votesAgainst: 61,
		abstained: 12,
		total: 241,
	},
	{
		id: 4,
		title: "Przyjęcie sprawozdania Komisji Finansów Publicznych",
		type: "committee",
		category: "Komisja",
		startTime: "2026-07-04T09:45:00Z",
		durationMs: 24 * 60 * 60 * 1000,
		hasVoted: true,
		myVote: "against",
		votesFor: 95,
		votesAgainst: 134,
		abstained: 12,
		total: 241,
	},
	{
		id: 5,
		title: "Uchwała w sprawie zwiększenia finansowania oświaty",
		type: "amendment",
		category: "Poprawka",
		startTime: "2026-07-06T14:49:00Z",
		durationMs: 7 * 60 * 1000,
		hasVoted: false,
		myVote: null,
		votesFor: 142,
		votesAgainst: 87,
		abstained: 12,
		total: 241,
	},
];

function getVoteStatus(vote) {
	const now = Date.now();
	const start = new Date(vote.startTime).getTime();
	const end = start + vote.durationMs;

	if (now < start) return "upcoming";
	if (now <= end) return "active";
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
	const [filter, setFilter] = useState("all");
	const [now, setNow] = useState(Date.now());
	// Tymczasowo true dla testów
	const [isAdmin, setIsAdmin] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const filteredVotes = mockVotes.filter((vote) => {
		const status = getVoteStatus(vote);
		if (filter === "active") return status === "active";
		if (filter === "finished") return status === "finished";
		if (filter === "upcoming") return status === "upcoming";
		return true;
	});

	return (
		<div className="votings-page">
			<div className="votings-header">
				<h1>Głosowania</h1>
				<p>Aktualne i zakończone głosowania Parlamentu Młodych RP</p>
			</div>

			<div className="votings-filters">
				<button
					className={`filter-btn ${filter === "all" ? "active" : ""}`}
					onClick={() => setFilter("all")}
				>
					Wszystkie
				</button>
				<button
					className={`filter-btn ${filter === "upcoming" ? "active" : ""}`}
					onClick={() => setFilter("upcoming")}
				>
					Oczekujące
				</button>
				<button
					className={`filter-btn ${filter === "active" ? "active" : ""}`}
					onClick={() => setFilter("active")}
				>
					Aktywne
				</button>
				<button
					className={`filter-btn ${filter === "finished" ? "active" : ""}`}
					onClick={() => setFilter("finished")}
				>
					Zakończone
				</button>
			</div>

			<div className="votings-grid">
				{/* Kafelek tworzenia nowego głosowania - zawsze pierwszy */}
				{isAdmin && (
					<Link to="/glosowania/nowe" className="voting-card create-vote-card">
						<div className="create-vote-content">
							<div className="create-vote-icon">+</div>
							<h3>Utwórz nowe głosowanie</h3>
						</div>
					</Link>
				)}

				{filteredVotes.map((vote) => {
					const status = getVoteStatus(vote);
					const end = new Date(vote.startTime).getTime() + vote.durationMs;
					const remainingSec = Math.max(0, Math.floor((end - now) / 1000));
					const result = status === "finished" ? getResult(vote) : null;

					return (
						<div key={vote.id} className={`voting-card ${status}`}>
							<div className="voting-card-header">
								<span className="voting-type">{vote.category}</span>
								<span className={`voting-status ${status}`}>
									{status === "active"
										? "TRWA"
										: status === "finished"
											? "ZAKOŃCZONE"
											: "OCZEKUJE"}
								</span>
							</div>

							<h3 className="voting-title">{vote.title}</h3>

							<div className="voting-info">
								<p>
									<strong>
										{status === "finished" ? "Zakończono:" : "Start:"}
									</strong>{" "}
									{new Date(vote.startTime).toLocaleString("pl-PL")}
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
						</div>
					);
				})}
			</div>

			{filteredVotes.length === 0 && (
				<p className="no-votes">Brak głosowań w wybranej kategorii.</p>
			)}
		</div>
	);
}