import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parseDocx } from "../../../utils/docxParser.js";
import "./FinalizeResolution.css";
import BackButton from "../../../components/PageBack";
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
	const [step, setStep] = useState(1);

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

	const fetchAmendmentsForResolution = async (resolutionId) => {
		setLoading(true);
		setError(null);
		try {
			console.log(` Pobieram poprawki dla uchwały ID: ${resolutionId}`);
			const response = await fetch(
				`/api/resolutions/${resolutionId}/amendments`,
			);
			console.log(" Odpowiedź z API:", response.status, response.statusText);

			if (!response.ok) throw new Error("Nie udało się pobrać poprawek");
			const data = await response.json();
			console.log(" Otrzymane dane poprawek:", data);
			console.log(" Liczba poprawek:", data.amendments?.length);

			setAmendments(data.amendments || []);

			if (selectedFile) {
				console.log(" Parsuję plik po pobraniu poprawek...");
				await parseAndMapFile(selectedFile);
			}
		} catch (err) {
			console.error(" Błąd pobierania poprawek:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const parseAndMapFile = async (file) => {
		try {
			console.log(" Rozpoczynam parsowanie pliku:", file.name);
			const parsed = await parseDocx(file);
			console.log(" Wynik parsowania (pełny):", parsed);
			console.log(" Struktura chapters:", parsed.chapters);
			console.log(" Liczba rozdziałów:", parsed.chapters?.length);

			setParsedContent(parsed);

			const map = {};
			let artCounter = 0;

			if (parsed.chapters && Array.isArray(parsed.chapters)) {
				console.log(" Znaleziono rozdziały:", parsed.chapters.length);
				parsed.chapters.forEach((chapter, chapterIndex) => {
					console.log(` Rozdział ${chapterIndex + 1}:`, chapter.title);
					console.log(
						` Liczba artykułów w rozdziale:`,
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
							console.log(` Artykuł ${artCounter}:`, map[key]);
						});
					}
				});
			} else {
				console.warn("️ Brak chapters w sparsowanym dokumencie!");
				console.log(" Struktura parsed:", Object.keys(parsed));
			}

			setArticleMap(map);
			console.log(" Zmapowane artykuły (łącznie):", map);
			console.log(" Znaleziono artykułów:", artCounter);
			return map;
		} catch (err) {
			console.error(" Błąd parsowania pliku:", err);
			setError("Błąd parsowania pliku: " + err.message);
			return null;
		}
	};

	const handleFileSelect = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

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
		await parseAndMapFile(file);
		setStep(2);
	};

	const handleSessionSelect = (sessionId) => {
		const session = sessions.find((s) => s.id === Number(sessionId));
		setSelectedSession(session);
		fetchResolutionsForSession(sessionId);
		setStep(3);
	};

	const handleResolutionSelect = async (resolutionId) => {
		const resolution = resolutions.find((r) => r.id === Number(resolutionId));
		setSelectedResolution(resolution);
		await fetchAmendmentsForResolution(resolutionId);
		setStep(4);
	};

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
			const data = {};
			acceptedAmendments.forEach((amendment) => {
				console.log(
					` Przetwarzam poprawkę ID: ${amendment.id}, status: ${amendment.status}`,
				);
				if (amendment.changes && Array.isArray(amendment.changes)) {
					amendment.changes.forEach((change) => {
						const key = `art_${change.articleId}`;
						console.log(
							`   ${key}: before=${change.before}, after=${change.after}`,
						);

						if (articleMap[key]) {
							if (change.after === "(usunięty)") {
								console.log(`   ️ USUNIĘCIE: ${key}`);
								data[key] = "(usunięty)";
							} else if (
								change.before === null ||
								change.before === undefined ||
								change.before === "(nowy artykuł)"
							) {
								console.log(`    NOWY ARTYKUŁ: ${key} -> ${change.after}`);
								data[key] = `NEW_ARTICLE: ${change.after}`;
							} else {
								console.log(`   ️ PODMIANA: ${key} -> ${change.after}`);
								data[key] = change.after || "";
							}
						} else {
							console.log(`   ️ ${key} nie znaleziony w mapie artykułów`);
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

			console.log(" Dane do podmiany:", data);
			console.log(" Mapa artykułów:", articleMap);

			const buffer = await generateDocxWithTags(selectedFile, data);
			const fileName = `${selectedResolution.slug || "uchwala"}-final-${Date.now()}.docx`;
			downloadDocx(buffer, fileName);

			setSuccess(
				` Wygenerowano uchwałę! Zastosowano ${acceptedAmendments.length} poprawek.`,
			);
		} catch (err) {
			setError("Błąd generowania: " + err.message);
		} finally {
			setGenerating(false);
		}
	};

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
		const fileInput = document.getElementById("fileInput");
		if (fileInput) fileInput.value = "";
	};

	const handleBack = () => {
		navigate("/panel");
	};

	const stats = {
		total: amendments.length,
		accepted: amendments.filter((a) => a.status === "accepted").length,
		rejected: amendments.filter((a) => a.status === "rejected").length,
		pending: amendments.filter((a) => a.status === "pending").length,
		withdrawn: amendments.filter((a) => a.status === "withdrawn").length,
	};

	const getStepText = () => {
		switch (step) {
			case 1:
				return "Wybierz plik DOCX";
			case 2:
				return "Wybierz posiedzenie";
			case 3:
				return "Wybierz uchwałę";
			case 4:
				return "Podgląd i generowanie";
			default:
				return "";
		}
	};

	return (
		<div className="finalize-resolution-page">
			<BackButton
				to="/panel"
				label="Panel"
			/>
			{/* Nagłówek */}
			<div className="finalize-header">
				<h1> Finalizowanie uchwały</h1>
				<p className="step-indicator">
					Krok {step} z 4: {getStepText()}
				</p>
			</div>

			{/* Komunikaty */}
			{error && (
				<div className="alert alert-error">
					{error}
					<button onClick={() => setError(null)} className="alert-close">
						✕
					</button>
				</div>
			)}
			{success && (
				<div className="alert alert-success">
					{success}
					<button onClick={() => setSuccess(null)} className="alert-close">
						✕
					</button>
				</div>
			)}

			{/* Krok 1: Wybór pliku */}
			{step === 1 && (
				<div className="upload-area">
					<h2> Wybierz plik uchwały</h2>
					<p>Wybierz plik DOCX uchwały, którą chcesz wygenerować po poprawkach</p>
					<input
						id="fileInput"
						type="file"
						accept=".docx"
						onChange={handleFileSelect}
						className={`file-input-finalize ${selectedFile ? 'file-selected' : ''}`}
					/>
					{selectedFile && (
						<div className="file-info">
							Wybrano: {selectedFile.name} (
							{(selectedFile.size / 1024).toFixed(2)} KB)
						</div>
					)}
					{selectedFile && parsedContent && (
						<div className="articles-preview">
							<h4> Znalezione artykuły:</h4>
							{Object.values(articleMap).map((art) => (
								<div key={art.articleId} className="article-item">
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
				<div className="selection-step">
					<h2>️ Wybierz posiedzenie</h2>
					<div className="selection-grid">
						{sessions.map((session) => (
							<button
								key={session.id}
								onClick={() => handleSessionSelect(session.id)}
								className={`selection-card ${selectedSession?.id === session.id ? "active" : ""
									}`}
							>
								<strong>{session.name || `Posiedzenie nr ${session.number}`}</strong>
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
				<div className="selection-step">
					<h2> Wybierz uchwałę</h2>
					{loading && <p className="loading-text">Ładowanie uchwał...</p>}
					{resolutions.length === 0 && !loading && (
						<p className="empty-text">Brak uchwał dla tego posiedzenia</p>
					)}
					<div className="selection-grid">
						{resolutions.map((res) => (
							<button
								key={res.id}
								onClick={() => handleResolutionSelect(res.id)}
								className={`selection-card ${selectedResolution?.id === res.id ? "active" : ""
									}`}
							>
								<strong>{res.title}</strong>
								<br />
								<small>
									Status: {
										{
											accepted: "Zaakceptowana",
											rejected: "Odrzucona",
											pending: "Oczekuje na głosowanie"
										}[res.status] || res.status
									} | Autor: {res.author}
								</small>
							</button>
						))}
					</div>
					<button onClick={() => setStep(2)} className="back-btn-finalize">
						<span>←</span>Wróć do wyboru posiedzenia
					</button>
				</div>
			)}

			{/* Krok 4: Podgląd i generowanie */}
			{step === 4 && (
				<div className="finalize-layout">
					{/* Lewa kolumna - informacje */}
					<div className="summary-panel">
						<h3> Podsumowanie</h3>
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
							<strong>Znalezione artykuły:</strong>{" "}
							{Object.keys(articleMap).length}
						</p>

						<hr />

						<h4> Statystyki poprawek</h4>
						<div className="summary-stats">
							<span className="stat-badge accepted">
								Przyjęte: {stats.accepted}
							</span>
							<span className="stat-badge rejected">
								Odrzucone: {stats.rejected}
							</span>
							<span className="stat-badge pending">
								Oczekujące: {stats.pending}
							</span>
							{stats.withdrawn > 0 && (
								<span className="stat-badge withdrawn">
									️ Wycofane: {stats.withdrawn}
								</span>
							)}
						</div>

						<button
							onClick={handleGenerate}
							disabled={generating || stats.accepted === 0}
							className="generate-btn"
						>
							{generating
								? " Generowanie..."
								: " Generuj końcową uchwałę"}
						</button>

						{stats.accepted === 0 && (
							<p className="warning-text">
								️ Brak przyjętych poprawek do zastosowania
							</p>
						)}

						<button onClick={handleReset} className="reset-btn">
							Rozpocznij od nowa
						</button>
					</div>

					{/* Prawa kolumna - lista poprawek */}
					<div className="amendments-panel">
						<h3> Poprawki do uchwały ({amendments.length})</h3>

						{amendments.length === 0 && (
							<p className="empty-text">Brak poprawek dla tej uchwały</p>
						)}

						<div className="amendments-list">
							{amendments.map((am) => (
								<div
									key={am.id}
									className={`amendment-card ${am.status}`}
								>
									<div className="amendment-header">
										<strong>{am.author}</strong>
										<span
											className={`amendment-status ${am.status}`}
										>
											{am.status === "accepted"
												? " Przyjęta"
												: am.status === "rejected"
													? " Odrzucona"
													: am.status === "withdrawn"
														? "️ Wycofana"
														: " Oczekująca"}
										</span>
									</div>
									<p className="amendment-content">{am.content}</p>

									{am.changes && am.changes.length > 0 && (
										<div className="changes-list">
											<strong>Zmiany:</strong>
											{am.changes.map((change, idx) => (
												<div key={idx} className="change-item">
													<div> Artykuł {change.articleId}</div>
													{change.before &&
														change.before !== "(nowy artykuł)" && (
															<div className="change-before">
																PRZED: {change.before.substring(0, 100)}...
															</div>
														)}
													{change.after && change.after !== "(usunięty)" && (
														<div className="change-after">
															PO: {change.after.substring(0, 100)}...
														</div>
													)}
													{change.before === "(nowy artykuł)" && (
														<div className="change-new">
															NOWY: {change.after.substring(0, 100)}...
														</div>
													)}
													{change.after === "(usunięty)" && (
														<div className="change-deleted">
															️ USUNIĘTO: {change.before.substring(0, 100)}...
														</div>
													)}
												</div>
											))}
										</div>
									)}

									{am.status === "withdrawn" && am.withdrawnReason && (
										<div className="withdrawn-reason">
											Powód: {am.withdrawnReason}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}