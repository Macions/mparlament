import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./ResolutionDetails.css";
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
		return <h2>Ładowanie uchwały...</h2>;
	}

	if (!resolution) {
		return <h2>Nie znaleziono uchwały</h2>;
	}

	const userRole = getUserRole(currentUser);
	const isAdminOrCoordinator =
		userRole === "admin" || userRole === "coordinator";

	return (
		<div className="mparlament-page">
			<div className="uchwaly-bar">
				<Link className="uchwaly-title" to="/uchwaly">
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

			<main className="resolution-card">
				<h1 className="resolution-title">{resolution.title}</h1>

				<div className="resolution-grid">
					<div className="resolution-left">
						<div className="file-box">
							{resolution.filePath ? (
								<a
									href={resolution.filePath}
									className="file-link"
									target="_blank"
									rel="noopener noreferrer"
								>
									{resolution.fileName || "Pobierz plik"}
								</a>
							) : resolution.fileName ? (
								<a
									href={`/uploads/resolutions/${resolution.fileName}`}
									className="file-link"
									target="_blank"
									rel="noopener noreferrer"
								>
									{resolution.fileName}
								</a>
							) : (
								<span className="file-link disabled">Brak załącznika</span>
							)}
						</div>

						<div className="signatures-row">
							<div className="signatures-count">
								<div>Podpisy: {resolution.signatures}</div>

								<button
									className="btn btn-pill btn-cyan btn-small check-signatures-btn"
									onClick={() => setShowSignatures(true)}
								>
									Sprawdź kto podpisał
								</button>
							</div>
						</div>
					</div>

					<div className="resolution-right">
						<p className="resolution-author">
							Autor: <strong>{resolution.author}</strong> ({resolution.party})
						</p>

						{currentUser?.isAuthor ? (
							<button className="btn btn-pill btn-gray btn-wide" disabled>
								AUTOR - PODPIS AUTOMATYCZNY
							</button>
						) : (
							<button
								className="btn btn-pill btn-cyan btn-wide sign-btn"
								onClick={() => {
									setActionType(currentUser?.hasSigned ? "remove" : "sign");
									setShowConfirm(true);
								}}
							>
								{currentUser?.hasSigned ? "USUŃ PODPIS" : "PODPISZ UCHWAŁĘ"}
							</button>
						)}

						<Link
							to={`/${resolution.slug}/poprawki`}
							className="btn btn-pill btn-red btn-wide amend-btn"
						>
							WYŚWIETL POPRAWKI
						</Link>

						{isAdminOrCoordinator && (
							<button
								className="btn btn-pill btn-red btn-wide delete-btn"
								onClick={() => setShowDeleteConfirm(true)}
								style={{ marginTop: "10px" }}
							>
								<Trash2
									size={18}
									style={{ marginRight: "8px", verticalAlign: "middle" }}
								/>
								USUŃ UCHWAŁĘ
							</button>
						)}
					</div>
				</div>
			</main>

			{showSignatures &&
				createPortal(
					<>
						<div
							className="signatures-overlay"
							onClick={() => setShowSignatures(false)}
						/>
						<div className="signatures-panel">
							<div className="signatures-header">
								<h2>Kto podpisał?</h2>
								<button
									className="close-panel"
									onClick={() => setShowSignatures(false)}
								>
									✕
								</button>
							</div>
							<div className="signatures-total">
								Liczba podpisów: <strong>{signedUsers.length}</strong>
							</div>
							<div className="signatures-list">
								{signedUsers.map((user, index) => (
									<div className="signature-item" key={index}>
										<div
											className="signature-avatar"
											style={{
												background: `hsl(${(index * 45) % 360}, 70%, 90%)`,
											}}
										>
											{user.name.charAt(0).toUpperCase()}
										</div>
										<div className="signature-info">
											<strong>{user.name}</strong>
											<p>{user.club}</p>
											<span>
												{new Date(user.timestamp).toLocaleString("pl-PL")}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</>,
					document.body,
				)}

			{showConfirm &&
				createPortal(
					<div className="modal-overlay">
						<div className="modal">
							<h2>
								{actionType === "sign" ? "Podpisać uchwałę?" : "Usunąć podpis?"}
							</h2>
							{errorMessage && <p className="modal-error">{errorMessage}</p>}
							<p>
								{actionType === "sign"
									? "Czy na pewno chcesz podpisać tę uchwałę?"
									: "Czy na pewno chcesz usunąć swój podpis?"}
							</p>
							<button onClick={handleSignatureAction}>Potwierdź</button>
							<button onClick={() => setShowConfirm(false)}>Anuluj</button>
						</div>
					</div>,
					document.body,
				)}

			{showDeleteConfirm &&
				createPortal(
					<div className="modal-overlay">
						<div className="modal modal-danger">
							<h2>Usunąć uchwałę?</h2>
							{errorMessage && <p className="modal-error">{errorMessage}</p>}
							<p>
								Czy na pewno chcesz usunąć uchwałę{" "}
								<strong>"{resolution.title}"</strong>?
								<br />
								<span style={{ color: "red", fontSize: "0.9rem" }}>
									Tej operacji nie można cofnąć!
								</span>
							</p>
							<div className="modal-buttons">
								<button
									className="btn btn-danger"
									onClick={handleDeleteResolution}
								>
									Tak, usuń
								</button>
								<button
									className="btn btn-gray"
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
