import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./AmendmentsPage.css";

export default function AmendmentsPage() {
	const { slug } = useParams();

	const [resolution, setResolution] = useState(null);
	const [amendments, setAmendments] = useState([]);
	const [session, setSession] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Stan dla modala
	const [showWithdrawModal, setShowWithdrawModal] = useState(false);
	const [selectedAmendmentId, setSelectedAmendmentId] = useState(null);
	const [withdrawReason, setWithdrawReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Pobierz aktualnego użytkownika
				try {
					const userResponse = await fetch("/api/current-user");
					if (userResponse.ok) {
						const userData = await userResponse.json();
						setCurrentUser(userData.user);
					}
				} catch (error) {
					console.error("Błąd pobierania użytkownika:", error);
				}

				// Pobierz poprawki
				const response = await fetch(`/api/resolutions/${slug}/amendments`);

				if (!response.ok) {
					throw new Error("Nie znaleziono uchwały");
				}

				const data = await response.json();
				setResolution(data.resolution);
				setAmendments(data.amendments);
				setSession(data.session);
			} catch (error) {
				console.error("Błąd pobierania poprawek:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [slug]);

	const isAmendmentWithdrawn = (amendment) => {
		return amendment.status === "withdrawn";
	};

	const isCurrentUserAuthor = (amendment) => {
		if (!currentUser) return false;
		if (amendment.authorId !== undefined) {
			return amendment.authorId === currentUser.id;
		}
		return amendment.author === currentUser.name;
	};

	// Otwórz modal z konkretną poprawką
	const openWithdrawModal = (amendmentId) => {
		setSelectedAmendmentId(amendmentId);
		setWithdrawReason("");
		setShowWithdrawModal(true);
	};

	// Zamknij modal
	const closeWithdrawModal = () => {
		setShowWithdrawModal(false);
		setSelectedAmendmentId(null);
		setWithdrawReason("");
		setIsSubmitting(false);
	};

	// Wycofaj poprawkę
	const handleWithdrawConfirm = async () => {
		if (!selectedAmendmentId) return;

		setIsSubmitting(true);

		try {
			const response = await fetch(
				`/api/amendments/${selectedAmendmentId}/withdraw`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						reason: withdrawReason.trim() || "Brak podanego powodu",
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Błąd podczas wycofywania poprawki");
			}

			// Po udanym wycofaniu, odśwież listę poprawek
			const updatedResponse = await fetch(
				`/api/resolutions/${slug}/amendments`,
			);
			const data = await updatedResponse.json();
			setAmendments(data.amendments);

			// Zamknij modal
			closeWithdrawModal();
		} catch (error) {
			console.error("Błąd wycofywania poprawki:", error);
			alert("Nie udało się wycofać poprawki. Spróbuj ponownie.");
			setIsSubmitting(false);
		}
	};

	const getStatusLabel = (status) => {
		const statusMap = {
			accepted: "Przyjęta",
			pending: "Oczekuje",
			rejected: "Odrzucona",
			withdrawn: "Wycofana",
		};
		return statusMap[status] || status;
	};

	const getStatusClass = (status) => {
		const classMap = {
			accepted: "status-accepted",
			pending: "status-pending",
			rejected: "status-rejected",
			withdrawn: "status-withdrawn",
		};
		return classMap[status] || "";
	};

	if (loading) {
		return <div>Ładowanie poprawek...</div>;
	}

	if (!resolution) {
		return <div>Nie znaleziono uchwały #{slug}</div>;
	}

	return (
		<>
			<div className="amendments-page">
				<div className="uchwaly-bar">
					<Link to={`/${slug}`} className="uchwaly-title">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="50"
							height="50"
							fill="currentColor"
							className="bi bi-arrow-left"
							viewBox="0 0 16 16"
						>
							<path
								fillRule="evenodd"
								d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
							/>
						</svg>
						WRÓĆ
					</Link>

					<div className="session-info">
						Posiedzenie: {session?.city}
						<br />
						<span>{session?.date}</span>
					</div>
				</div>

				<div className="amendments-container">
					<h1 className="page-title">
						Poprawki do uchwały
						<br />
						<blockquote>„{resolution.title}”</blockquote>
					</h1>

					<div className="addAmendment">
						<Link to={`/${slug}/dodaj-poprawke`} className="AddBtn">
							Dodaj poprawkę
						</Link>
					</div>

					<div className="amendments-list">
						{amendments.length > 0 ? (
							amendments.map((amendment) => {
								const isWithdrawn = isAmendmentWithdrawn(amendment);
								const isAuthor = isCurrentUserAuthor(amendment);
								const canWithdraw = isAuthor && !isWithdrawn;

								return (
									<div
										key={amendment.id}
										className={`amendment-card ${isWithdrawn ? "withdrawn" : ""}`}
									>
										<div className="amendment-main">
											<div className="amendment-title">
												Poprawka nr {amendment.id}
												{isWithdrawn && (
													<span className="withdrawn-badge">WYCOFANA</span>
												)}
											</div>

											<div className="amendment-author">
												Autor: {amendment.author}
											</div>

											{isWithdrawn && amendment.withdrawnReason && (
												<div className="withdrawn-reason">
													Powód wycofania: {amendment.withdrawnReason}
												</div>
											)}
										</div>

										<div className="amendment-status">
											<div
												className={`status-badge ${getStatusClass(amendment.status)}`}
											>
												{getStatusLabel(amendment.status)}
											</div>

											{!isWithdrawn ? (
												<>
													<Link
														to={`/${slug}/poprawka/${amendment.id}`}
														className="read-more"
													>
														Wyświetl szczegóły
													</Link>

													{canWithdraw && (
														<button
															onClick={() => openWithdrawModal(amendment.id)}
															className="withdraw-btn"
														>
															Wycofaj poprawkę
														</button>
													)}
												</>
											) : (
												<span
													className="read-more-disabled"
													title="Ta poprawka została wycofana"
												>
													Szczegóły niedostępne
												</span>
											)}
										</div>
									</div>
								);
							})
						) : (
							<p>Nie ma jeszcze żadnych poprawek do tej uchwały.</p>
						)}
					</div>
				</div>
			</div>

			{/* Modal wycofania poprawki */}
			{showWithdrawModal && (
				<div className="amendment-modal-overlay" onClick={closeWithdrawModal}>
					<div
						className="amendment-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="amendment-modal-title">Wycofanie poprawki</h2>

						<div className="amendment-modal-warning">
							<strong>⚠️ UWAGA!</strong>
							<p>
								Poprawka nie zniknie z listy poprawek. Wycofanie jej spowoduje,
								że nie będzie można wejść w jej szczegóły, natomiast informacja
								o tym, że została wycofana oraz ewentualny powód będą pokazane.
							</p>
						</div>

						<div className="amendment-modal-field">
							<label htmlFor="withdrawReason" className="amendment-modal-label">
								Powód wycofania{" "}
								<span className="amendment-modal-optional">(opcjonalnie)</span>
							</label>
							<textarea
								id="withdrawReason"
								className="amendment-modal-textarea"
								value={withdrawReason}
								onChange={(e) => setWithdrawReason(e.target.value)}
								placeholder="Podaj powód wycofania (opcjonalnie)..."
								rows="3"
								disabled={isSubmitting}
							/>
						</div>

						<div className="amendment-modal-actions">
							<button
								className="amendment-modal-btn-cancel"
								onClick={closeWithdrawModal}
								disabled={isSubmitting}
							>
								Anuluj
							</button>
							<button
								className="amendment-modal-btn-confirm"
								onClick={handleWithdrawConfirm}
								disabled={isSubmitting}
							>
								{isSubmitting ? "Wycofywanie..." : "Potwierdź wycofanie"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
