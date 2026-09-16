import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styles from "./ResolutionDetails.module.css";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

export default function ResolutionDetails() {
	const { slug } = useParams();
	const navigate = useNavigate();

	const [resolution, setResolution] = useState(null);
	const [signedUsers, setSignedUsers] = useState([]);
	const [session, setSession] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [showConfirm, setShowConfirm] = useState(false);
	const [actionType, setActionType] = useState(null);
	const [showSignatures, setShowSignatures] = useState(false);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		window.scrollTo({
			top: 0,
			behavior: "instant",
		});
	}, []);

	useEffect(() => {
		fetchResolution();
	}, [slug]);

	const fetchResolution = async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			const res = await fetch(`/newapp/api/resolutions/${slug}`);

			if (!res.ok) {
				throw new Error("Nie znaleziono uchwały");
			}

			const data = await res.json();
			setResolution(data.resolution);
			setSignedUsers(data.signedUsers);
			setSession(data.session);
			setCurrentUser(data.currentUser);
		} catch (error) {
			setErrorMessage(error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleSignatureAction = async () => {
		const endpoint =
			actionType === "sign"
				? `/newapp/api/resolutions/${resolution.id}/sign`
				: `/newapp/api/resolutions/${resolution.id}/sign`;

		const method = actionType === "sign" ? "POST" : "DELETE";

		try {
			const res = await fetch(endpoint, { method });

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || "Wystąpił błąd");
			}

			setShowConfirm(false);
			setErrorMessage(null);

			await fetchResolution();
		} catch (error) {
			setErrorMessage(error.message);
		}
	};

	const handleDeleteResolution = async () => {
		try {
			const res = await fetch(`/newapp/api/resolutions/${resolution.id}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || "Wystąpił błąd podczas usuwania");
			}

			setShowDeleteConfirm(false);
			navigate("/uchwaly");
		} catch (error) {
			setErrorMessage(error.message);
		}
	};

	const getUserRole = (user) => {
		if (!user) return "member";

		if (user.role_id === 1) return "admin";
		if (user.role_id === 2 || user.role_id === 3) return "coordinator";
		if (user.role_id === 4) return "member";

		const role = user.role?.toLowerCase();
		if (role === "admin" || role === "zarząd") return "admin";
		if (role === "coordinator" || role === "koordynator") return "coordinator";

		return "member";
	};

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={`${styles.skeleton} ${styles.skeletonBody}`} />
			</div>
		);
	}

	if (!resolution) {
		return (
			<div className={styles.page}>
				<Link to="/uchwaly" className={styles.back}>
					← Wróć do uchwał
				</Link>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono uchwały</p>
					<p className={styles.emptyText}>
						{errorMessage ||
							"Uchwała mogła zostać usunięta lub zmienił się link."}
					</p>
				</div>
			</div>
		);
	}

	const userRole = getUserRole(currentUser);
	const isAdminOrCoordinator =
		userRole === "admin" || userRole === "coordinator";

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<Link to="/uchwaly" className={styles.back}>
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
					Wróć do uchwał
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
					<span className={styles.eyebrow}>Uchwała</span>
					<h1 className={styles.title}>{resolution.title}</h1>

					<p className={styles.author}>
						Autor: <strong>{resolution.author}</strong>
						{resolution.party && (
							<span className={styles.authorParty}> ({resolution.party})</span>
						)}
					</p>
				</div>

				<div className={styles.grid}>
					<section className={styles.card}>
						<h2 className={styles.cardTitle}>Załącznik</h2>

						{resolution.filePath ? (
							<a
								href={resolution.filePath}
								className={styles.file}
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								{resolution.fileName || "Pobierz plik"}
							</a>
						) : resolution.fileName ? (
							<a
								href={`/uploads/resolutions/${resolution.fileName}`}
								className={styles.file}
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								{resolution.fileName}
							</a>
						) : (
							<span className={`${styles.file} ${styles.fileDisabled}`}>
								Brak załącznika
							</span>
						)}
					</section>

					<section className={styles.card}>
						<h2 className={styles.cardTitle}>Podpisy</h2>

						<div className={styles.signatures}>
							<div className={styles.signaturesCount}>
								<span className={styles.signaturesNumber}>
									{resolution.signatures}
								</span>
								<span className={styles.signaturesLabel}>
									{resolution.signatures === 1 ? "podpis" : "podpisów"}
								</span>
							</div>

							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost}`}
								onClick={() => setShowSignatures(true)}
							>
								Sprawdź kto podpisał
							</button>
						</div>
					</section>
				</div>

				<section className={styles.actions}>
					{currentUser?.isAuthor ? (
						<button
							type="button"
							className={`${styles.btn} ${styles.btnMuted} ${styles.btnBlock}`}
							disabled
						>
							Autor — podpis automatyczny
						</button>
					) : (
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
							onClick={() => {
								setActionType(currentUser?.hasSigned ? "remove" : "sign");
								setShowConfirm(true);
							}}
						>
							{currentUser?.hasSigned ? "Usuń podpis" : "Podpisz uchwałę"}
						</button>
					)}

					<Link
						to={`/${resolution.slug}/poprawki`}
						className={`${styles.btn} ${styles.btnOutline} ${styles.btnBlock}`}
					>
						Wyświetl poprawki
					</Link>

					{isAdminOrCoordinator && (
						<button
							type="button"
							className={`${styles.btn} ${styles.btnDanger} ${styles.btnBlock}`}
							onClick={() => setShowDeleteConfirm(true)}
						>
							<Trash2 size={16} />
							Usuń uchwałę
						</button>
					)}
				</section>
			</main>

			{showSignatures &&
				createPortal(
					<>
						<div
							className={styles.overlay}
							onClick={() => setShowSignatures(false)}
						/>
						<aside className={styles.panel}>
							<div className={styles.panelHead}>
								<h2 className={styles.panelTitle}>Kto podpisał?</h2>
								<button
									type="button"
									className={styles.panelClose}
									onClick={() => setShowSignatures(false)}
									aria-label="Zamknij"
								>
									✕
								</button>
							</div>

							<p className={styles.panelTotal}>
								Liczba podpisów: <strong>{signedUsers.length}</strong>
							</p>

							<ul className={styles.panelList}>
								{signedUsers.map((user, index) => (
									<li className={styles.signature} key={index}>
										<div className={styles.signatureAvatar}>
											{user.name.charAt(0).toUpperCase()}
										</div>
										<div className={styles.signatureInfo}>
											<strong>{user.name}</strong>
											<span className={styles.signatureClub}>{user.club}</span>
											<time className={styles.signatureTime}>
												{new Date(user.timestamp).toLocaleString("pl-PL")}
											</time>
										</div>
									</li>
								))}
							</ul>
						</aside>
					</>,
					document.body,
				)}

			{showConfirm &&
				createPortal(
					<div className={styles.modalOverlay}>
						<div className={styles.modal}>
							<h2 className={styles.modalTitle}>
								{actionType === "sign" ? "Podpisać uchwałę?" : "Usunąć podpis?"}
							</h2>

							{errorMessage && (
								<p className={styles.modalError}>{errorMessage}</p>
							)}

							<p className={styles.modalText}>
								{actionType === "sign"
									? "Czy na pewno chcesz podpisać tę uchwałę?"
									: "Czy na pewno chcesz usunąć swój podpis?"}
							</p>

							<div className={styles.modalActions}>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnPrimary}`}
									onClick={handleSignatureAction}
								>
									Potwierdź
								</button>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={() => setShowConfirm(false)}
								>
									Anuluj
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{showDeleteConfirm &&
				createPortal(
					<div className={styles.modalOverlay}>
						<div className={`${styles.modal} ${styles.modalDanger}`}>
							<h2 className={styles.modalTitle}>Usunąć uchwałę?</h2>

							{errorMessage && (
								<p className={styles.modalError}>{errorMessage}</p>
							)}

							<p className={styles.modalText}>
								Czy na pewno chcesz usunąć uchwałę{" "}
								<strong>„{resolution.title}”</strong>?
							</p>

							<p className={styles.modalWarning}>
								Tej operacji nie można cofnąć.
							</p>

							<div className={styles.modalActions}>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnDanger}`}
									onClick={handleDeleteResolution}
								>
									Tak, usuń
								</button>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnGhost}`}
									onClick={() => setShowDeleteConfirm(false)}
								>
									Anuluj
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
