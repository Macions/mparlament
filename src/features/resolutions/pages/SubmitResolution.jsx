import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parseDocx } from "../../../utils/docxParser";
import styles from "./SubmitResolution.module.css";
import SuccessModal from "../../../components/SuccessModal";

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

export default function SubmitResolution() {
	const navigate = useNavigate();
	const [file, setFile] = useState(null);
	const [fileName, setFileName] = useState("");
	const [parsed, setParsed] = useState(null);
	const [editedData, setEditedData] = useState({
		title: "",
		preamble: "",
		chapters: [],
	});
	const [analyzed, setAnalyzed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [showSuccess, setShowSuccess] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("");

	useEffect(() => {
		async function fetchSessions() {
			try {
				const res = await fetch("/newapp/api/sessions");
				if (!res.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const data = await res.json();
				setSessions(Array.isArray(data) ? data : (data.sessions ?? []));
			} catch (err) {
				console.error("Błąd pobierania sesji:", err);
			}
		}
		fetchSessions();
	}, []);

	/* ── Wybór pliku (drop + input) ── */

	const acceptFile = (f) => {
		if (!f) return;
		if (!f.name.endsWith(".docx")) {
			setError("Proszę wybrać plik .docx");
			return;
		}
		setFile(f);
		setFileName(f.name);
		setError("");
		setParsed(null);
		setEditedData((prev) => ({
			title: prev?.title || "",
			preamble: prev?.preamble || "",
			chapters: [],
		}));
		setAnalyzed(false);
		setUploadProgress(0);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);
		acceptFile(e.dataTransfer.files[0]);
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
		acceptFile(e.target.files[0]);
	};

	/* ── Parsowanie DOCX ── */

	const handleParse = async () => {
		if (!file) return;
		setLoading(true);
		setError("");
		try {
			const arrayBuffer = await file.arrayBuffer();
			const mammoth = await import("mammoth");
			await mammoth.default.convertToHtml({ arrayBuffer });

			const data = await parseDocx(file);
			setParsed(data);

			setEditedData((prev) => {
				const userTitle = prev?.title?.trim();
				const userPreamble = prev?.preamble?.trim();
				return {
					...data,
					title: userTitle || data.title || "",
					preamble: userPreamble || data.preamble || "",
				};
			});

			setAnalyzed(true);
		} catch (err) {
			setError("Błąd parsowania: " + err.message);
		} finally {
			setLoading(false);
		}
	};

	/* ── Edycja pól ── */

	const updateField = (path, value) => {
		setEditedData((prev) => {
			const newData = structuredClone(
				prev ?? { title: "", preamble: "", chapters: [] },
			);
			let target = newData;
			for (let i = 0; i < path.length - 1; i++) {
				if (target[path[i]] == null) target[path[i]] = {};
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
				id: Date.now(),
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

	/* ── Wysyłka ── */

	const handleSubmit = async () => {
		if (!editedData || submitting) return;
		if (!file) return setError("Nie wybrano pliku");
		if (!selectedSessionId || selectedSessionId === "all")
			return setError("Wybierz posiedzenie");

		setSubmitting(true);
		setError("");
		setUploadProgress(0);

		try {
			const tokenData = localStorage.getItem("token");
			let jwt = null;
			try {
				const parsed = JSON.parse(tokenData);
				jwt = parsed?.token;
			} catch {
				jwt = tokenData;
			}

			const userRes = await fetch("/newapp/api/auth/me", {
				headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
			});
			if (!userRes.ok) throw new Error("Nie można pobrać danych użytkownika");
			const userData = await userRes.json();

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
						setUploadProgress((event.loaded / event.total) * 100);
					}
				});
				xhr.open("POST", "/newapp/api/resolutions");
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						let data = {};
						try {
							data = JSON.parse(xhr.responseText);
						} catch {}
						resolve({ ok: true, status: xhr.status, data });
					} else {
						let message = `Błąd ${xhr.status}`;
						try {
							message = JSON.parse(xhr.responseText).message || message;
						} catch {}
						reject(new Error(message));
					}
				};
				xhr.onerror = () => reject(new Error("Błąd połączenia z serwerem"));
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

	/* ── Render ── */

	const disabled = !selectedSessionId;

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<h1 className={styles.title}>Złóż uchwałę</h1>
				<p className={styles.subtitle}>
					Wgraj plik DOCX, uzupełnij treść i złóż uchwałę na wybrane
					posiedzenie.
				</p>
			</header>

			<div className={styles.sessionRow}>
				<label htmlFor="session-select" className={styles.sessionLabel}>
					Posiedzenie
				</label>
				<select
					id="session-select"
					value={selectedSessionId}
					onChange={(e) => setSelectedSessionId(e.target.value)}
					className={styles.select}
				>
					<option value="">Wybierz posiedzenie</option>
					{sessions.map((s) => (
						<option key={s.id} value={s.id}>
							{s.name} — {s.date}
						</option>
					))}
				</select>
			</div>

			<form className={styles.form} onSubmit={(e) => e.preventDefault()}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="resolution-title">
						Nazwa uchwały
					</label>
					<textarea
						id="resolution-title"
						className={styles.textarea}
						value={editedData?.title || ""}
						onChange={(e) => updateField(["title"], e.target.value)}
						placeholder="Wpisz nazwę uchwały..."
						disabled={disabled}
						rows={3}
					/>
				</div>

				{editedData?.preamble && (
					<div className={styles.field}>
						<label className={styles.label} htmlFor="resolution-preamble">
							Preambuła
						</label>
						<textarea
							id="resolution-preamble"
							className={styles.textarea}
							value={editedData.preamble}
							onChange={(e) => updateField(["preamble"], e.target.value)}
							placeholder="Preambuła uchwały..."
							disabled={disabled}
							rows={6}
						/>
					</div>
				)}

				<div className={styles.field}>
					<span className={styles.label}>Plik DOCX</span>
					<label
						className={`${styles.drop} ${fileName ? styles.dropActive : ""} ${
							isDragging ? styles.dropDragging : ""
						} ${disabled ? styles.dropDisabled : ""}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<input
							type="file"
							accept=".docx"
							hidden
							onChange={handleFileChange}
							disabled={disabled}
						/>
						<span className={styles.dropTitle}>
							{fileName ? "Zmień plik" : "Wybierz plik"}
						</span>
						<span className={styles.dropHint}>
							{fileName ? fileName : "Kliknij lub przeciągnij plik .docx"}
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
					disabled={!file || loading || disabled}
					className={`${styles.btn} ${styles.btnOutline}`}
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
															: `${indent}${normalizedLine.text || ""}`;

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
					</section>
				)}

				<button
					type="button"
					className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
					onClick={handleSubmit}
					disabled={disabled || submitting}
				>
					{submitting ? "Wysyłanie..." : "Złóż uchwałę"}
				</button>
			</form>

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
