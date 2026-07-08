import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./VotingPage.css";

const mockVotes = [
	{
		id: 1,
		title: "Uchwała w sprawie zwiększenia finansowania oświaty",
		category: "Poprawka",
		description:
			"Projekt zakłada zwiększenie budżetu oświaty o 15% w roku budżetowym 2026.",

		startTime: "2026-07-06T16:50:00Z",
		durationMs: 3 * 60 * 1000,

		hasVoted: false,
		myVote: null,
		votesFor: 142,
		votesAgainst: 87,
		abstained: 12,
		total: 241,
	},
];

function formatTime(sec) {
	if (sec <= 0) return "0s";
	if (sec < 60) return `${sec}s`;

	const min = Math.floor(sec / 60);
	const s = sec % 60;

	if (min < 60) return s ? `${min} min ${s}s` : `${min} min`;

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

async function getServerTimeOffset() {
	try {
		const res = await fetch(
			"https://worldtimeapi.org/api/timezone/Europe/Warsaw",
		);
		const data = await res.json();

		const serverTime = new Date(data.utc_datetime).getTime();
		const localTime = Date.now();

		return serverTime - localTime;
	} catch (e) {
		return 0;
	}
}

export default function VotingPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const vote = useMemo(() => mockVotes.find((v) => v.id === Number(id)), [id]);

	const [offset, setOffset] = useState(0);
	const [now, setNow] = useState(Date.now());
	const [pendingVote, setPendingVote] = useState(null);

	useEffect(() => {
		async function sync() {
			const diff = await getServerTimeOffset();
			setOffset(diff);
		}
		sync();
	}, []);

	useEffect(() => {
		const t = setInterval(() => {
			setNow(Date.now() + offset);
		}, 1000);

		return () => clearInterval(t);
	}, [offset]);

	if (!vote) return <h2>Głosowanie nie istnieje</h2>;

	const startTime = new Date(vote.startTime).getTime();
	const endTime = startTime + vote.durationMs;

	const isUpcoming = now < startTime;
	const isActive = now >= startTime && now < endTime;
	const isFinished = now >= endTime;

	const remainingSec = Math.max(0, Math.floor((endTime - now) / 1000));

	function handleVote(type) {
		setPendingVote(type);
	}

	function confirmVote() {
		console.log("VOTE:", pendingVote);

		vote.hasVoted = true;
		vote.myVote = pendingVote;

		setPendingVote(null);
	}

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
						<p style={{ fontSize: "1.1rem", marginBottom: "20px" }}>
							Do końca: <strong>{formatTime(remainingSec)}</strong>
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
								<p>Już zagłosowałeś: {formatVote(vote.myVote)}</p>
							) : (
								<div className="vote-buttons">
									<button
										className="vote-btn for"
										onClick={() => handleVote("for")}
									>
										ZA
									</button>

									<button
										className="vote-btn against"
										onClick={() => handleVote("against")}
									>
										PRZECIW
									</button>

									<button
										className="vote-btn abstain"
										onClick={() => handleVote("abstain")}
									>
										WSTRZYMANIE
									</button>
								</div>
							)}
						</div>
					)}

					{isFinished && (
						<div className="voting-results">
							<h3>Głosowanie zakończone</h3>
							<p>Tu później wynik z backendu</p>
						</div>
					)}
				</div>
			</div>

			{pendingVote && (
				<div className="modal-backdrop">
					<div className="modal">
						<h3>Potwierdź głos</h3>
						<p>
							Czy na pewno chcesz zagłosować:{" "}
							<strong>{formatVote(pendingVote)}</strong>?
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
