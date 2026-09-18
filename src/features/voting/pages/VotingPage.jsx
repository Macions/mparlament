import React, { useEffect, useState } from "react";
import BackButton from "../../../components/PageBack";
import { useParams, useNavigate } from "react-router-dom";
import "./VotingPage.css";

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

const getCategoryLabel = (category) => {
	const labels = {
		resolution: "Uchwała",
		amendment: "Poprawka",
		law: "Ustawa",
		budget: "Budżet",
		committee: "Komisja",
		other: "Inne",
	};
	return labels[category] || category || "Nieznana";
};

const getApplicantLabel = (applicant) => {
	const labels = {
		marshal: "Marszałek Parlamentu",
		presidium: "Prezydium Parlamentu",
		group_15: "Grupa 15 posłów",
		individual: "Pojedynczy poseł",
	};
	return labels[applicant] || applicant || "Nieznany";
};

const getStatusLabel = (status) => {
	const statusMap = {
		pending: "Oczekująca",
		accepted: "Przyjęta",
		rejected: "Odrzucona",
		withdrawn: "Wycofana",
		active: "Aktywna",
		inactive: "Nieaktywna",
		archived: "Zarchiwizowana",
	};
	return statusMap[status] || status || "Nieznany";
};

export default function VotingPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [vote, setVote] = useState(null);
	const [now, setNow] = useState(Date.now());
	const [error, setError] = useState("");

	// single – pojedynczy głos
	const [pendingVote, setPendingVote] = useState(null);

	// batch – mapa questionId -> "for" | "against" | "abstain"
	const [batchAnswers, setBatchAnswers] = useState({});
	const [showBatchConfirm, setShowBatchConfirm] = useState(false);

	// powiązane obiekty per pytanie (dla batcha) – mapa questionId -> obiekt
	const [linkedItems, setLinkedItems] = useState({});

	const token = localStorage.getItem("token");

	// ============================================================
	// Pobieranie głosowania + powiązanych obiektów
	// ============================================================

	useEffect(() => {
		async function fetchVote() {
			try {
				const response = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				const data = await response.json();
				if (!response.ok) {
					throw new Error(data.message || "Nie udało się pobrać głosowania");
				}

				setVote(data);

				// SINGLE – jedno powiązanie
				if (
					data.votingMode !== "batch" &&
					data.linkedItemType &&
					data.linkedItemType !== "none" &&
					data.linkedItemId
				) {
					await fetchLinkedItemForSingle(data);
				}

				// BATCH – pobierz powiązania dla każdego pytania
				if (data.votingMode === "batch" && Array.isArray(data.questions)) {
					await fetchLinkedItemsForBatch(data.questions);
				}
			} catch (error) {
				setError(error.message);
			}
		}

		fetchVote();
	}, [id, token]);

	async function fetchLinkedItemForSingle(data) {
		let endpoint = "";
		if (data.linkedItemType === "resolution") {
			endpoint = `/newapp/api/resolutions/${data.linkedItemId}`;
		} else if (data.linkedItemType === "amendment") {
			endpoint = `/newapp/api/amendments/${data.linkedItemId}`;
		}
		if (!endpoint) return;

		try {
			const res = await fetch(endpoint, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const linkedData = await res.json();
				setLinkedItems((prev) => ({
					...prev,
					__single: linkedData.data || linkedData,
				}));
			}
		} catch {
			// ignore
		}
	}

	async function fetchLinkedItemsForBatch(questions) {
		const results = {};

		await Promise.all(
			questions.map(async (q) => {
				if (q.linkedItemType === "none" || !q.linkedItemId) return;

				let endpoint = "";
				if (q.linkedItemType === "resolution") {
					endpoint = `/newapp/api/resolutions/${q.linkedItemId}`;
				} else if (q.linkedItemType === "amendment") {
					endpoint = `/newapp/api/amendments/${q.linkedItemId}`;
				}
				if (!endpoint) return;

				try {
					const res = await fetch(endpoint, {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (res.ok) {
						const linkedData = await res.json();
						results[q.id] = linkedData.data || linkedData;
					}
				} catch {
					// ignore
				}
			}),
		);

		setLinkedItems(results);
	}

	// ============================================================
	// Polling – aktualizacja stanu (zakończenie, zmiany)
	// ============================================================

	useEffect(() => {
		if (!id) return;

		const interval = setInterval(async () => {
			try {
				const response = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!response.ok) return;

				const data = await response.json();

				setVote((prev) => {
					if (!prev) return data;

					// zachowaj lokalne odpowiedzi batcha jeśli głosowanie trwa
					return {
						...data,
						hasVoted: prev.hasVoted || data.hasVoted,
						myVote: prev.myVote ?? data.myVote,
						myAnswers: prev.myAnswers ?? data.myAnswers,
					};
				});

				if (data.status === "finished" || data.status === "archived") {
					setPendingVote(null);
					setShowBatchConfirm(false);
				}
			} catch {
				// cicho ignoruj
			}
		}, 1500);

		return () => clearInterval(interval);
	}, [id, token]);

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	// ============================================================
	// Głosowanie – SINGLE
	// ============================================================

	async function confirmVote() {
		try {
			const response = await fetch(`/newapp/api/votings/${id}/vote`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ vote: pendingVote }),
			});

			const raw = await response.text();
			let data = {};
			if (raw) {
				try {
					data = JSON.parse(raw);
				} catch {
					data = { message: raw };
				}
			}

			if (!response.ok) {
				if (response.status === 403 || response.status === 400) {
					setPendingVote(null);
					setError(data.message || "Głosowanie zostało zakończone");
					const refresh = await fetch(`/newapp/api/votings/${id}`, {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (refresh.ok) setVote(await refresh.json());
					return;
				}
				throw new Error(data.message || "Nie udało się oddać głosu");
			}

			setVote((prev) => ({
				...prev,
				hasVoted: true,
				myVote: data.vote,
			}));
			setPendingVote(null);
		} catch (error) {
			setError(error.message);
		}
	}

	// ============================================================
	// Głosowanie – BATCH
	// ============================================================

	function setAnswer(questionId, value) {
		setBatchAnswers((prev) => {
			// ponowne kliknięcie tego samego przycisku = odznaczenie
			if (prev[questionId] === value) {
				const copy = { ...prev };
				delete copy[questionId];
				return copy;
			}
			return { ...prev, [questionId]: value };
		});
	}

	function isBatchComplete() {
		if (!vote?.questions?.length) return false;
		return vote.questions.every((q) => batchAnswers[q.id]);
	}

	function batchProgress() {
		const total = vote?.questions?.length || 0;
		const done = Object.keys(batchAnswers).length;
		return { done, total };
	}

	async function confirmBatchVote() {
		try {
			const answers = Object.entries(batchAnswers).map(
				([questionId, voteValue]) => ({
					questionId,
					vote: voteValue,
				}),
			);

			const response = await fetch(`/newapp/api/votings/${id}/vote`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ answers }),
			});

			const raw = await response.text();
			let data = {};
			if (raw) {
				try {
					data = JSON.parse(raw);
				} catch {
					data = { message: raw };
				}
			}

			if (!response.ok) {
				if (response.status === 403 || response.status === 400) {
					setShowBatchConfirm(false);
					setError(data.message || "Głosowanie zostało zakończone");
					const refresh = await fetch(`/newapp/api/votings/${id}`, {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (refresh.ok) setVote(await refresh.json());
					return;
				}
				throw new Error(data.message || "Nie udało się oddać głosów");
			}

			setVote((prev) => ({
				...prev,
				hasVoted: true,
				myAnswers: data.answers || answers,
			}));
			setShowBatchConfirm(false);
		} catch (error) {
			setError(error.message);
		}
	}

	// ============================================================
	// Render
	// ============================================================

	if (error) {
		return <h2>{error}</h2>;
	}

	if (!vote) {
		return <h2>Ładowanie...</h2>;
	}

	const startTime = new Date(vote.startTime).getTime();
	const endTime = new Date(vote.endTime).getTime();

	const isUpcoming = now < startTime;
	const isActive = now >= startTime && now < endTime;
	const isFinished = now >= endTime;
	const isBatch = vote.votingMode === "batch";

	const remainingSec = Math.max(0, Math.floor((endTime - now) / 1000));
	const categoryLabel = getCategoryLabel(vote.category);
	const statusLabel = getStatusLabel(vote.status);
	const { done, total } = batchProgress();

	const linkedItem = linkedItems.__single || null;

	return (
		<>
			<div className="voting-page">
				<BackButton to="/glosowania" label="Głosowania" />

				<div className="voting-container">
					<div className="voting-header">
						<span className="voting-type">{categoryLabel}</span>

						{isBatch && (
							<span className="voting-batch-badge">{total} pytań</span>
						)}

						<span
							className={`voting-status ${
								isActive ? "active" : isFinished ? "finished" : "upcoming"
							}`}
						>
							{isActive ? "TRWA" : isFinished ? "ZAKOŃCZONE" : "OCZEKUJE"}
						</span>
					</div>

					<h1 className="voting-title">{vote.title}</h1>

					<div className="voting-details">
						{vote.description && (
							<div className="voting-description">
								<h3>Opis:</h3>
								<p>{vote.description}</p>
							</div>
						)}

						<div className="voting-meta">
							<div className="meta-item">
								<span className="meta-label">Kategoria:</span>
								<span className="meta-value">{categoryLabel}</span>
							</div>
							{vote.status && (
								<div className="meta-item">
									<span className="meta-label">Status:</span>
									<span className="meta-value">{statusLabel}</span>
								</div>
							)}
							{vote.applicant && (
								<div className="meta-item">
									<span className="meta-label">Wnioskodawca:</span>
									<span className="meta-value">
										{getApplicantLabel(vote.applicant)}
									</span>
								</div>
							)}
							<div className="meta-item">
								<span className="meta-label">Data rozpoczęcia:</span>
								<span className="meta-value">
									{new Date(startTime).toLocaleString()}
								</span>
							</div>
							<div className="meta-item">
								<span className="meta-label">Data zakończenia:</span>
								<span className="meta-value">
									{new Date(endTime).toLocaleString()}
								</span>
							</div>
						</div>

						{/* SINGLE – powiązanie */}
						{!isBatch && linkedItem && (
							<div className="voting-linked-item">
								<h3>Powiązane:</h3>
								<div className="linked-item-card">
									<div className="linked-item-header">
										<span className="linked-item-type">
											{vote.linkedItemType === "resolution"
												? "Uchwała"
												: "Poprawka"}
										</span>
										{linkedItem.status && (
											<span className="linked-item-status">
												{getStatusLabel(linkedItem.status)}
											</span>
										)}
									</div>
									<h4 className="linked-item-title">{linkedItem.title}</h4>
									{linkedItem.content && (
										<p className="linked-item-content">{linkedItem.content}</p>
									)}
									{linkedItem.description && (
										<p className="linked-item-content">
											{linkedItem.description}
										</p>
									)}
									{linkedItem.preamble && (
										<p className="linked-item-content">{linkedItem.preamble}</p>
									)}
									<div className="linked-item-meta">
										{linkedItem.author && (
											<span>Autor: {linkedItem.author}</span>
										)}
										{linkedItem.createdAt && (
											<span>
												Data:{" "}
												{new Date(linkedItem.createdAt).toLocaleDateString()}
											</span>
										)}
									</div>
									<button
										className="btn-goto-linked"
										onClick={() => {
											if (vote.linkedItemType === "resolution") {
												navigate(`/${linkedItem.slug}`);
											} else if (vote.linkedItemType === "amendment") {
												const resolutionSlug =
													linkedItem.resolution?.slug ||
													linkedItem.resolutionId;
												navigate(
													`/${resolutionSlug}/poprawka/${linkedItem.id}`,
												);
											}
										}}
									>
										Zobacz szczegóły →
									</button>
								</div>
							</div>
						)}

						{!isBatch &&
							(!vote.linkedItemType || vote.linkedItemType === "none") && (
								<div className="voting-linked-item no-link">
									<p className="no-link-text">
										Brak powiązania z uchwałą lub poprawką
									</p>
								</div>
							)}
					</div>

					{isActive && (
						<p style={{ fontSize: "1.1rem", marginBottom: "20px" }}>
							Do końca:
							<strong> {formatTime(remainingSec)}</strong>
						</p>
					)}

					{isUpcoming && (
						<p style={{ opacity: 0.7 }}>
							Głosowanie jeszcze się nie rozpoczęło
						</p>
					)}

					{/* ============================================================
					    SINGLE – karta pojedynczego głosu
					   ============================================================ */}
					{isActive && !isBatch && (
						<div className="vote-options">
							<h3>Twój głos</h3>

							{vote.hasVoted ? (
								<p>
									Już zagłosowałeś:
									<strong> {formatVote(vote.myVote)}</strong>
								</p>
							) : (
								<div className="vote-buttons">
									<button
										className="vote-btn for"
										onClick={() => setPendingVote("for")}
									>
										ZA
									</button>
									<button
										className="vote-btn against"
										onClick={() => setPendingVote("against")}
									>
										PRZECIW
									</button>
									<button
										className="vote-btn abstain"
										onClick={() => setPendingVote("abstain")}
									>
										WSTRZYMANIE
									</button>
								</div>
							)}
						</div>
					)}

					{/* ============================================================
					    BATCH – lista pytań
					   ============================================================ */}
					{isActive && isBatch && (
						<div className="vote-options batch">
							<div className="batch-header">
								<h3>Twój głos</h3>
								<span className="batch-progress">
									{done} / {total} pytań
								</span>
							</div>

							{vote.hasVoted ? (
								<div className="batch-results">
									<p className="batch-results-title">
										Już oddałeś głos na wszystkie pytania:
									</p>
									<ol className="batch-answers-list">
										{vote.questions.map((q, idx) => {
											const myAnswer =
												vote.myAnswers?.find(
													(a) => String(a.questionId) === String(q.id),
												)?.vote || null;
											return (
												<li key={q.id} className="batch-answer-row">
													<span className="batch-answer-idx">{idx + 1}.</span>
													<span className="batch-answer-text">{q.text}</span>
													<span
														className={`batch-answer-value batch-answer-${myAnswer || "none"}`}
													>
														{formatVote(myAnswer)}
													</span>
												</li>
											);
										})}
									</ol>
								</div>
							) : (
								<>
									<ol className="batch-questions-list">
										{vote.questions.map((q, idx) => {
											const answer = batchAnswers[q.id];
											const linked = linkedItems[q.id];

											return (
												<li key={q.id} className="batch-question-item">
													<div className="batch-question-head">
														<span className="batch-question-idx">
															{idx + 1}
														</span>
														<span className="batch-question-text">
															{q.text}
														</span>
													</div>

													{linked && (
														<div className="batch-question-linked">
															<span className="batch-linked-badge">
																{q.linkedItemType === "resolution"
																	? "Uchwała"
																	: "Poprawka"}
															</span>
															<span className="batch-linked-title">
																{linked.title ||
																	linked.content?.substring(0, 80) ||
																	`#${q.linkedItemId}`}
															</span>
														</div>
													)}

													<div className="batch-vote-buttons">
														<button
															type="button"
															className={`vote-btn for ${
																answer === "for" ? "selected" : ""
															}`}
															onClick={() => setAnswer(q.id, "for")}
														>
															ZA
														</button>
														<button
															type="button"
															className={`vote-btn against ${
																answer === "against" ? "selected" : ""
															}`}
															onClick={() => setAnswer(q.id, "against")}
														>
															PRZECIW
														</button>
														<button
															type="button"
															className={`vote-btn abstain ${
																answer === "abstain" ? "selected" : ""
															}`}
															onClick={() => setAnswer(q.id, "abstain")}
														>
															WSTRZYMANIE
														</button>
													</div>
												</li>
											);
										})}
									</ol>

									<div className="batch-submit-row">
										<button
											type="button"
											className="batch-submit-btn"
											disabled={!isBatchComplete()}
											onClick={() => setShowBatchConfirm(true)}
										>
											{isBatchComplete()
												? "Zatwierdź wszystkie głosy"
												: `Uzupełnij wszystkie pytania (${done}/${total})`}
										</button>
									</div>
								</>
							)}
						</div>
					)}

					{isFinished && (
						<div className="voting-finished">
							<h3>Głosowanie zakończone</h3>
							<p>Wyniki zostaną przedstawione na stronie głosowań.</p>
						</div>
					)}
				</div>
			</div>

			{/* ============================================================
			    Modal potwierdzenia – SINGLE
			   ============================================================ */}
			{pendingVote && isActive && !isBatch && (
				<div className="modal-backdrop">
					<div className="modal">
						<h3>Potwierdź głos</h3>
						<p>
							Czy na pewno chcesz zagłosować:
							<strong> {formatVote(pendingVote)}</strong>?
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

			{/* ============================================================
			    Modal potwierdzenia – BATCH
			   ============================================================ */}
			{showBatchConfirm && isActive && isBatch && (
				<div className="modal-backdrop">
					<div className="modal batch-confirm-modal">
						<h3>Potwierdź wszystkie głosy</h3>
						<p className="modal-lead">
							Sprawdź swoje odpowiedzi. Po zatwierdzeniu nie będzie można ich
							zmienić.
						</p>

						<ol className="batch-confirm-list">
							{vote.questions.map((q, idx) => (
								<li key={q.id} className="batch-confirm-row">
									<span className="batch-confirm-idx">{idx + 1}.</span>
									<span className="batch-confirm-text">{q.text}</span>
									<span
										className={`batch-confirm-value batch-answer-${
											batchAnswers[q.id] || "none"
										}`}
									>
										{formatVote(batchAnswers[q.id])}
									</span>
								</li>
							))}
						</ol>

						<div className="modal-actions">
							<button onClick={() => setShowBatchConfirm(false)}>Anuluj</button>
							<button onClick={confirmBatchVote} className="confirm">
								Zatwierdź wszystkie
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
