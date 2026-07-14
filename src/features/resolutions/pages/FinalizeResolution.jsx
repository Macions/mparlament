import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parseDocx } from "../../../utils/docxParser.js";
import {
	generateDocxWithTags,
	downloadDocx,
} from "../../../utils/docxGenerator.js";
export default function FinalizeResolution() {
	const navigate = useNavigate();

	// Stany dla wyboru
	const [sessions, setSessions] = useState([]);
	const [selectedSession, setSelectedSession] = useState(null);
	const [resolutions, setResolutions] = useState([]);
	const [selectedResolution, setSelectedResolution] = useState(null);
	const [selectedFile, setSelectedFile] = useState(null);

	// Stany dla poprawek i artykułów
	const [amendments, setAmendments] = useState([]);
	const [articleMap, setArticleMap] = useState({});
	const [parsedContent, setParsedContent] = useState(null);

	// Stany UI
	const [loading, setLoading] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(null);
	const [step, setStep] = useState(1); // 1: wybór pliku, 2: wybór posiedzenia, 3: wybór uchwały, 4: podgląd

	// Pobierz listę posiedzeń
	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		try {
			const response = await fetch("/api/sessions");
			if (!response.ok) throw new Error("Nie udało się pobrać posiedzeń");
			const data = await response.json();
			setSessions(data);
		} catch (err) {
			setError(err.message);
		}
	};

	// Pobierz uchwały dla wybranego posiedzenia
	const fetchResolutionsForSession = async (sessionId) => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/resolutions/session/${sessionId}`);
			if (!response.ok) throw new Error("Nie udało się pobrać uchwał");
			const data = await response.json();
			setResolutions(data.resolutions);
			setSelectedResolution(null);
			setAmendments([]);
			setArticleMap({});
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Pobierz poprawki dla wybranej uchwały
	const fetchAmendmentsForResolution = async (resolutionId) => {
		setLoading(true);
		setError(null);
		try {
			console.log(`📥 Pobieram poprawki dla uchwały ID: ${resolutionId}`);
			const response = await fetch(
				`/api/resolutions/${resolutionId}/amendments`,
			);
			console.log("📥 Odpowiedź z API:", response.status, response.statusText);

			if (!response.ok) throw new Error("Nie udało się pobrać poprawek");
			const data = await response.json();
			console.log("📥 Otrzymane dane poprawek:", data);
			console.log("📥 Liczba poprawek:", data.amendments?.length);

			setAmendments(data.amendments || []);

			if (selectedFile) {
				console.log("📄 Parsuję plik po pobraniu poprawek...");
				await parseAndMapFile(selectedFile);
			}
		} catch (err) {
			console.error("❌ Błąd pobierania poprawek:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};
	// Parsuj plik i twórz mapę artykułów
	const parseAndMapFile = async (file) => {
		try {
			console.log("📄 Rozpoczynam parsowanie pliku:", file.name);
			const parsed = await parseDocx(file);
			console.log("🔍 Wynik parsowania (pełny):", parsed);
			console.log("🔍 Struktura chapters:", parsed.chapters);
			console.log("🔍 Liczba rozdziałów:", parsed.chapters?.length);

			setParsedContent(parsed);

			const map = {};
			let artCounter = 0;

			// Twój parser zwraca { title, preamble, chapters }
			// chapters: [{ id, title, articles: [{ id, number, content }] }]
			if (parsed.chapters && Array.isArray(parsed.chapters)) {
				console.log("📖 Znaleziono rozdziały:", parsed.chapters.length);
				parsed.chapters.forEach((chapter, chapterIndex) => {
					console.log(`📖 Rozdział ${chapterIndex + 1}:`, chapter.title);
					console.log(
						`📖 Liczba artykułów w rozdziale:`,
						chapter.articles?.length,
					);

					if (chapter.articles && Array.isArray(chapter.articles)) {
						chapter.articles.forEach((article) => {
							artCounter++;
							const key = `art_${artCounter}`;
							map[key] = {
								articleId: artCounter,
								number: article.number || `Art. ${artCounter}`,
								content: article.content || "",
							};
							console.log(`📝 Artykuł ${artCounter}:`, map[key]);
						});
					}
				});
			} else {
				console.warn("⚠️ Brak chapters w sparsowanym dokumencie!");
				console.log("🔍 Struktura parsed:", Object.keys(parsed));
			}

			setArticleMap(map);
			console.log("📄 Zmapowane artykuły (łącznie):", map);
			console.log("📄 Znaleziono artykułów:", artCounter);
			return map;
		} catch (err) {
			console.error("❌ Błąd parsowania pliku:", err);
			setError("Błąd parsowania pliku: " + err.message);
			return null;
		}
	};
	// Obsługa wyboru pliku
	const handleFileSelect = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

		// Sprawdź czy to plik DOCX
		if (
			!file.name.endsWith(".docx") &&
			file.type !==
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		) {
			setError("Proszę wybrać plik w formacie DOCX");
			return;
		}

		setSelectedFile(file);
		setError(null);

		// Parsuj plik od razu
		await parseAndMapFile(file);

		setStep(2); // Przejdź do wyboru posiedzenia
	};

	// Obsługa wyboru posiedzenia
	const handleSessionSelect = (sessionId) => {
		const session = sessions.find((s) => s.id === Number(sessionId));
		setSelectedSession(session);
		fetchResolutionsForSession(sessionId);
		setStep(3); // Przejdź do wyboru uchwały
	};

	// Obsługa wyboru uchwały
	const handleResolutionSelect = async (resolutionId) => {
		const resolution = resolutions.find((r) => r.id === Number(resolutionId));
		setSelectedResolution(resolution);
		await fetchAmendmentsForResolution(resolutionId);
		setStep(4); // Przejdź do podglądu
	};

	// Generuj końcową uchwałę
	const handleGenerate = async () => {
		if (!selectedFile || !selectedResolution || amendments.length === 0) {
			setError("Brak wymaganych danych do generowania");
			return;
		}

		const acceptedAmendments = amendments.filter(
			(a) => a.status === "accepted",
		);

		if (acceptedAmendments.length === 0) {
			setError("Brak przyjętych poprawek do zastosowania");
			return;
		}

		setGenerating(true);
		setError(null);
		setSuccess(null);

		try {
			// Przygotuj dane do podmiany
			const data = {};
			acceptedAmendments.forEach((amendment) => {
				console.log(
					`🔍 Przetwarzam poprawkę ID: ${amendment.id}, status: ${amendment.status}`,
				);
				if (amendment.changes && Array.isArray(amendment.changes)) {
					amendment.changes.forEach((change) => {
						const key = `art_${change.articleId}`;
						console.log(
							`   ${key}: before=${change.before}, after=${change.after}`,
						);

						if (articleMap[key]) {
							// Sprawdź czy to usunięcie
							if (change.after === "(usunięty)") {
								console.log(`   🗑️ USUNIĘCIE: ${key}`);
								data[key] = "(usunięty)";
							}
							// Sprawdź czy to nowy artykuł (before === null, undefined LUB "(nowy artykuł)")
							else if (
								change.before === null ||
								change.before === undefined ||
								change.before === "(nowy artykuł)"
							) {
								console.log(`   ➕ NOWY ARTYKUŁ: ${key} -> ${change.after}`);
								data[key] = `NEW_ARTICLE: ${change.after}`;
							}
							// Zwykła podmiana
							else {
								console.log(`   ✏️ PODMIANA: ${key} -> ${change.after}`);
								data[key] = change.after || "";
							}
						} else {
							console.log(`   ⚠️ ${key} nie znaleziony w mapie artykułów`);
						}
					});
				}
			});

			if (Object.keys(data).length === 0) {
				setError(
					"Brak danych do podmiany - sprawdź czy poprawki pasują do artykułów",
				);
				setGenerating(false);
				return;
			}

			console.log("🔄 Dane do podmiany:", data);
			console.log("📄 Mapa artykułów:", articleMap);

			// Generuj plik
			const buffer = await generateDocxWithTags(selectedFile, data);

			// Pobierz plik
			const fileName = `${selectedResolution.slug || "uchwala"}-final-${Date.now()}.docx`;
			downloadDocx(buffer, fileName);

			setSuccess(
				`✅ Wygenerowano uchwałę! Zastosowano ${acceptedAmendments.length} poprawek.`,
			);
		} catch (err) {
			setError("Błąd generowania: " + err.message);
		} finally {
			setGenerating(false);
		}
	};

	// Resetuj wszystko
	const handleReset = () => {
		setSelectedFile(null);
		setSelectedSession(null);
		setSelectedResolution(null);
		setResolutions([]);
		setAmendments([]);
		setArticleMap({});
		setParsedContent(null);
		setError(null);
		setSuccess(null);
		setStep(1);
		// Resetuj input file
		const fileInput = document.getElementById("fileInput");
		if (fileInput) fileInput.value = "";
	};

	const handleBack = () => {
		navigate("/panel");
	};

	// Statystyki poprawek
	const stats = {
		total: amendments.length,
		accepted: amendments.filter((a) => a.status === "accepted").length,
		rejected: amendments.filter((a) => a.status === "rejected").length,
		pending: amendments.filter((a) => a.status === "pending").length,
		withdrawn: amendments.filter((a) => a.status === "withdrawn").length,
	};

	return (
		<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
			{/* Nagłówek */}
			<div
				style={{
					padding: "20px",
					borderBottom: "1px solid #ccc",
					marginBottom: "20px",
				}}
			>
				<button onClick={handleBack} style={{ marginBottom: "10px" }}>
					← Powrót do panelu
				</button>
				<h1>📄 Finalizowanie uchwały</h1>
				<p>
					Krok {step} z 4: {step === 1 && "Wybierz plik DOCX"}
				</p>
				<p>{step === 2 && "Wybierz posiedzenie"}</p>
				<p>{step === 3 && "Wybierz uchwałę"}</p>
				<p>{step === 4 && "Podgląd i generowanie"}</p>
			</div>

			{/* Komunikaty */}
			{error && (
				<div
					style={{
						padding: "15px",
						margin: "10px 0",
						background: "#ffebee",
						color: "#c62828",
						border: "1px solid #ef9a9a",
						borderRadius: "4px",
					}}
				>
					❌ {error}
					<button
						onClick={() => setError(null)}
						style={{
							marginLeft: "10px",
							background: "none",
							border: "none",
							cursor: "pointer",
						}}
					>
						✕
					</button>
				</div>
			)}
			{success && (
				<div
					style={{
						padding: "15px",
						margin: "10px 0",
						background: "#e8f5e9",
						color: "#2e7d32",
						border: "1px solid #a5d6a7",
						borderRadius: "4px",
					}}
				>
					{success}
					<button
						onClick={() => setSuccess(null)}
						style={{
							marginLeft: "10px",
							background: "none",
							border: "none",
							cursor: "pointer",
						}}
					>
						✕
					</button>
				</div>
			)}

			{/* Krok 1: Wybór pliku */}
			{step === 1 && (
				<div
					style={{
						padding: "40px",
						border: "2px dashed #ccc",
						borderRadius: "8px",
						textAlign: "center",
					}}
				>
					<h2>📂 Wybierz plik uchwały</h2>
					<p style={{ color: "#666" }}>
						Wybierz plik DOCX, który chcesz sfinalizować
					</p>
					<input
						id="fileInput"
						type="file"
						accept=".docx"
						onChange={handleFileSelect}
						style={{ margin: "20px 0", padding: "10px" }}
					/>
					{selectedFile && (
						<div style={{ marginTop: "10px", color: "#2e7d32" }}>
							✅ Wybrano: {selectedFile.name} (
							{(selectedFile.size / 1024).toFixed(2)} KB)
						</div>
					)}
					{selectedFile && parsedContent && (
						<div
							style={{
								marginTop: "20px",
								textAlign: "left",
								background: "#f5f5f5",
								padding: "15px",
								borderRadius: "4px",
							}}
						>
							<h4>📖 Znalezione artykuły:</h4>
							{Object.values(articleMap).map((art) => (
								<div
									key={art.articleId}
									style={{ margin: "5px 0", fontSize: "14px" }}
								>
									<strong>{art.number || `Art. ${art.articleId}`}:</strong>{" "}
									{art.content.substring(0, 100)}...
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Krok 2: Wybór posiedzenia */}
			{step === 2 && (
				<div style={{ padding: "20px" }}>
					<h2>🏛️ Wybierz posiedzenie</h2>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							marginTop: "20px",
						}}
					>
						{sessions.map((session) => (
							<button
								key={session.id}
								onClick={() => handleSessionSelect(session.id)}
								style={{
									padding: "15px",
									textAlign: "left",
									background:
										selectedSession?.id === session.id ? "#bbdefb" : "white",
									border:
										selectedSession?.id === session.id
											? "2px solid #1976d2"
											: "1px solid #ddd",
									borderRadius: "4px",
									cursor: "pointer",
								}}
							>
								<strong>
									{session.name || `Posiedzenie nr ${session.number}`}
								</strong>
								<br />
								<small>
									{session.date || session.startDate} |{" "}
									{session.location || "Warszawa"}
								</small>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Krok 3: Wybór uchwały */}
			{step === 3 && (
				<div style={{ padding: "20px" }}>
					<h2>📜 Wybierz uchwałę</h2>
					{loading && <p>Ładowanie uchwał...</p>}
					{resolutions.length === 0 && !loading && (
						<p>Brak uchwał dla tego posiedzenia</p>
					)}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							marginTop: "20px",
						}}
					>
						{resolutions.map((res) => (
							<button
								key={res.id}
								onClick={() => handleResolutionSelect(res.id)}
								style={{
									padding: "15px",
									textAlign: "left",
									background:
										selectedResolution?.id === res.id ? "#bbdefb" : "white",
									border:
										selectedResolution?.id === res.id
											? "2px solid #1976d2"
											: "1px solid #ddd",
									borderRadius: "4px",
									cursor: "pointer",
								}}
							>
								<strong>{res.title}</strong>
								<br />
								<small>
									Status: {res.status} | Autor: {res.author}
								</small>
							</button>
						))}
					</div>
					<button
						onClick={() => setStep(2)}
						style={{ marginTop: "20px", padding: "8px 16px" }}
					>
						← Wróć do wyboru posiedzenia
					</button>
				</div>
			)}

			{/* Krok 4: Podgląd i generowanie */}
			{step === 4 && (
				<div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
					{/* Lewa kolumna - informacje */}
					<div style={{ flex: "1", minWidth: "300px" }}>
						<div
							style={{
								border: "1px solid #ddd",
								padding: "15px",
								borderRadius: "4px",
							}}
						>
							<h3>📋 Podsumowanie</h3>
							<p>
								<strong>Plik:</strong> {selectedFile?.name}
							</p>
							<p>
								<strong>Posiedzenie:</strong>{" "}
								{selectedSession?.name || selectedSession?.number}
							</p>
							<p>
								<strong>Uchwała:</strong> {selectedResolution?.title}
							</p>
							<p>
								<strong>Autor:</strong> {selectedResolution?.author}
							</p>
							<p>
								<strong>Status:</strong> {selectedResolution?.status}
							</p>
							<p>
								<strong>Znalezione artykuły:</strong>{" "}
								{Object.keys(articleMap).length}
							</p>

							<hr />

							<h4>📊 Statystyki poprawek</h4>
							<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
								<span
									style={{
										background: "#e8f5e9",
										padding: "5px 10px",
										borderRadius: "3px",
									}}
								>
									✅ Przyjęte: {stats.accepted}
								</span>
								<span
									style={{
										background: "#ffebee",
										padding: "5px 10px",
										borderRadius: "3px",
									}}
								>
									❌ Odrzucone: {stats.rejected}
								</span>
								<span
									style={{
										background: "#fff3e0",
										padding: "5px 10px",
										borderRadius: "3px",
									}}
								>
									⏳ Oczekujące: {stats.pending}
								</span>
								{stats.withdrawn > 0 && (
									<span
										style={{
											background: "#f5f5f5",
											padding: "5px 10px",
											borderRadius: "3px",
										}}
									>
										↩️ Wycofane: {stats.withdrawn}
									</span>
								)}
							</div>

							<button
								onClick={handleGenerate}
								disabled={generating || stats.accepted === 0}
								style={{
									width: "100%",
									padding: "15px",
									marginTop: "20px",
									background:
										generating || stats.accepted === 0 ? "#ccc" : "#1976d2",
									color: "white",
									border: "none",
									borderRadius: "4px",
									cursor:
										generating || stats.accepted === 0
											? "not-allowed"
											: "pointer",
									fontSize: "16px",
								}}
							>
								{generating
									? "⏳ Generowanie..."
									: "🚀 Generuj końcową uchwałę"}
							</button>

							{stats.accepted === 0 && (
								<p
									style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}
								>
									⚠️ Brak przyjętych poprawek do zastosowania
								</p>
							)}

							<button
								onClick={handleReset}
								style={{
									width: "100%",
									padding: "10px",
									marginTop: "10px",
									background: "transparent",
									border: "1px solid #ccc",
									borderRadius: "4px",
									cursor: "pointer",
								}}
							>
								🔄 Rozpocznij od nowa
							</button>
						</div>
					</div>

					{/* Prawa kolumna - lista poprawek */}
					<div style={{ flex: "2", minWidth: "400px" }}>
						<div
							style={{
								border: "1px solid #ddd",
								padding: "15px",
								borderRadius: "4px",
							}}
						>
							<h3>📝 Poprawki do uchwały ({amendments.length})</h3>

							{amendments.length === 0 && <p>Brak poprawek dla tej uchwały</p>}

							<div style={{ maxHeight: "500px", overflow: "auto" }}>
								{amendments.map((am) => (
									<div
										key={am.id}
										style={{
											padding: "12px",
											marginBottom: "10px",
											border: "1px solid #eee",
											borderRadius: "4px",
											background:
												am.status === "accepted"
													? "#e8f5e9"
													: am.status === "rejected"
														? "#ffebee"
														: am.status === "withdrawn"
															? "#f5f5f5"
															: "#fff3e0",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
											}}
										>
											<strong>{am.author}</strong>
											<span
												style={{
													padding: "2px 8px",
													borderRadius: "3px",
													fontSize: "12px",
													background:
														am.status === "accepted"
															? "#4caf50"
															: am.status === "rejected"
																? "#f44336"
																: am.status === "withdrawn"
																	? "#999"
																	: "#ff9800",
													color: "white",
												}}
											>
												{am.status === "accepted"
													? "✅ Przyjęta"
													: am.status === "rejected"
														? "❌ Odrzucona"
														: am.status === "withdrawn"
															? "↩️ Wycofana"
															: "⏳ Oczekująca"}
											</span>
										</div>
										<p style={{ margin: "8px 0", fontSize: "14px" }}>
											{am.content}
										</p>

										{am.changes && am.changes.length > 0 && (
											<div
												style={{
													margin: "5px 0",
													padding: "8px",
													background: "#fafafa",
													borderRadius: "4px",
													fontSize: "13px",
												}}
											>
												<strong>Zmiany:</strong>
												{am.changes.map((change, idx) => (
													<div
														key={idx}
														style={{
															margin: "5px 0",
															paddingLeft: "10px",
															borderLeft: "2px solid #ddd",
														}}
													>
														<div>📌 Artykuł {change.articleId}</div>
														{change.before &&
															change.before !== "(nowy artykuł)" && (
																<div
																	style={{ color: "#c62828", fontSize: "12px" }}
																>
																	PRZED: {change.before.substring(0, 100)}...
																</div>
															)}
														{change.after && change.after !== "(usunięty)" && (
															<div
																style={{ color: "#2e7d32", fontSize: "12px" }}
															>
																PO: {change.after.substring(0, 100)}...
															</div>
														)}
														{change.before === "(nowy artykuł)" && (
															<div
																style={{ color: "#2e7d32", fontSize: "12px" }}
															>
																➕ NOWY: {change.after.substring(0, 100)}...
															</div>
														)}
														{change.after === "(usunięty)" && (
															<div
																style={{ color: "#c62828", fontSize: "12px" }}
															>
																🗑️ USUNIĘTO: {change.before.substring(0, 100)}
																...
															</div>
														)}
													</div>
												))}
											</div>
										)}

										{am.status === "withdrawn" && am.withdrawnReason && (
											<div
												style={{
													fontSize: "12px",
													color: "#666",
													fontStyle: "italic",
												}}
											>
												Powód: {am.withdrawnReason}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
