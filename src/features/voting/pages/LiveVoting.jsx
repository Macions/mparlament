import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./LiveVoting.css";
import BackButton from "../../../components/PageBack";
import { useSocket } from "../../../socket/SocketProvider";

export default function LiveVoting() {
	const { id } = useParams();
	const navigate = useNavigate();
	const token = localStorage.getItem("token");
	const { socket, isConnected } = useSocket(); // <-- PRZENIESIONE DO ŚRODKA

	const [voting, setVoting] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const [user, setUser] = useState(null);
	const [timeLeft, setTimeLeft] = useState("");
	const [votedCount, setVotedCount] = useState(0);
	const [totalEligible, setTotalEligible] = useState(0);
	const [eligibleUsers, setEligibleUsers] = useState([]);
	const [votedUsers, setVotedUsers] = useState([]);
	const [notVotedUsers, setNotVotedUsers] = useState([]);
	const [isLive, setIsLive] = useState(true);
	const [parliamentarians, setParliamentarians] = useState([]);

	// WebSocket - nasłuchuj na aktualizacje
	useEffect(() => {
		if (!socket) return;

		const handleVoteUpdate = (data) => {
			console.log("WebSocket: Nowe dane głosowania:", data);
			setVotedCount(data.votedCount || 0);
			setVoting((prev) => ({
				...prev,
				votesFor: data.votesFor || 0,
				votesAgainst: data.votesAgainst || 0,
				abstained: data.abstained || 0,
			}));
			if (data.votedUsers) {
				setVotedUsers(data.votedUsers);
			}
			if (data.notVotedUsers) {
				setNotVotedUsers(data.notVotedUsers);
			}
		};

		socket.on(`voteUpdate:${id}`, handleVoteUpdate);

		return () => {
			socket.off(`voteUpdate:${id}`, handleVoteUpdate);
		};
	}, [socket, id]);

	useEffect(() => {
		async function fetchParliamentarians() {
			try {
				const response = await fetch("/api/parliamentarians", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const data = await response.json();
					console.log("Parliamentarians response:", data);
					const allParliamentarians = data.parliamentarians || data || [];
					console.log("Parliamentarians:", allParliamentarians);
					setParliamentarians(allParliamentarians);
				}
			} catch (err) {
				console.error("Błąd pobierania parlamentarzystów:", err);
			}
		}
		fetchParliamentarians();
	}, [token]);

	useEffect(() => {
		async function fetchUser() {
			try {
				const response = await fetch("/api/auth/me", {
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
			} catch (err) {
				console.error("Błąd pobierania użytkownika:", err);
			}
		}
		fetchUser();
	}, [token]);

	useEffect(() => {
		async function fetchVoting() {
			try {
				setLoading(true);
				const response = await fetch(`/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!response.ok) throw new Error("Nie udało się pobrać głosowania");
				const data = await response.json();
				setVoting(data);

				// UŻYJ TEGO SAMEGO data - NIE POBIERAJ DRUGI RAZ!
				setEligibleUsers(data.eligibleUsers || []);
				setVotedUsers(data.votedUsers || []);
				setNotVotedUsers(data.notVotedUsers || []);
				setTotalEligible(data.totalEligible || 0);
				setVotedCount(data.votedCount || 0);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		if (id) {
			fetchVoting();
		}
	}, [id, token, parliamentarians]);

	// Licznik czasu
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
				`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
			);
		}, 1000);

		return () => clearInterval(interval);
	}, [voting]);

	// Polling - fallback gdy WebSocket nie działa
	useEffect(() => {
		// Jeśli WebSocket jest podłączony - nie używaj polling
		if (isConnected || !isLive || !voting) return;

		console.log("WebSocket nieaktywny - używam polling co 3 sekundy");

		const interval = setInterval(async () => {
			try {
				const response = await fetch(`/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const data = await response.json();
					setVotedCount(data.votedCount || 0);
					setVoting((prev) => ({
						...prev,
						votesFor: data.votesFor || 0,
						votesAgainst: data.votesAgainst || 0,
						abstained: data.abstained || 0,
					}));
					if (data.votedUsers) {
						setVotedUsers(data.votedUsers);
					}
					if (data.notVotedUsers) {
						setNotVotedUsers(data.notVotedUsers);
					}
				}
			} catch (err) {
				console.error("Błąd pobierania aktualnych danych:", err);
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [id, token, isLive, voting, isConnected]);

	if (loading)
		return (
			<div className="live-voting-loading">
				<div className="spinner"></div>
				<p>Ładowanie głosowania...</p>
			</div>
		);

	if (error)
		return (
			<div className="live-voting-error">
				<h2>Błąd</h2>
				<p>{error}</p>
				<button onClick={() => navigate("/glosowania")}>
					Wróć do głosowań
				</button>
			</div>
		);

	if (!voting)
		return (
			<div className="live-voting-error">
				<h2>Nie znaleziono głosowania</h2>
				<button onClick={() => navigate("/glosowania")}>
					Wróć do głosowań
				</button>
			</div>
		);

	const voterTurnout =
		totalEligible > 0 ? Math.round((votedCount / totalEligible) * 100) : 0;

	return (
		<div className="live-voting-page">
			<BackButton to="/glosowania" label="Głosowania" />

			<div className="live-voting-header">
				<h1>{voting.title}</h1>
				<div className={`live-status ${isLive ? "live" : "ended"}`}>
					<span className="live-dot"></span>
					{isLive ? "GŁOSOWANIE TRWA" : "GŁOSOWANIE ZAKOŃCZONE"}
				</div>
			</div>

			<div className="live-voting-grid">
				<div className="live-card timer-card">
					<h3>Pozostały czas</h3>
					<div className="timer-display">{timeLeft}</div>
					<div className="timer-details">
						<span>
							Start: {new Date(voting.startTime).toLocaleString("pl-PL")}
						</span>
						<span>
							Koniec: {new Date(voting.endTime).toLocaleString("pl-PL")}
						</span>
					</div>
				</div>

				<div className="live-card stats-card">
					<h3>Statystyki głosowania</h3>
					<div className="stats-grid">
						<div className="stat-item">
							<span className="stat-label">Uprawnionych</span>
							<span className="stat-value">{totalEligible}</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Zagłosowało</span>
							<span className="stat-value">{votedCount}</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Nie zagłosowało</span>
							<span className="stat-value">{totalEligible - votedCount}</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Frekwencja</span>
							<span className="stat-value">{voterTurnout}%</span>
						</div>
					</div>
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{ width: `${voterTurnout}%` }}
						></div>
					</div>
				</div>
			</div>

			{isAdmin && (
				<div className="live-voting-details">
					<div className="live-voting-card">
						<h3>Lista uprawnionych</h3>
						<div className="eligible-list">
							<div className="list-header">
								<span>Imię i nazwisko</span>
								<span>Status</span>
							</div>
							{eligibleUsers.map((user) => {
								const hasVoted = votedUsers.some((v) => v.id === user.id);
								return (
									<div
										key={user.id}
										className={`list-item ${hasVoted ? "voted" : "not-voted"}`}
									>
										<span>{user.name}</span>
										<span className="status-badge">
											{hasVoted ? "Zagłosował" : "Nie zagłosował"}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
