import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styles from "./ResolutionDetails.module.css";
import { createPortal } from "react-dom";
import { Trash2, Pencil, Save, X } from "lucide-react";

function parseLineBack(raw) {
	const match = raw.match(
		/^(\s*)(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)]|–)\s+(.*)$/i,
	);
	if (match) {
		const indent = match[1].replace(/\t/g, "  ").length;
		const level = Math.floor(indent / 2) + 1;
		return {
			marker: match[2],
			text: match[3],
			level,
			type: "list-item",
		};
	}
	return {
		marker: null,
		text: raw,
		level: 1,
		type: "paragraph",
	};
}

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

	// --- EDYCJA ---
	const [isEditing, setIsEditing] = useState(false);
	const [editedData, setEditedData] = useState(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);

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
		const endpoint = `/newapp/api/resolutions/${resolution.id}/sign`;
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

	// --- EDYCJA: helpers ---
	const startEditing = () => {
		const clone = JSON.parse(JSON.stringify(resolution));
		// upewniamy się, że chapters istnieje i każdy artykuł ma contentLines
		clone.chapters = (clone.chapters || []).map((ch, chIdx) => ({
			id: ch.id ?? `ch-${chIdx}-${Date.now()}`,
			title: ch.title || "",
			subtitle: ch.subtitle || "",
			articles: (ch.articles || []).map((art, artIdx) => ({
				id: art.id ?? `art-${chIdx}-${artIdx}-${Date.now()}`,
				number: art.number || `Art. ${artIdx + 1}`,
				content: art.content || "",
				contentLines:
					art.contentLines && art.contentLines.length > 0
						? art.contentLines.map((l) =>
								typeof l === "string"
									? { marker: null, text: l, level: 1, type: "paragraph" }
									: { ...l },
							)
						: [
								{
									marker: null,
									text: art.content || "",
									level: 1,
									type: "paragraph",
								},
							],
			})),
		}));
		setEditedData(clone);
		setSaveError(null);
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setIsEditing(false);
		setEditedData(null);
		setSaveError(null);
	};

	const updateField = (path, value) => {
		setEditedData((prev) => {
			const newData = structuredClone(prev);
			let target = newData;
			for (let i = 0; i < path.length - 1; i++) {
				target = target[path[i]];
			}
			target[path[path.length - 1]] = value;
			return newData;
		});
	};

	const addChapter = () => {
		setEditedData((prev) => {
			const newData = structuredClone(prev);
			newData.chapters.push({
				id: `ch-${Date.now()}`,
				title: "Rozdział nowy",
				subtitle: "",
				articles: [],
			});
			return newData;
		});
	};

	const removeChapter = (chIndex) => {
		setEditedData((prev) => {
			const newData = structuredClone(prev);
			newData.chapters.splice(chIndex, 1);
			return newData;
		});
	};

	const addArticle = (chIndex) => {
		setEditedData((prev) => {
			const newData = structuredClone(prev);
			newData.chapters[chIndex].articles.push({
				id: `art-${Date.now()}`,
				number: `Art. ${newData.chapters[chIndex].articles.length + 1}`,
				content: "",
				contentLines: [{ marker: null, text: "", level: 1, type: "paragraph" }],
			});
			return newData;
		});
	};

	const removeArticle = (chIndex, artIndex) => {
		setEditedData((prev) => {
			const newData = structuredClone(prev);
			newData.chapters[chIndex].articles.splice(artIndex, 1);
			return newData;
		});
	};

	const handleSaveResolution = async () => {
		if (!editedData) return;
		setSaving(true);
		setSaveError(null);

		try {
			const res = await fetch(`/newapp/api/resolutions/${resolution.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: editedData.title,
					preamble: editedData.preamble,
					chapters: editedData.chapters,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "Nie udało się zapisać zmian");
			}

			setIsEditing(false);
			setEditedData(null);
			await fetchResolution();
		} catch (error) {
			setSaveError(error.message);
		} finally {
			setSaving(false);
		}
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

					{isEditing ? (
						<textarea
							className={styles.title}
							value={editedData.title}
							onChange={(e) => updateField(["title"], e.target.value)}
							rows={3}
						/>
					) : (
						<h1 className={styles.title}>{resolution.title}</h1>
					)}

					<p className={styles.author}>
						Autor: <strong>{resolution.author}</strong>
						{resolution.party && (
							<span className={styles.authorParty}> ({resolution.party})</span>
						)}
					</p>

					{isEditing ? (
						<div className={styles.preamble}>
							<textarea
								className={styles.textarea}
								value={editedData.preamble || ""}
								onChange={(e) => updateField(["preamble"], e.target.value)}
								placeholder="Preambuła..."
								rows={6}
							/>
						</div>
					) : (
						resolution.preamble && (
							<div className={styles.preamble}>
								<p>{resolution.preamble}</p>
							</div>
						)
					)}
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

				{/* TREŚĆ / EDYTOR */}
				<section className={styles.content}>
					<div className={styles.contentHead}>
						<h2 className={styles.contentTitle}>Treść uchwały</h2>
						{isEditing && (
							<button
								type="button"
								onClick={addChapter}
								className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
							>
								+ Dodaj rozdział
							</button>
						)}
					</div>

					{isEditing ? (
						<div className={styles.chapters}>
							{editedData.chapters.map((chapter, chIndex) => (
								<article key={chapter.id} className={styles.chapter}>
									<header className={styles.chapterHead}>
										<div className={styles.chapterTitles}>
											<input
												type="text"
												className={styles.chapterTitle}
												value={chapter.title}
												onChange={(e) =>
													updateField(
														["chapters", chIndex, "title"],
														e.target.value,
													)
												}
												placeholder="Numer rozdziału"
											/>
											<input
												type="text"
												className={styles.chapterSubtitle}
												value={chapter.subtitle || ""}
												onChange={(e) =>
													updateField(
														["chapters", chIndex, "subtitle"],
														e.target.value,
													)
												}
												placeholder="Tytuł rozdziału"
											/>
										</div>
										<button
											type="button"
											onClick={() => removeChapter(chIndex)}
											className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
										>
											Usuń rozdział
										</button>
									</header>

									<div className={styles.articles}>
										{chapter.articles.map((article, artIndex) => (
											<div key={article.id} className={styles.article}>
												<div className={styles.articleHead}>
													<input
														type="text"
														className={styles.articleNumber}
														value={article.number}
														onChange={(e) =>
															updateField(
																[
																	"chapters",
																	chIndex,
																	"articles",
																	artIndex,
																	"number",
																],
																e.target.value,
															)
														}
													/>
													<button
														type="button"
														onClick={() => removeArticle(chIndex, artIndex)}
														className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
													>
														Usuń
													</button>
												</div>

												<div className={styles.articleLines}>
													{article.contentLines.map((line, lineIndex) => {
														const indent = "  ".repeat((line.level || 1) - 1);
														const displayValue = line.marker
															? `${indent}${line.marker} ${line.text}`
															: `${indent}${line.text || ""}`;

														return (
															<div
																key={lineIndex}
																className={styles.articleLine}
																data-level={line.level || 1}
															>
																<textarea
																	className={styles.textarea}
																	value={displayValue}
																	onChange={(e) => {
																		const raw = e.target.value;
																		const parsedLine = parseLineBack(raw);
																		const newLines = structuredClone(
																			article.contentLines,
																		);
																		newLines[lineIndex] = parsedLine;

																		updateField(
																			[
																				"chapters",
																				chIndex,
																				"articles",
																				artIndex,
																				"contentLines",
																			],
																			newLines,
																		);
																		updateField(
																			[
																				"chapters",
																				chIndex,
																				"articles",
																				artIndex,
																				"content",
																			],
																			newLines
																				.map((l) =>
																					l.marker
																						? `${l.marker} ${l.text}`
																						: l.text,
																				)
																				.join("\n"),
																		);
																	}}
																	placeholder={`Punkt ${lineIndex + 1}...`}
																	rows={Math.max(
																		2,
																		Math.ceil(displayValue.length / 80),
																	)}
																/>
																<button
																	type="button"
																	onClick={() => {
																		const newLines = structuredClone(
																			article.contentLines,
																		);
																		newLines.splice(lineIndex, 1);
																		if (newLines.length === 0) {
																			newLines.push({
																				marker: null,
																				text: "",
																				level: 1,
																				type: "paragraph",
																			});
																		}
																		updateField(
																			[
																				"chapters",
																				chIndex,
																				"articles",
																				artIndex,
																				"contentLines",
																			],
																			newLines,
																		);
																		updateField(
																			[
																				"chapters",
																				chIndex,
																				"articles",
																				artIndex,
																				"content",
																			],
																			newLines
																				.map((l) =>
																					l.marker
																						? `${l.marker} ${l.text}`
																						: l.text,
																				)
																				.join("\n"),
																		);
																	}}
																	className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
																	title="Usuń linię"
																>
																	×
																</button>
															</div>
														);
													})}

													<button
														type="button"
														onClick={() => {
															const newLines = structuredClone(
																article.contentLines,
															);
															newLines.push({
																marker: null,
																text: "",
																level: 1,
																type: "paragraph",
															});
															updateField(
																[
																	"chapters",
																	chIndex,
																	"articles",
																	artIndex,
																	"contentLines",
																],
																newLines,
															);
															updateField(
																[
																	"chapters",
																	chIndex,
																	"articles",
																	artIndex,
																	"content",
																],
																newLines
																	.map((l) =>
																		l.marker ? `${l.marker} ${l.text}` : l.text,
																	)
																	.join("\n"),
															);
														}}
														className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
													>
														+ Dodaj linię
													</button>
												</div>
											</div>
										))}

										<button
											type="button"
											onClick={() => addArticle(chIndex)}
											className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
										>
											+ Dodaj artykuł
										</button>
									</div>
								</article>
							))}
						</div>
					) : (
						resolution.chapters &&
						resolution.chapters.length > 0 && (
							<>
								{resolution.chapters.map((chapter, chIndex) => (
									<article
										key={chapter.id || chIndex}
										className={styles.chapter}
									>
										<header className={styles.chapterHead}>
											<h3 className={styles.chapterTitle}>{chapter.title}</h3>
											{chapter.subtitle && (
												<p className={styles.chapterSubtitle}>
													{chapter.subtitle}
												</p>
											)}
										</header>

										{(chapter.articles || []).map((article, artIndex) => (
											<div
												key={article.id || artIndex}
												className={styles.article}
											>
												<h4 className={styles.articleNumber}>
													{article.number}
												</h4>

												<div className={styles.articleContent}>
													{(article.contentLines || []).length > 0 ? (
														(article.contentLines || []).map(
															(line, lineIndex) => {
																if (typeof line === "string") {
																	return (
																		<p
																			key={lineIndex}
																			className={styles.articleLine}
																			data-level={1}
																		>
																			{line}
																		</p>
																	);
																}

																const level = line.level || 1;
																const marker = line.marker;
																const text = line.text || "";

																return (
																	<p
																		key={lineIndex}
																		className={styles.articleLine}
																		data-level={level}
																	>
																		{marker && (
																			<span className={styles.lineMarker}>
																				{marker}
																			</span>
																		)}{" "}
																		{text}
																	</p>
																);
															},
														)
													) : (
														<p className={styles.articleLine}>
															{article.content}
														</p>
													)}
												</div>
											</div>
										))}
									</article>
								))}
							</>
						)
					)}
				</section>

				{/* AKCJE */}
				<section className={styles.actions}>
					{isEditing ? (
						<>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
								onClick={handleSaveResolution}
								disabled={saving}
							>
								<Save size={16} />
								{saving ? "Zapisywanie..." : "Zapisz zmiany"}
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`}
								onClick={cancelEditing}
								disabled={saving}
							>
								<X size={16} />
								Anuluj edycję
							</button>

							{saveError && <p className={styles.modalError}>{saveError}</p>}
						</>
					) : (
						<>
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
									className={`${styles.btn} ${styles.btnOutline} ${styles.btnBlock}`}
									onClick={startEditing}
								>
									<Pencil size={16} />
									Edytuj uchwałę
								</button>
							)}

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
						</>
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
