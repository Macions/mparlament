import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { parseDocx } from "../../../utils/docxParser";
import styles from "./SubmitResolution.module.css";
import SuccessModal from "../../../components/SuccessModal";

function parseLineBack(raw) {
	// Dopasuj: opcjonalne wcięcie + marker (1., 1), a), a., i., I., –) + treść
	const match = raw.match(
		/^(\s*)(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+\.|–)\s+(.*)$/i,
	);
	if (match) {
		const level = Math.floor(match[1].length / 2) + 1;
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
export default function SubmitResolution() {
	const location = useLocation();
	const [file, setFile] = useState(null);
	const [fileName, setFileName] = useState("");
	const [parsed, setParsed] = useState(null);
	const [editedData, setEditedData] = useState(null);
	const [analyzed, setAnalyzed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [showSuccess, setShowSuccess] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const navigate = useNavigate();
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("");

	useEffect(() => {
		async function fetchSessions() {
			try {
				const response = await fetch("/newapp/api/sessions");
				if (!response.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const data = await response.json();
				setSessions(data);
			} catch (error) {
				console.error("Błąd pobierania sesji:", error);
			}
		}
		fetchSessions();
	}, []);
	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);

		const droppedFile = e.dataTransfer.files[0];
		if (!droppedFile) return;

		if (droppedFile.name.endsWith(".docx")) {
			setFile(droppedFile);
			setFileName(droppedFile.name);
			setError("");
			setParsed(null);
			setEditedData(null);
			setAnalyzed(false);
			setUploadProgress(0);
		} else {
			setError("Proszę wybrać plik .docx");
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setIsDragging(false);
	};
	const handleFileChange = (e) => {
		const f = e.target.files[0];
		if (f && f.name.endsWith(".docx")) {
			setFile(f);
			setFileName(f.name);
			setError("");
			setParsed(null);
			setEditedData(null);
			setAnalyzed(false);
			setUploadProgress(0);
		} else {
			setError("Proszę wybrać plik .docx");
		}
	};

	const handleParse = async () => {
		if (!file) return;

		setLoading(true);
		setError("");

		try {
			const arrayBuffer = await file.arrayBuffer();
			const mammoth = await import("mammoth");
			const result = await mammoth.default.convertToHtml({ arrayBuffer });
			console.log("=== SUROWY HTML ===");
			console.log(result.value);
			console.log("=== KONIEC HTML ===");

			const data = await parseDocx(file);
			setParsed(data);
			setEditedData(JSON.parse(JSON.stringify(data)));
			setAnalyzed(true);
		} catch (err) {
			setError("Błąd parsowania: " + err.message);
		} finally {
			setLoading(false);
		}
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
				id: Date.now(),
				title: "Nowy rozdział",
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
				id: Date.now(),
				number: (newData.chapters[chIndex].articles.length + 1).toString(),
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

	const handleSubmit = async () => {
		if (!editedData || submitting) return;

		if (!file) {
			setError("Nie wybrano pliku");
			return;
		}

		if (!selectedSessionId || selectedSessionId === "all") {
			setError("Wybierz posiedzenie");
			return;
		}

		setSubmitting(true);
		setError("");
		setUploadProgress(0);

		try {
			const userResponse = await fetch("/newapp/api/auth/me");
			if (!userResponse.ok) {
				throw new Error("Nie można pobrać danych użytkownika");
			}
			const userData = await userResponse.json();

			const formData = new FormData();

			formData.append("file", file);

			const bill = {
				...editedData,
				fileName,
				author: userData.name,
				authorId: userData.id,
				party: userData.club || userData.party || "Niezrzeszony",
				sessionId:
					selectedSessionId !== "all" ? Number(selectedSessionId) : null,
			};

			formData.append("data", JSON.stringify(bill));

			const response = await new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				xhr.upload.addEventListener("progress", (event) => {
					if (event.lengthComputable) {
						const percent = (event.loaded / event.total) * 100;
						setUploadProgress(percent);
					}
				});

				xhr.open("POST", "/newapp/api/resolutions");

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const data = JSON.parse(xhr.responseText);
							resolve({ ok: true, status: xhr.status, data });
						} catch (e) {
							resolve({ ok: true, status: xhr.status, data: {} });
						}
					} else {
						try {
							const error = JSON.parse(xhr.responseText);
							reject(new Error(error.message || `Błąd ${xhr.status}`));
						} catch (e) {
							reject(new Error(`Błąd ${xhr.status}`));
						}
					}
				};

				xhr.onerror = () => {
					reject(new Error("Błąd połączenia z serwerem"));
				};

				xhr.send(formData);
			});

			if (!response.ok) {
				throw new Error(response.message || "Nie udało się złożyć uchwały");
			}

			setUploadProgress(100);
			setShowSuccess(true);
		} catch (err) {
			setError(err.message);
			setSubmitting(false);
			setUploadProgress(0);
		}
	};

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<button
					type="button"
					className={styles.back}
					onClick={() => navigate("/panel")}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M15 18L9 12L15 6"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Panel
				</button>

				<div className={styles.session}>
					<label htmlFor="session-select" className={styles.sessionLabel}>
						Posiedzenie
					</label>
					<select
						id="session-select"
						value={selectedSessionId}
						onChange={(e) => setSelectedSessionId(e.target.value)}
						className={styles.select}
					>
						<option value="all">Wybierz posiedzenie</option>
						{sessions.map((session) => (
							<option key={session.id} value={session.id}>
								{session.name} — {session.date}
							</option>
						))}
					</select>
				</div>
			</header>

			<main className={styles.main}>
				<div className={styles.head}>
					<span className={styles.eyebrow}>Nowa uchwała</span>
					<h1 className={styles.title}>Złóż uchwałę</h1>
					<p className={styles.subtitle}>
						Wgraj plik DOCX, uzupełnij treść i złóż uchwałę na wybrane
						posiedzenie.
					</p>
				</div>

				<form
					className={`${styles.form} ${
						!selectedSessionId ? styles.formDisabled : ""
					}`}
					onSubmit={(e) => e.preventDefault()}
				>
					<div className={styles.field}>
						<label className={styles.label} htmlFor="resolution-title">
							Nazwa uchwały
						</label>
						<input
							id="resolution-title"
							type="text"
							className={styles.input}
							value={editedData?.title || ""}
							onChange={(e) => updateField(["title"], e.target.value)}
							placeholder="Wpisz nazwę uchwały..."
							disabled={!selectedSessionId}
						/>
					</div>

					<div className={styles.field}>
						<label className={styles.label}>Plik DOCX</label>

						<label
							className={`${styles.fileDrop} ${
								fileName ? styles.fileDropActive : ""
							} ${isDragging ? styles.fileDropDragging : ""}`}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						>
							<input
								type="file"
								accept=".docx"
								hidden
								onChange={handleFileChange}
								disabled={!selectedSessionId}
							/>
							<span className={styles.fileDropIcon} aria-hidden="true">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
									<path
										d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>

							<span className={styles.fileDropTitle}>
								{fileName ? "Zmień plik" : "Wybierz plik"}
							</span>
							<span className={styles.fileDropHint}>
								{fileName ? fileName : "Kliknij, aby wybrać plik .docx"}
							</span>
						</label>

						{file && (
							<p className={styles.fileMeta}>
								{file.name} · {(file.size / 1024).toFixed(1)} KB
							</p>
						)}
					</div>

					{error && <div className={styles.error}>{error}</div>}

					<button
						type="button"
						onClick={handleParse}
						disabled={!file || loading || !selectedSessionId}
						className={`${styles.btn} ${styles.btnOutline} ${styles.btnBlock}`}
					>
						{loading
							? "Analizowanie..."
							: analyzed
								? "Przeanalizowano"
								: "Analizuj ustawę"}
					</button>

					{submitting && uploadProgress > 0 && uploadProgress < 100 && (
						<div className={styles.progress}>
							<div className={styles.progressTrack}>
								<div
									className={styles.progressFill}
									style={{ width: `${Math.round(uploadProgress)}%` }}
								/>
							</div>
							<span className={styles.progressText}>
								Wysyłanie pliku: {Math.round(uploadProgress)}%
							</span>
						</div>
					)}

					{editedData?.chapters && editedData.chapters.length > 0 && (
						<section className={styles.editor}>
							<div className={styles.editorHead}>
								<h2 className={styles.editorTitle}>Edytuj treść uchwały</h2>
								<button
									type="button"
									onClick={addChapter}
									className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
								>
									+ Dodaj rozdział
								</button>
							</div>

							<div className={styles.chapters}>
								{editedData.chapters.map((chapter, chIndex) => (
									<article key={chapter.id} className={styles.chapter}>
										<header className={styles.chapterHead}>
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
												placeholder="Nazwa rozdziału"
											/>
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
														{(
															article.contentLines || [
																{
																	marker: null,
																	text: "",
																	level: 1,
																	type: "paragraph",
																},
															]
														).map((line, lineIndex) => {
															const normalizedLine =
																typeof line === "string"
																	? {
																			marker: null,
																			text: line,
																			level: 1,
																			type: "paragraph",
																		}
																	: line;

															const indent = "  ".repeat(
																(normalizedLine.level || 1) - 1,
															);
															const displayValue = normalizedLine.marker
																? `${indent}${normalizedLine.marker} ${normalizedLine.text}`
																: normalizedLine.text || "";

															return (
																<div
																	key={lineIndex}
																	className={styles.articleLine}
																	data-level={normalizedLine.level || 1}
																>
																	<textarea
																		className={styles.textarea}
																		value={displayValue}
																		onChange={(e) => {
																			const raw = e.target.value;
																			const parsedLine = parseLineBack(raw);
																			const newLines = structuredClone(
																				article.contentLines || [],
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
																				article.contentLines || [],
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
																	article.contentLines || [],
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
																			l.marker
																				? `${l.marker} ${l.text}`
																				: l.text,
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
						</section>
					)}

					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
						onClick={handleSubmit}
						disabled={!selectedSessionId || submitting}
					>
						{submitting ? "Wysyłanie..." : "Złóż uchwałę"}
					</button>

					{!selectedSessionId && (
						<div className={styles.overlay}>
							<p>Wybierz posiedzenie, aby rozpocząć</p>
						</div>
					)}
				</form>
			</main>

			{showSuccess && (
				<SuccessModal
					title="Złożono uchwałę"
					description="Uchwała została pomyślnie dodana"
					redirectTo="/uchwaly"
					seconds={3}
					onClose={() => {
						setShowSuccess(false);
						setSubmitting(false);
					}}
				/>
			)}
		</div>
	);
}
