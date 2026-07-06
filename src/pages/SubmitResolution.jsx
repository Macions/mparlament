import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseDocx } from "../utils/docxParser";
import "./submitResolution.css";
import SuccessModal from "../components/SuccessModal";

export default function SubmitResolution() {
	const [file, setFile] = useState(null);
	const [fileName, setFileName] = useState("");
	const [parsed, setParsed] = useState(null);
	const [editedData, setEditedData] = useState(null);
	const [analyzed, setAnalyzed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [showSuccess, setShowSuccess] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const navigate = useNavigate();


	const handleFileChange = (e) => {
		const f = e.target.files[0];
		if (f && f.name.endsWith(".docx")) {
			setFile(f);
			setFileName(f.name);
			setError("");
			setParsed(null);
			setEditedData(null);
			setAnalyzed(false);
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
			setEditedData(JSON.parse(JSON.stringify(data))); // głęboka kopia
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


	const handleSubmit = () => {
		if (!editedData || submitting) return;

		setSubmitting(true);
		const bill = { ...editedData };
		localStorage.setItem("currentBill", JSON.stringify(bill));
		setShowSuccess(true);
	};

	return (
		<div className="submit-page">
			<div className="uchwaly-bar">
				<h1 className="uchwaly-title">ZŁÓŻ UCHWAŁĘ</h1>
				<div className="session-info">
					Posiedzenie: Warszawa
					<br />
					<span>20.05</span>
				</div>
			</div>

			<div className="submit-container">
				<div className="form-card">
					
					<div className="form-group">
						<label className="label">Nazwa uchwały</label>
						<input
							type="text"
							className="text-input"
							value={editedData?.title || ""}
							onChange={(e) => updateField(["title"], e.target.value)}
							placeholder="Wpisz nazwę uchwały..."
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
					</div>

					{error && <p className="error">{error}</p>}

					<button
						onClick={handleParse}
						disabled={!file || loading}
						className="parse-btn"
					>
						{loading
							? "Analizowanie..."
							: analyzed
								? "Przeanalizowano ✓"
								: "Analizuj ustawę"}
					</button>

					
					{editedData && (
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
						className="submit-btn"
						onClick={handleSubmit}
						disabled={!analyzed || submitting}
					>
						Złóż uchwałę
					</button>
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
