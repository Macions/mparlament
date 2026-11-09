import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styles from "./ResolutionDetails.module.css";
import { createPortal } from "react-dom";
import { Trash2, Pencil, Save, X } from "lucide-react";

const STATUS_LABEL = {
	pending: "Oczekuje",
	accepted: "Przyjęta",
	rejected: "Odrzucona",
};

const STATUS_TONE = {
	pending: "warn",
	accepted: "ok",
	rejected: "bad",
};

function StatusPill({ status }) {
	const tone = STATUS_TONE[status] ?? "neutral";
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

function parseLineBack(raw) {
	const match = raw.match(
		/^(\s*)(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)]|–)\s+(.*)$/i,
	);
	if (match) {
		const indent = match[1].replace(/\t/g, "  ").length;
		const level = Math.floor(indent / 2) + 1;
		return { marker: match[2], text: match[3], level, type: "list-item" };
	}
	return { marker: null, text: raw, level: 1, type: "paragraph" };
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

	const [isEditing, setIsEditing] = useState(false);
	const [editedData, setEditedData] = useState(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "instant" });
	}, []);

	useEffect(() => {
		fetchResolution();
	}, [slug]);

	const fetchResolution = async () => {
		setLoading(true);
		setErrorMessage(null);
		try {
			const res = await fetch(`/newapp/api/resolutions/${slug}`);
			if (!res.ok) throw new Error("Nie znaleziono uchwały");
			const data = await res.json();
			setResolution(data.resolution);
			setSignedUsers(data.signedUsers ?? []);
			setSession(data.session);

			try {
				const tokenData = localStorage.getItem("token");
				let token = null;
				try {
					const parsed = JSON.parse(tokenData);
					token = parsed?.token;
				} catch {
					token = tokenData;
				}
				const meRes = await fetch("/newapp/api/auth/me", {
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
				if (meRes.ok) {
					const me = await meRes.json();
					setCurrentUser({
						...me,
						hasSigned:
							data.signedUsers?.some((u) => u.name === me.name) ?? false,
						isAuthor: data.resolution?.authorId === me.id,
					});
				} else {
					setCurrentUser(null);
				}
			} catch (err) {
				console.error("Nie udało się pobrać currentUser:", err);
				setCurrentUser(null);
			}
		} catch (error) {
			setErrorMessage(error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleSignatureAction = async () => {
		const endpoint = `/newapp/api/resolutions/${resolution.id}/sign`;
		const method = actionType === "sign" ? "POST" : "DELETE";
		const token = localStorage.getItem("token");
		if (!token) {
			setErrorMessage("Musisz być zalogowany, aby podpisać uchwałę.");
			return;
		}
		try {
			const res = await fetch(endpoint, {
				method,
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
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
			const token = localStorage.getItem("token");
			const res = await fetch(`/newapp/api/resolutions/${resolution.id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
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

	const splitContentIntoLines = (content) => {
		if (!content)
			return [{ marker: null, text: "", level: 1, type: "paragraph" }];
		const rawLines = content
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l);

		const merged = [];
		for (const line of rawLines) {
			const isLoneDigit = /^\d{1,2}$/.test(line);
			const isLoneNumberWithDot = /^\d{1,2}[.)]$/.test(line);
			const isLoneArt = /^[""„”'']?Art\.?$/i.test(line);
			const isLoneQuote = /^[""„”'']$/.test(line);
			const isArtStart = /^[""„”'']?Art\.?\s*$/i.test(line);

			if (
				merged.length > 0 &&
				(isLoneDigit ||
					isLoneNumberWithDot ||
					isLoneArt ||
					isLoneQuote ||
					isArtStart)
			) {
				merged[merged.length - 1] += " " + line;
			} else {
				merged.push(line);
			}
		}

		return merged.map((line) => {
			const m = line.match(
				/^(\d+[a-z]?[.)]|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)])\s+(.+)$/i,
			);
			if (m) {
				const marker = m[1];
				const text = m[2];
				let level = 1;
				if (/^\d+\.$/.test(marker)) level = 1;
				else if (/^\d+\)$/.test(marker)) level = 2;
				else if (/^[a-z]\)$/.test(marker)) level = 3;
				else if (/^[IVXLCDM]+[.)]$/i.test(marker)) level = 4;
				return { marker, text, level, type: "list-item" };
			}
			return { marker: null, text: line, level: 1, type: "paragraph" };
		});
	};

	const startEditing = () => {
		const clone = JSON.parse(JSON.stringify(resolution));
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
						: splitContentIntoLines(art.content || ""),
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
			for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
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
			const token = localStorage.getItem("token");
			const res = await fetch(`/newapp/api/resolutions/${resolution.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
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

	/* ── Render ── */

	if (loading) {
		return (
			<div className={styles.page}>
				<p className={styles.muted}>Ładowanie…</p>
			</div>
		);
	}

	if (!resolution) {
		return (
			<div className={styles.page}>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono uchwały</p>
					<p className={styles.emptyText}>
						{errorMessage ||
							"Uchwała mogła zostać usunięta lub zmienił się link."}
					</p>
					<Link to="/uchwaly" className={styles.btnOutline}>
						Wróć do uchwał
					</Link>
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
				<div className={styles.topbarMeta}>
					{session && (
						<span className={styles.topbarSession}>
							{session.city}
							{session.date && ` · ${session.date}`}
						</span>
					)}
					<StatusPill status={resolution.status} />
				</div>
				{isEditing ? (
					<textarea
						className={styles.titleInput}
						value={editedData.title}
						onChange={(e) => updateField(["title"], e.target.value)}
						rows={2}
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
			</header>

			{isEditing ? (
				<div className={styles.field}>
					<label className={styles.label}>Preambuła</label>
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

			<div className={styles.metaRow}>
				<div className={styles.metaCell}>
					<span className={styles.metaLabel}>Załącznik</span>
					{resolution.filePath ? (
						<a
							href={resolution.filePath}
							className={styles.fileLink}
							target="_blank"
							rel="noopener noreferrer"
						>
							{resolution.fileName || "Pobierz plik"}
						</a>
					) : resolution.fileName ? (
						<a
							href={`/uploads/resolutions/${resolution.fileName}`}
							className={styles.fileLink}
							target="_blank"
							rel="noopener noreferrer"
						>
							{resolution.fileName}
						</a>
					) : (
						<span className={styles.muted}>Brak załącznika</span>
					)}
				</div>

				<div className={styles.metaCell}>
					<span className={styles.metaLabel}>Podpisy</span>
					<div className={styles.signaturesRow}>
						<strong className={styles.signaturesCount}>
							{resolution.signatures}
						</strong>
						<span className={styles.muted}>
							{resolution.signatures === 1 ? "podpis" : "podpisów"}
						</span>
						<button
							type="button"
							className={styles.linkBtn}
							onClick={() => setShowSignatures(true)}
						>
							Zobacz listę
						</button>
					</div>
				</div>
			</div>

			<section className={styles.content}>
				<div className={styles.contentHead}>
					<h2 className={styles.contentTitle}>Treść uchwały</h2>
					{isEditing && (
						<button
							type="button"
							onClick={addChapter}
							className={styles.btnGhost}
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
											className={styles.chapterTitleInput}
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
											className={styles.chapterSubtitleInput}
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
										className={styles.btnDangerSmall}
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
													className={styles.articleNumberInput}
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
													className={styles.btnDangerSmall}
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
																className={styles.btnDangerSmall}
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
													className={styles.btnGhost}
												>
													+ Dodaj linię
												</button>
											</div>
										</div>
									))}

									<button
										type="button"
										onClick={() => addArticle(chIndex)}
										className={styles.btnGhost}
									>
										+ Dodaj artykuł
									</button>
								</div>
							</article>
						))}
					</div>
				) : (
					<>
						{resolution.chapters?.map((chapter, chIndex) => (
							<article key={chapter.id || chIndex} className={styles.chapter}>
								<header className={styles.chapterHead}>
									<h3 className={styles.chapterTitle}>{chapter.title}</h3>
									{chapter.subtitle && (
										<p className={styles.chapterSubtitle}>{chapter.subtitle}</p>
									)}
								</header>

								{(chapter.articles || []).map((article, artIndex) => (
									<div key={article.id || artIndex} className={styles.article}>
										<h4 className={styles.articleNumber}>{article.number}</h4>

										<div className={styles.articleContent}>
											{(() => {
												if ((article.contentLines || []).length > 0) {
													return article.contentLines.map((line, lineIndex) => {
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
													});
												}

												const lines = splitContentIntoLines(
													article.content || "",
												);
												return lines.map((line, lineIndex) => {
													if (line.marker) {
														return (
															<p
																key={lineIndex}
																className={styles.articleLine}
																data-level={line.level}
															>
																<span className={styles.lineMarker}>
																	{line.marker}
																</span>{" "}
																{line.text}
															</p>
														);
													}
													return (
														<p
															key={lineIndex}
															className={styles.articleLine}
															data-level={line.level || 1}
														>
															{line.text}
														</p>
													);
												});
											})()}
										</div>
									</div>
								))}
							</article>
						))}
					</>
				)}
			</section>

			<section className={styles.actions}>
				{isEditing ? (
					<>
						<button
							type="button"
							className={styles.btnPrimary}
							onClick={handleSaveResolution}
							disabled={saving}
						>
							<Save size={16} />
							{saving ? "Zapisywanie..." : "Zapisz zmiany"}
						</button>
						<button
							type="button"
							className={styles.btnGhost}
							onClick={cancelEditing}
							disabled={saving}
						>
							<X size={16} />
							Anuluj edycję
						</button>
						{saveError && <p className={styles.error}>{saveError}</p>}
					</>
				) : (
					<>
						{currentUser?.isAuthor ? (
							<span className={styles.muted}>Autor — podpis automatyczny</span>
						) : (
							<button
								type="button"
								className={styles.btnPrimary}
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
							className={styles.btnOutline}
						>
							Wyświetl poprawki
						</Link>

						{isAdminOrCoordinator && (
							<button
								type="button"
								className={styles.btnOutline}
								onClick={startEditing}
							>
								<Pencil size={16} />
								Edytuj uchwałę
							</button>
						)}

						{isAdminOrCoordinator && (
							<button
								type="button"
								className={styles.btnDanger}
								onClick={() => setShowDeleteConfirm(true)}
							>
								<Trash2 size={16} />
								Usuń uchwałę
							</button>
						)}
					</>
				)}
			</section>

			{/* Panel podpisów */}
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
										<span className={styles.signatureAvatar}>
											{user.name.charAt(0).toUpperCase()}
										</span>
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

			{/* Modal podpisu */}
			{showConfirm &&
				createPortal(
					<div className={styles.modalOverlay}>
						<div className={styles.modal}>
							<h2 className={styles.modalTitle}>
								{actionType === "sign" ? "Podpisać uchwałę?" : "Usunąć podpis?"}
							</h2>
							{errorMessage && <p className={styles.error}>{errorMessage}</p>}
							<p className={styles.modalText}>
								{actionType === "sign"
									? "Czy na pewno chcesz podpisać tę uchwałę?"
									: "Czy na pewno chcesz usunąć swój podpis?"}
							</p>
							<div className={styles.modalActions}>
								<button
									type="button"
									className={styles.btnPrimary}
									onClick={handleSignatureAction}
								>
									Potwierdź
								</button>
								<button
									type="button"
									className={styles.btnGhost}
									onClick={() => setShowConfirm(false)}
								>
									Anuluj
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{/* Modal usuwania */}
			{showDeleteConfirm &&
				createPortal(
					<div className={styles.modalOverlay}>
						<div className={styles.modal}>
							<h2 className={styles.modalTitle}>Usunąć uchwałę?</h2>
							{errorMessage && <p className={styles.error}>{errorMessage}</p>}
							<p className={styles.modalText}>
								Czy na pewno chcesz usunąć uchwałę{" "}
								<strong>„{resolution.title}”</strong>? Tej operacji nie można
								cofnąć.
							</p>
							<div className={styles.modalActions}>
								<button
									type="button"
									className={styles.btnDanger}
									onClick={handleDeleteResolution}
								>
									Tak, usuń
								</button>
								<button
									type="button"
									className={styles.btnGhost}
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
