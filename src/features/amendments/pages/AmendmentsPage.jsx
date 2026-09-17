import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./AmendmentsPage.module.css";

export default function AmendmentsPage() {
	const { slug } = useParams();

	const [resolution, setResolution] = useState(null);
	const [amendments, setAmendments] = useState([]);
	const [session, setSession] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [canAddAmendment, setCanAddAmendment] = useState(true);
	const [showWithdrawModal, setShowWithdrawModal] = useState(false);
	const [selectedAmendmentId, setSelectedAmendmentId] = useState(null);
	const [withdrawReason, setWithdrawReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				try {
					const tokenData = localStorage.getItem("token");
					let token = null;
					try {
						const parsed = JSON.parse(tokenData);
						token = parsed?.token;
					} catch {
						token = tokenData;
					}

					const userResponse = await fetch("/newapp/api/auth/me", {
						headers: token ? { Authorization: `Bearer ${token}` } : {},
					});
					if (userResponse.ok) {
						const userData = await userResponse.json();
						setCurrentUser(userData.user);
					}
				} catch (error) {
					console.error("Błąd pobierania użytkownika:", error);
				}

				const response = await fetch(
					`/newapp/api/resolutions/${slug}/amendments`,
				);

				if (!response.ok) {
					throw new Error("Nie znaleziono uchwały");
				}

				const data = await response.json();
				setResolution(data.resolution);
				setAmendments(data.amendments);
				setSession(data.session);
				setCanAddAmendment(data.session?.isActive === true);
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

	const openWithdrawModal = (amendmentId) => {
		setSelectedAmendmentId(amendmentId);
		setWithdrawReason("");
		setShowWithdrawModal(true);
	};

	const closeWithdrawModal = () => {
		setShowWithdrawModal(false);
		setSelectedAmendmentId(null);
		setWithdrawReason("");
		setIsSubmitting(false);
	};

	const handleWithdrawConfirm = async () => {
		if (!selectedAmendmentId) return;

		setIsSubmitting(true);

		try {
			const response = await fetch(
				`/newapp/api/amendments/${selectedAmendmentId}/withdraw`,
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

			const updatedResponse = await fetch(
				`/newapp/api/resolutions/${slug}/amendments`,
			);
			const data = await updatedResponse.json();
			setAmendments(data.amendments);

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
			accepted: styles.statusAccepted,
			pending: styles.statusPending,
			rejected: styles.statusRejected,
			withdrawn: styles.statusWithdrawn,
		};
		return classMap[status] || "";
	};

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={`${styles.skeleton} ${styles.skeletonRow}`} />
				<div className={`${styles.skeleton} ${styles.skeletonRow}`} />
				<div className={`${styles.skeleton} ${styles.skeletonRow}`} />
			</div>
		);
	}

	if (!resolution) {
		return (
			<div className={styles.page}>
				<Link to={`/${slug}`} className={styles.back}>
					← Wróć do uchwały
				</Link>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono uchwały</p>
					<p className={styles.emptyText}>
						Uchwała #{slug} mogła zostać usunięta lub zmienił się link.
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className={styles.page}>
				<header className={styles.topbar}>
					<Link to={`/${slug}`} className={styles.back}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M19 12H5M11 6l-6 6 6 6"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Wróć do uchwały
					</Link>

					{session && (
						<div className={styles.session}>
							<span className={styles.sessionLabel}>Posiedzenie</span>
							<span className={styles.sessionCity}>{session.city}</span>
							<span className={styles.sessionDate}>{session.date}</span>
						</div>
					)}
				</header>

				<main className={styles.main}>
					<div className={styles.head}>
						<span className={styles.eyebrow}>Poprawki</span>
						<h1 className={styles.title}>Poprawki do uchwały</h1>
						<p className={styles.subtitle}>„{resolution.title}”</p>
					</div>

					<div className={styles.headActions}>
						{canAddAmendment ? (
							<Link
								to={`/${slug}/dodaj-poprawke`}
								className={`${styles.btn} ${styles.btnPrimary}`}
							>
								Dodaj poprawkę
							</Link>
						) : (
							<span
								className={styles.disabledHint}
								title="Dodawanie poprawek jest obecnie zablokowane"
							>
								Dodawanie poprawek zablokowane
							</span>
						)}

						<span className={styles.count}>
							{amendments.length}{" "}
							{amendments.length === 1 ? "poprawka" : "poprawek"}
						</span>
					</div>

					{amendments.length > 0 ? (
						<ul className={styles.list}>
							{amendments.map((amendment) => {
								const isWithdrawn = isAmendmentWithdrawn(amendment);
								const isAuthor = isCurrentUserAuthor(amendment);
								const canWithdraw = isAuthor && !isWithdrawn;

								return (
									<li
										key={amendment.id}
										className={`${styles.item} ${
											isWithdrawn ? styles.itemWithdrawn : ""
										}`}
									>
										<div className={styles.itemMain}>
											<div className={styles.itemHead}>
												<span className={styles.itemNumber}>
													Poprawka nr {amendment.id}
												</span>

												<span
													className={`${styles.statusBadge} ${getStatusClass(
														amendment.status,
													)}`}
												>
													{getStatusLabel(amendment.status)}
												</span>
											</div>

											<p className={styles.itemAuthor}>
												Autor: <strong>{amendment.author}</strong>
											</p>

											{isWithdrawn && amendment.withdrawnReason && (
												<p className={styles.itemReason}>
													Powód wycofania: {amendment.withdrawnReason}
												</p>
											)}
										</div>

										<div className={styles.itemActions}>
											{!isWithdrawn ? (
												<>
													<Link
														to={`/${slug}/poprawka/${amendment.id}`}
														className={`${styles.btn} ${styles.btnOutline}`}
													>
														Wyświetl szczegóły
													</Link>

													{canWithdraw && (
														<button
															type="button"
															onClick={() => openWithdrawModal(amendment.id)}
															className={`${styles.btn} ${styles.btnDanger}`}
														>
															Wycofaj poprawkę
														</button>
													)}
												</>
											) : (
												<span
													className={styles.disabledHint}
													title="Ta poprawka została wycofana"
												>
													Szczegóły niedostępne
												</span>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<div className={styles.empty}>
							<p className={styles.emptyTitle}>Brak poprawek</p>
							<p className={styles.emptyText}>
								Nie ma jeszcze żadnych poprawek do tej uchwały.
							</p>
						</div>
					)}
				</main>
			</div>

			{showWithdrawModal && (
				<div className={styles.modalOverlay} onClick={closeWithdrawModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<h2 className={styles.modalTitle}>Wycofanie poprawki</h2>

						<div className={styles.modalWarning}>
							<strong>UWAGA!</strong>
							<p>
								Poprawka nie zniknie z listy poprawek. Wycofanie jej spowoduje,
								że nie będzie można wejść w jej szczegóły, natomiast informacja
								o tym, że została wycofana oraz ewentualny powód będą pokazane.
							</p>
						</div>

						<div className={styles.modalField}>
							<label htmlFor="withdrawReason" className={styles.modalLabel}>
								Powód wycofania{" "}
								<span className={styles.modalOptional}>(opcjonalnie)</span>
							</label>
							<textarea
								id="withdrawReason"
								className={styles.modalTextarea}
								value={withdrawReason}
								onChange={(e) => setWithdrawReason(e.target.value)}
								placeholder="Podaj powód wycofania (opcjonalnie)..."
								rows="3"
								disabled={isSubmitting}
							/>
						</div>

						<div className={styles.modalActions}>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost}`}
								onClick={closeWithdrawModal}
								disabled={isSubmitting}
							>
								Anuluj
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary}`}
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
