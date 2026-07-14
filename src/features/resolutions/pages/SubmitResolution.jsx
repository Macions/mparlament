import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { parseDocx } from "../../../../server/services/docxParser";
import "./submitResolution.css";
import SuccessModal from "../../../components/SuccessModal";

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
	const [submitting, setSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const navigate = useNavigate();
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("");
	useEffect(() => {
		async function fetchSessions() {
			try {
				const response = await fetch("/api/sessions");
				if (!response.ok) throw new Error("Nie udało się pobrać posiedzeń");
				const data = await response.json();
				setSessions(data);
			} catch (error) {
				console.error("Błąd pobierania sesji:", error);
			}
		}
		fetchSessions();
	}, []);

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
			const newData = { ...prev };
			let target = newData;
			for (let i = 0; i < path.length - 1; i++) {
				target = target[path[i]];
			}
			target[path[path.length - 1]] = value;
			return newData;
		});
	};

	const addChapter = () => {
		setEditedData((prev) => ({
			...prev,
			chapters: [
				...prev.chapters,
				{
					id: Date.now(),
					title: "Nowy rozdział",
					articles: [],
				},
			],
		}));
	};

	const removeChapter = (chIndex) => {
		setEditedData((prev) => ({
			...prev,
			chapters: prev.chapters.filter((_, i) => i !== chIndex),
		}));
	};

	const addArticle = (chIndex) => {
		setEditedData((prev) => {
			const newData = { ...prev };
			newData.chapters[chIndex].articles.push({
				id: Date.now(),
				number: (newData.chapters[chIndex].articles.length + 1).toString(),
				content: "",
			});
			return newData;
		});
	};

	const removeArticle = (chIndex, artIndex) => {
		setEditedData((prev) => {
			const newData = { ...prev };
			newData.chapters[chIndex].articles.splice(artIndex, 1);
			return newData;
		});
	};

	const handleSubmit = async () => {
		if (!editedData || submitting) return;

		// Sprawdź czy plik istnieje
		if (!file) {
			setError("Nie wybrano pliku");
			return;
		}

		// 👇 DODAJ TĘ WALIDACJĘ:
		if (!selectedSessionId || selectedSessionId === "all") {
			setError("Wybierz posiedzenie");
			return;
		}

		setSubmitting(true);
		setError("");
		setUploadProgress(0); // 👈 DODAJ

		try {
			const userResponse = await fetch("/api/auth/me");
			if (!userResponse.ok) {
				throw new Error("Nie można pobrać danych użytkownika");
			}
			const userData = await userResponse.json();

			// Tworzymy FormData
			const formData = new FormData();

			// Dodajemy plik
			formData.append("file", file);

			// Przygotowujemy dane
			const bill = {
				...editedData,
				fileName,
				author: userData.name,
				authorId: userData.id,
				party: userData.club || userData.party || "Niezrzeszony",
				sessionId: selectedSessionId !== "all" ? Number(selectedSessionId) : null, // 👈 DODAJ
			};

			// Dodajemy dane jako JSON string
			formData.append("data", JSON.stringify(bill));

			// 👇 ZMIEŃ fetch na XMLHttpRequest z progress
			const response = await new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				// Nasłuchuj postęp wysyłania
				xhr.upload.addEventListener('progress', (event) => {
					if (event.lengthComputable) {
						const percent = (event.loaded / event.total) * 100;
						setUploadProgress(percent);
					}
				});

				xhr.open('POST', '/api/resolutions');

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
		<div className="submit-page">
			<button
				className="back-to-home-btn"
				onClick={() => navigate("/panel")}
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
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
			<div className="uchwaly-bar">
				<h1 className="uchwaly-title">
					ZŁÓŻ UCHWAŁĘ
				</h1>
				<div className="session-selector">
					<label htmlFor="session-select">Posiedzenie:</label>
					<select
						id="session-select"
						value={selectedSessionId}
						onChange={(e) => setSelectedSessionId(e.target.value)}
						className="session-select"
					>
						<option value="all">Wybierz posiedzenie</option>
						{sessions.map((session) => (
							<option key={session.id} value={session.id}>
								{session.name} - {session.date}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="submit-container">
				<div className="form-card">
					<div className={`form-content ${!selectedSessionId ? 'disabled' : ''}`}>

						<div className="form-group">
							<label className="label">Nazwa uchwały</label>
							<input
								type="text"
								className="text-input"
								value={editedData?.title || ""}
								onChange={(e) => updateField(["title"], e.target.value)}
								placeholder="Wpisz nazwę uchwały..."
								disabled={!selectedSessionId}
							/>
						</div>

						<div className="form-group">
							<label className="label">Dodaj plik DOCX</label>
							<div className="file-upload-area">
								<label className="file-button">
									Wybierz plik
									<input
										type="file"
										accept=".docx"
										hidden
										onChange={handleFileChange}
									/>
								</label>
								<div className="selected-file">
									{fileName || "Nie wybrano pliku"}
								</div>
							</div>
							{file && (
								<div className="file-info">
									{file.name} ({(file.size / 1024).toFixed(1)} KB)
								</div>
							)}
						</div>

						{error && <p className="error">{error}</p>}

						<button
							onClick={handleParse}
							disabled={!file || loading || !selectedSessionId}
							className="parse-btn"
						>
							{loading
								? "Analizowanie..."
								: analyzed
									? "Przeanalizowano"
									: "Analizuj ustawę"}
						</button>
						{submitting && uploadProgress > 0 && uploadProgress < 100 && (
							<div className="progress-container">
								<div className="progress-bar">
									<div
										className="progress-fill"
										style={{ width: `${Math.round(uploadProgress)}%` }}
									/>
								</div>
								<span className="progress-text">
									Wysyłanie pliku: {Math.round(uploadProgress)}%
								</span>
							</div>
						)}

						{editedData?.chapters && editedData.chapters.length > 0 && (
							<div className="editor-section">
								<div className="editor-header">
									<h2>Edytuj treść uchwały</h2>
									<button onClick={addChapter} className="add-chapter-btn">
										+ Dodaj rozdział
									</button>
								</div>

								{editedData.chapters.map((chapter, chIndex) => (
									<div key={chapter.id} className="chapter-edit-block">
										<div className="chapter-header">
											<input
												type="text"
												className="chapter-title-input"
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
												onClick={() => removeChapter(chIndex)}
												className="remove-btn"
											>
												Usuń rozdział
											</button>
										</div>

										<div className="articles-container">
											{chapter.articles.map((article, artIndex) => (
												<div key={article.id} className="article-edit">
													<div className="article-number-row">
														<input
															type="text"
															className="article-number-input"
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
															onClick={() => removeArticle(chIndex, artIndex)}
															className="remove-article-btn"
														>
															Usuń
														</button>
													</div>

													<textarea
														className="article-textarea"
														value={article.content}
														onChange={(e) =>
															updateField(
																[
																	"chapters",
																	chIndex,
																	"articles",
																	artIndex,
																	"content",
																],
																e.target.value,
															)
														}
														placeholder="Treść artykułu..."
														rows={4}
													/>
												</div>
											))}

											<button
												onClick={() => addArticle(chIndex)}
												className="add-article-btn"
											>
												+ Dodaj artykuł
											</button>
										</div>

									</div>
								))}
							</div>
						)}

						<button
							className="submit-res-btn"
							onClick={handleSubmit}
							disabled={!selectedSessionId}
						>
							{submitting ? "Wysyłanie..." : "Złóż uchwałę"}
						</button>
						{!selectedSessionId && (
							<div className="form-overlay">
								<p>Wybierz posiedzenie aby rozpocząć</p>
							</div>
						)}
					</div>
				</div>
			</div>

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
