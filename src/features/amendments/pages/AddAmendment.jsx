import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Plus, ArrowLeft, AlertTriangle, CheckCircle, Info } from "lucide-react";
import "./AddAmendment.css";

export default function AddAmendment() {
	const { slug } = useParams();
	const navigate = useNavigate();

	const [resolution, setResolution] = useState(null);
	const [resolutionData, setResolutionData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const [changes, setChanges] = useState([
		{ id: Date.now(), articleId: "", type: "", to: "" }
	]);

	const [currentUser, setCurrentUser] = useState(null);
	const [existingAmendments, setExistingAmendments] = useState([]);
	const [conflicts, setConflicts] = useState([]);
	const [showConflicts, setShowConflicts] = useState(false);
	const [blockingConflicts, setBlockingConflicts] = useState([]);

	const [target, setTarget] = useState({
		article: "",
		section: "other",
		fragment: "", // Teraz będzie automatycznie wypełniane
	});

	const CHANGE_TYPES = [
		{ value: "modify", label: "Zmiana treści" },
		{ value: "add", label: "Dodanie nowego artykułu" },
		{ value: "delete", label: "Usunięcie artykułu" },
	];

	// ============================================
	// POBIERANIE DANYCH
	// ============================================
	useEffect(() => {
		const fetchData = async () => {
			try {
				const [resRes, amdRes, userRes] = await Promise.all([
					fetch(`/api/resolutions/${slug}`),
					fetch(`/api/resolutions/${slug}/amendments`),
					fetch("/api/current-user")
				]);

				if (!resRes.ok) throw new Error("Nie znaleziono uchwały");
				if (!userRes.ok) throw new Error("Nie znaleziono użytkownika");

				const resolutionData = await resRes.json();
				const amendmentsData = await amdRes.json();
				const userData = await userRes.json();

				let amendmentsList = [];
				if (Array.isArray(amendmentsData)) {
					amendmentsList = amendmentsData;
				} else if (amendmentsData && typeof amendmentsData === 'object') {
					if (Array.isArray(amendmentsData.amendments)) {
						amendmentsList = amendmentsData.amendments;
					} else if (Array.isArray(amendmentsData.data)) {
						amendmentsList = amendmentsData.data;
					} else {
						amendmentsList = [amendmentsData].filter(Boolean);
					}
				}

				setResolution(resolutionData.resolution || resolutionData);
				setResolutionData(resolutionData);

				const activeAmendments = amendmentsList.filter(a =>
					a && (a.status === 'pending' || a.status === 'accepted')
				);
				setExistingAmendments(activeAmendments);
				setCurrentUser(userData);
				setError(null);

			} catch (err) {
				console.error('Błąd:', err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [slug]);

	const getAllArticles = () => {
		if (!resolution) return [];
		if (resolution.articles) return resolution.articles;
		if (resolution.chapters) {
			return resolution.chapters.flatMap(ch => ch.articles || []);
		}
		return [];
	};

	const allArticles = getAllArticles();

	// ============================================
	// AUTOMATYCZNE UZUPEŁNIANIE FRAGMENTU
	// ============================================
	const handleArticleChange = (articleId) => {
		const article = allArticles.find(a => String(a.id) === String(articleId));

		if (article) {
			// Automatycznie ustaw fragment na treść artykułu
			setTarget({
				...target,
				article: articleId,
				fragment: article.content || ""
			});
		} else {
			setTarget({
				...target,
				article: articleId,
				fragment: ""
			});
		}
	};

	// ============================================
	// POMOCNICZA FUNKCJA DO OBLICZANIA PODOBIEŃSTWA
	// ============================================
	const calculateSimilarity = (str1, str2) => {
		if (!str1 || !str2) return 0;
		const s1 = str1.toLowerCase().trim();
		const s2 = str2.toLowerCase().trim();

		const words1 = s1.split(/\s+/).filter(w => w.length > 3);
		const words2 = s2.split(/\s+/).filter(w => w.length > 3);

		if (words1.length === 0 || words2.length === 0) return 0;

		const common = words1.filter(w => words2.includes(w));
		const maxLength = Math.max(words1.length, words2.length);

		return common.length / maxLength;
	};

	// ============================================
	// FUNKCJA SPRAWDZANIA KONFLIKTÓW
	// ============================================
	const checkConflicts = (newChanges, targetArticle, targetFragment) => {
		const conflictsList = [];
		const blockingList = [];

		// 1. Sprawdź czy są poprawki dla wybranego artykułu
		const existingForArticle = existingAmendments.filter(
			a => a?.target?.article === Number(targetArticle) &&
				(a.status === 'pending' || a.status === 'accepted')
		);

		if (existingForArticle.length > 0) {
			existingForArticle.forEach(existing => {
				newChanges.forEach(newChange => {
					// KONFLIKT: Dodanie vs Usunięcie
					if (newChange.type === 'add' && existing.changes?.some(ec => ec.type === 'delete')) {
						const deletedArticleId = existing.changes.find(ec => ec.type === 'delete')?.articleId;
						if (deletedArticleId) {
							blockingList.push({
								level: 'blocking',
								type: 'add_delete_conflict',
								message: `❌ Nie możesz dodać nowego artykułu - w poprawce #${existing.id} (${existing.author}) artykuł został usunięty`,
								amendment: existing
							});
						}
					}

					// KONFLIKT: Usunięcie vs Dodanie
					if (newChange.type === 'delete' && existing.changes?.some(ec => ec.type === 'add')) {
						blockingList.push({
							level: 'blocking',
							type: 'delete_add_conflict',
							message: `❌ Nie możesz usunąć tego artykułu - w poprawce #${existing.id} (${existing.author}) został on dodany`,
							amendment: existing
						});
					}

					// KONFLIKT: Modyfikacja vs Usunięcie
					if (newChange.type === 'modify' && existing.changes?.some(ec => ec.type === 'delete' && ec.articleId === newChange.articleId)) {
						blockingList.push({
							level: 'blocking',
							type: 'modify_delete_conflict',
							message: `❌ Nie możesz modyfikować tego artykułu - w poprawce #${existing.id} (${existing.author}) został on usunięty`,
							amendment: existing
						});
					}

					// KONFLIKT: Usunięcie vs Modyfikacja
					if (newChange.type === 'delete' && existing.changes?.some(ec => ec.type === 'modify' && ec.articleId === newChange.articleId)) {
						blockingList.push({
							level: 'blocking',
							type: 'delete_modify_conflict',
							message: `❌ Nie możesz usunąć tego artykułu - w poprawce #${existing.id} (${existing.author}) jest on modyfikowany`,
							amendment: existing
						});
					}

					// KONFLIKT: Modyfikacja vs Modyfikacja tego samego fragmentu
					if (newChange.type === 'modify' && existing.changes?.some(ec => ec.type === 'modify')) {
						const existingModify = existing.changes.find(ec => ec.type === 'modify');
						if (existingModify && targetFragment && targetFragment.length > 10) {
							const similarity = calculateSimilarity(
								targetFragment,
								existing.target?.fragment || existingModify.before || ''
							);
							if (similarity > 0.5) {
								blockingList.push({
									level: 'blocking',
									type: 'modify_modify_conflict',
									message: `❌ Ten sam fragment jest już modyfikowany w poprawce #${existing.id} (${existing.author})`,
									amendment: existing,
									similarity: Math.round(similarity * 100)
								});
							}
						}
					}
				});
			});

			// OSTRZEŻENIA: Istnieją inne poprawki
			if (blockingList.length === 0) {
				conflictsList.push({
					level: 'warning',
					type: 'existing_amendments',
					message: `ℹ️ Istnieją już ${existingForArticle.length} inne poprawki dla tego artykułu - sprawdź czy nie ma konfliktów`,
					amendments: existingForArticle
				});
			}
		}

		// 2. Sprzeczności wewnątrz poprawki
		const hasAdd = newChanges.some(c => c.type === 'add');
		const hasDelete = newChanges.some(c => c.type === 'delete');
		const hasModify = newChanges.some(c => c.type === 'modify');

		if (hasAdd && hasDelete) {
			blockingList.push({
				level: 'blocking',
				type: 'internal_add_delete_conflict',
				message: '❌ Nie możesz jednocześnie dodawać i usuwać artykułów w tej samej poprawce'
			});
		}

		if (hasDelete && hasModify) {
			conflictsList.push({
				level: 'warning',
				type: 'delete_modify_warning',
				message: '⚠️ Usuwasz jeden artykuł i modyfikujesz inny - czy to zamierzone?'
			});
		}

		// 3. Sprawdź czy dodawany artykuł już istnieje
		if (hasAdd) {
			const newArticleContent = newChanges.find(c => c.type === 'add')?.to || '';
			const similarArticles = allArticles.filter(a =>
				a.content &&
				newArticleContent.length > 20 &&
				a.content.includes(newArticleContent.substring(0, 30))
			);
			if (similarArticles.length > 0) {
				conflictsList.push({
					level: 'warning',
					type: 'similar_article',
					message: `⚠️ Nowy artykuł jest podobny do istniejącego artykułu ${similarArticles[0].number || ''}`,
					article: similarArticles[0]
				});
			}
		}

		// 4. Sprawdź czy usuwany artykuł jest używany w innych poprawkach
		if (hasDelete) {
			const deletedArticleId = newChanges.find(c => c.type === 'delete')?.articleId;
			if (deletedArticleId) {
				const amendmentsUsingArticle = existingAmendments.filter(a =>
					a.changes?.some(c => c.articleId === deletedArticleId) &&
					a.status === 'pending'
				);
				if (amendmentsUsingArticle.length > 0) {
					blockingList.push({
						level: 'blocking',
						type: 'delete_used_article',
						message: `❌ Ten artykuł jest używany w ${amendmentsUsingArticle.length} innych poprawkach - nie można go usunąć`,
						amendments: amendmentsUsingArticle
					});
				}
			}
		}

		return { conflicts: conflictsList, blocking: blockingList };
	};

	// ============================================
	// AUTOMATYCZNE SPRAWDZANIE KONFLIKTÓW
	// ============================================
	useEffect(() => {
		if (target.article) {
			const validChanges = changes.filter(c =>
				c.type && (c.to || c.type === 'delete')
			);
			const result = checkConflicts(
				validChanges,
				target.article,
				target.fragment
			);
			setConflicts(result.conflicts);
			setBlockingConflicts(result.blocking);
			setShowConflicts(result.conflicts.length > 0 || result.blocking.length > 0);
		} else {
			setConflicts([]);
			setBlockingConflicts([]);
			setShowConflicts(false);
		}
	}, [target.article, target.fragment, changes, existingAmendments]);

	if (loading) {
		return <div className="loading">Ładowanie...</div>;
	}

	if (error || !resolution) {
		return <div className="not-found">Nie znaleziono uchwały: {slug}</div>;
	}

	const handleChangeUpdate = (changeId, field, value) => {
		setChanges((prev) =>
			prev.map((c) => (c.id === changeId ? { ...c, [field]: value } : c))
		);
	};

	const handleArticleSelect = (changeId, articleId) => {
		const article = allArticles.find((a) => String(a.id) === String(articleId));
		setChanges((prev) =>
			prev.map((c) =>
				c.id === changeId
					? {
						...c,
						articleId,
						from: article ? article.content : "",
						to: c.type === "modify" ? article?.content || "" : c.to
					}
					: c
			)
		);
	};

	const handleTypeChange = (changeId, type) => {
		setChanges((prev) =>
			prev.map((c) =>
				c.id === changeId
					? {
						...c,
						type,
						to: "",
						articleId: type === "add" ? "new" : "",
						from: "",
					}
					: c
			)
		);
	};

	const addNewChange = () => {
		setChanges((prev) => [
			...prev,
			{ id: Date.now() + Math.random(), articleId: "", type: "", to: "", from: "" },
		]);
	};

	const removeChange = (changeId) => {
		if (changes.length <= 1) return;
		setChanges((prev) => prev.filter((c) => c.id !== changeId));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		const validChanges = changes.filter((c) => {
			if (!c.type) return false;
			if (c.type === "add") return c.to.trim();
			if (c.type === "delete") return c.articleId && c.articleId !== "new";
			if (c.type === "modify") return c.articleId && c.articleId !== "new" && c.to.trim();
			return false;
		});

		if (validChanges.length === 0) {
			alert("Dodaj przynajmniej jedną kompletną zmianę.");
			return;
		}

		if (!target.article) {
			alert("Wybierz artykuł, którego dotyczy zmiana.");
			return;
		}

		// Sprawdź konflikty
		const result = checkConflicts(validChanges, target.article, target.fragment);

		if (result.blocking.length > 0) {
			const blockingMessages = result.blocking
				.map(b => `• ${b.message}`)
				.join('\n');

			alert(
				`🚫 NIE MOŻNA DODAĆ POPRAWKI - wykryto blokujące konflikty:\n\n${blockingMessages}\n\n` +
				`Rozwiąż konflikty przed dodaniem poprawki.`
			);
			return;
		}

		if (result.conflicts.length > 0) {
			const warningMessages = result.conflicts
				.filter(c => c.level === 'warning')
				.map(c => `• ${c.message}`)
				.join('\n');

			const confirmSubmit = window.confirm(
				`⚠️ Wykryto ostrzeżenia:\n\n${warningMessages}\n\n` +
				`Czy na pewno chcesz dodać tę poprawkę?`
			);
			if (!confirmSubmit) return;
		}

		setSubmitting(true);

		try {
			const amendmentData = {
				resolutionId: resolution.id,
				author: currentUser.name,
				authorId: currentUser.id,
				club: currentUser.club || "Niezrzeszony",
				content: validChanges.map(c => {
					if (c.type === "add") return `Dodanie nowego artykułu: ${c.to}`;
					if (c.type === "delete") return `Usunięcie artykułu`;
					return `Zmiana treści artykułu: ${c.to}`;
				}).join("; "),
				status: "pending",
				target: {
					article: target.article ? Number(target.article) : null,
					section: target.section || "other",
					fragment: target.fragment || validChanges[0]?.from || null,
				},
				changes: validChanges.map((c) => ({
					articleId: c.type === "add" ? `new_${Date.now()}` : c.articleId,
					type: c.type,
					before: c.from || "",
					after: c.type === "delete" ? "" : c.to,
				})),
				withdrawnReason: null,
			};

			const response = await fetch(`/api/resolutions/${slug}/amendments`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(amendmentData),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Nie udało się dodać poprawki");
			}

			navigate(`/${slug}/poprawki`);
		} catch (err) {
			setError(err.message);
			setSubmitting(false);
		}
	};

	const getConflictIcon = (level) => {
		switch (level) {
			case 'blocking': return <AlertTriangle size={18} color="#dc2626" />;
			case 'conflict': return <AlertTriangle size={18} color="#dc2626" />;
			case 'warning': return <Info size={18} color="#f59e0b" />;
			default: return <Info size={18} color="#3b82f6" />;
		}
	};

	const getConflictClass = (level) => {
		switch (level) {
			case 'blocking': return 'conflict-item--blocking';
			case 'conflict': return 'conflict-item--conflict';
			case 'warning': return 'conflict-item--warning';
			default: return 'conflict-item--info';
		}
	};

	return (
		<div className="add-amendment">
			<div className="uchwaly-bar">
				<Link to={`/${slug}/poprawki`} className="uchwaly-title">
					<ArrowLeft size={24} />
					WRÓĆ
				</Link>
				<div className="session-info">
					Posiedzenie: Warszawa
					<br />
					<span>20.05</span>
				</div>
			</div>

			<div className="main-content">
				<h1 className="page-title">Dodaj poprawkę</h1>
				<p className="page-subtitle">{resolution.title}</p>

				{currentUser && (
					<div className="author-badge">
						{currentUser.name} – {currentUser.club || "Niezrzeszony"}
					</div>
				)}

				{error && <div className="error-message">{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className="form-section">
						<h3>Cel zmiany</h3>
						<p className="field-hint">Określ czego dotyczy Twoja poprawka - pomoże to w wykrywaniu konfliktów</p>

						<div className="form-group">
							<label>Artykuł/paragraf</label>
							<select
								value={target.article}
								onChange={(e) => handleArticleChange(e.target.value)}
								className="form-select"
								required
							>
								<option value="">-- wybierz artykuł --</option>
								{allArticles.map((art, idx) => {
									const hasAmendments = existingAmendments.some(
										a => a?.target?.article === Number(art.id) &&
											(a.status === 'pending' || a.status === 'accepted')
									);
									return (
										<option key={art.id || idx} value={art.id}>
											{art.number || `Art. ${idx + 1}`}: {art.content?.substring(0, 40)}...
											{hasAmendments ? ' ⚠️' : ''}
										</option>
									);
								})}
							</select>
						</div>

						<div className="form-group">
							<label>Obszar zmiany</label>
							<select
								value={target.section}
								onChange={(e) => setTarget({ ...target, section: e.target.value })}
								className="form-select"
							>
								<option value="other">Inne</option>
								<option value="budget">Budżet / Finanse</option>
								<option value="deadline">Termin / Data</option>
								<option value="people">Ludzie / Członkowie</option>
								<option value="procedure">Procedura</option>
							</select>
						</div>

						{/* ============================================
							UKRYTE POLE - automatycznie wypełniane
						    ============================================ */}
						{target.fragment && (
							<div className="form-group" style={{ display: 'none' }}>
								<label>Fragment który zmieniasz (automatycznie)</label>
								<textarea
									value={target.fragment}
									readOnly
									className="form-textarea"
									rows={2}
									style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
								/>
							</div>
						)}

						{/* Informacja o automatycznym pobraniu fragmentu */}
						{target.article && target.fragment && (
							<div className="form-group">
								<small className="field-hint" style={{ color: '#059669' }}>
									✅ Automatycznie pobrano fragment do porównania
								</small>
							</div>
						)}

						{/* Sekcja konfliktów */}
						{showConflicts && (conflicts.length > 0 || blockingConflicts.length > 0) && (
							<div className="conflicts-section">
								{blockingConflicts.length > 0 && (
									<>
										<h4 className="conflicts-title conflicts-title--blocking">
											<AlertTriangle size={20} />
											🚫 BLOKUJĄCE KONFLIKTY - {blockingConflicts.length}
										</h4>
										<div className="conflicts-list">
											{blockingConflicts.map((conflict, index) => (
												<div
													key={`blocking-${index}`}
													className={`conflict-item ${getConflictClass(conflict.level)}`}
												>
													<div className="conflict-item-icon">
														{getConflictIcon(conflict.level)}
													</div>
													<div className="conflict-item-content">
														<p className="conflict-item-message">{conflict.message}</p>
														{conflict.amendment && (
															<div className="conflict-item-amendments">
																<span className="amendment-tag amendment-tag--blocking">
																	Poprawka #{conflict.amendment.id} - {conflict.amendment.author}
																</span>
															</div>
														)}
														{conflict.amendments && conflict.amendments.length > 0 && (
															<div className="conflict-item-amendments">
																{conflict.amendments.map(amd => (
																	<span key={amd.id} className="amendment-tag amendment-tag--blocking">
																		#{amd.id} {amd.author}
																	</span>
																))}
															</div>
														)}
														{conflict.similarity && (
															<div className="conflict-item-similarity">
																Podobieństwo: {conflict.similarity}%
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</>
								)}

								{conflicts.length > 0 && (
									<>
										<h4 className="conflicts-title">
											<Info size={20} />
											Ostrzeżenia - {conflicts.length}
										</h4>
										<div className="conflicts-list">
											{conflicts.map((conflict, index) => (
												<div
													key={`warning-${index}`}
													className={`conflict-item ${getConflictClass(conflict.level)}`}
												>
													<div className="conflict-item-icon">
														{getConflictIcon(conflict.level)}
													</div>
													<div className="conflict-item-content">
														<p className="conflict-item-message">{conflict.message}</p>
														{conflict.amendments && (
															<div className="conflict-item-amendments">
																{conflict.amendments.map(amd => (
																	<span key={amd.id} className="amendment-tag">
																		#{amd.id} {amd.author} ({amd.status})
																	</span>
																))}
															</div>
														)}
														{conflict.article && (
															<div className="conflict-item-article">
																Artykuł: {conflict.article.number || ''}
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</>
								)}

								<p className="conflicts-note">
									{blockingConflicts.length > 0 ? (
										<span style={{ color: '#dc2626', fontWeight: 'bold' }}>
											🚫 Wykryto blokujące konflikty - NIE MOŻNA dodać poprawki do czasu ich rozwiązania
										</span>
									) : (
										<span style={{ color: '#f59e0b' }}>
											ℹ️ To są tylko ostrzeżenia - możesz kontynuować
										</span>
									)}
								</p>
							</div>
						)}
					</div>

					<div className="changes-section">
						<div className="changes-header">
							<h2>Zmiany w artykułach</h2>
							<button
								type="button"
								onClick={addNewChange}
								className="add-change-btn"
							>
								<Plus size={16} /> Dodaj kolejną zmianę
							</button>
						</div>

						{changes.map((change, index) => (
							<div key={change.id} className="change-card">
								<div className="change-card-header">
									<span>Zmiana {index + 1}</span>
									{changes.length > 1 && (
										<button
											type="button"
											onClick={() => removeChange(change.id)}
											className="remove-change-btn"
										>
											<X size={16} />
										</button>
									)}
								</div>

								<div className="form-group">
									<label>Rodzaj zmiany</label>
									<div className="change-types">
										{CHANGE_TYPES.map((ct) => (
											<button
												key={ct.value}
												type="button"
												className={`type-btn ${change.type === ct.value ? "active" : ""}`}
												onClick={() => handleTypeChange(change.id, ct.value)}
											>
												{ct.label}
											</button>
										))}
									</div>
								</div>

								{(change.type === "modify" || change.type === "delete") && (
									<div className="form-group">
										<label>Wybierz artykuł</label>
										<select
											value={change.articleId}
											onChange={(e) =>
												handleArticleSelect(change.id, e.target.value)
											}
											className="form-select"
										>
											<option value="">-- wybierz artykuł --</option>
											{allArticles.map((art, idx) => (
												<option key={art.id || idx} value={art.id}>
													{art.number || `Art. ${idx + 1}`}: {art.content?.substring(0, 50)}...
												</option>
											))}
										</select>
									</div>
								)}

								{(change.type === "modify" || change.type === "add") && (
									<div className="form-group">
										<label>
											{change.type === "add"
												? "Treść nowego artykułu"
												: "Nowa treść artykułu"}
										</label>
										<textarea
											value={change.to}
											onChange={(e) =>
												handleChangeUpdate(change.id, "to", e.target.value)
											}
											placeholder={
												change.type === "add"
													? "np. Art. 1a: Wprowadza się nowy przepis..."
													: "Wpisz nową treść artykułu..."
											}
											className="form-textarea"
											rows={4}
										/>
									</div>
								)}

								{change.type === "delete" && change.articleId && (
									<div className="delete-info">
										Ten artykuł zostanie <strong>usunięty</strong> z uchwały.
									</div>
								)}
							</div>
						))}
					</div>

					<div className="form-actions">
						<button
							type="submit"
							className={`submit-btn ${blockingConflicts.length > 0 ? 'has-blocking-conflicts' : ''} ${conflicts.length > 0 ? 'has-warnings' : ''}`}
							disabled={submitting || blockingConflicts.length > 0}
						>
							{blockingConflicts.length > 0 ? "🚫 Rozwiąż konflikty przed dodaniem" :
								submitting ? "Dodawanie..." : "Dodaj poprawkę"}
							{conflicts.length > 0 && !blockingConflicts.length > 0 && " ⚠️"}
						</button>
						<Link to={`/${slug}/poprawki`} className="cancel-btn">
							Anuluj
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}