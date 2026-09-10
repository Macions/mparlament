import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Modal from "../../../components/Modal";
import Toast from "../../../components/Toast";
import {
	X,
	Plus,
	ArrowLeft,
	AlertTriangle,
	Info,
	Search,
	ShieldAlert,
	Trash2,
	FileWarning,
} from "lucide-react";
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
		{ id: Date.now(), articleId: "", type: "", to: "" },
	]);

	const [currentUser, setCurrentUser] = useState(null);
	const [existingAmendments, setExistingAmendments] = useState([]);
	const [conflicts, setConflicts] = useState([]);
	const [showConflicts, setShowConflicts] = useState(false);
	const [blockingConflicts, setBlockingConflicts] = useState([]);
	const [toast, setToast] = useState(null);
	const [confirmModal, setConfirmModal] = useState(null);
	const [hasCheckedConflicts, setHasCheckedConflicts] = useState(false);

	const [target, setTarget] = useState({
		article: "",
		section: "other",
		fragment: "",
	});

	const CHANGE_TYPES = [
		{ value: "modify", label: "Zmiana treści" },
		{ value: "add", label: "Dodanie nowego artykułu" },
		{ value: "delete", label: "Usunięcie artykułu" },
	];

	const showToast = (type, title, message) => {
		setToast({ type, title, message });
	};

	const closeToast = () => setToast(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [resRes, amdRes, userRes] = await Promise.all([
					fetch(`/api/resolutions/${slug}`),
					fetch(`/api/resolutions/${slug}/amendments`),
					fetch("/api/current-user"),
				]);

				if (!resRes.ok) throw new Error("Nie znaleziono uchwały");
				if (!userRes.ok) throw new Error("Nie znaleziono użytkownika");

				const resolutionData = await resRes.json();
				const amendmentsData = await amdRes.json();
				const userData = await userRes.json();

				let amendmentsList = [];
				if (Array.isArray(amendmentsData)) {
					amendmentsList = amendmentsData;
				} else if (amendmentsData && typeof amendmentsData === "object") {
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

				const activeAmendments = amendmentsList.filter(
					(a) => a && (a.status === "pending" || a.status === "accepted"),
				);
				setExistingAmendments(activeAmendments);
				setCurrentUser(userData);
				setError(null);
			} catch (err) {
				console.error("Błąd:", err);
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
			return resolution.chapters.flatMap((ch) => ch.articles || []);
		}
		return [];
	};

	const allArticles = getAllArticles();

	const handleArticleChange = (articleId) => {
		const article = allArticles.find((a) => String(a.id) === String(articleId));

		if (article) {
			setTarget({
				...target,
				article: articleId,
				fragment: article.content || "",
			});
		} else {
			setTarget({
				...target,
				article: articleId,
				fragment: "",
			});
		}
		setHasCheckedConflicts(false);
	};

	const calculateSimilarity = (str1, str2) => {
		if (!str1 || !str2) return 0;
		const s1 = str1.toLowerCase().trim();
		const s2 = str2.toLowerCase().trim();

		const words1 = s1.split(/\s+/).filter((w) => w.length > 3);
		const words2 = s2.split(/\s+/).filter((w) => w.length > 3);

		if (words1.length === 0 || words2.length === 0) return 0;

		const common = words1.filter((w) => words2.includes(w));
		const maxLength = Math.max(words1.length, words2.length);

		return common.length / maxLength;
	};

	const extractNumbers = (text) => {
		if (!text) return [];
		const matches = text.match(/\d+([.,]\d+)?/g);
		return matches ? matches.map((m) => parseFloat(m.replace(",", "."))) : [];
	};

	const checkConflicts = (newChanges, targetArticle, targetFragment) => {
		const conflictsList = [];
		const blockingList = [];

		existingAmendments.forEach((existing) => {
			const sameAuthor = existing.authorId === currentUser?.id;
			const existingContent = existing.content || "";
			const newContent = newChanges
				.map((c) => {
					if (c.type === "add") return `Dodanie nowego artykułu: ${c.to}`;
					if (c.type === "delete") return `Usunięcie artykułu`;
					return `Zmiana treści artykułu: ${c.to}`;
				})
				.join("; ");

			if (existingContent === newContent) {
				if (sameAuthor) {
					blockingList.push({
						level: "blocking",
						type: "duplicate_own",
						message: `Identyczna poprawka została już przez Ciebie zgłoszona (Poprawka #${existing.id})`,
						amendment: existing,
					});
				} else {
					blockingList.push({
						level: "blocking",
						type: "duplicate_other",
						message: `Identyczna poprawka została już zgłoszona przez ${existing.author} (Poprawka #${existing.id})`,
						amendment: existing,
					});
				}
			}

			if (existing.changes && newChanges) {
				existing.changes.forEach((existingChange) => {
					if (existingChange.type !== "modify") return;
					newChanges.forEach((newChange) => {
						if (newChange.type !== "modify") return;
						if (existingChange.articleId !== newChange.articleId) return;

						const existingBefore = extractNumbers(existingChange.before);
						const existingAfter = extractNumbers(existingChange.after);
						const newBefore = extractNumbers(newChange.from);
						const newAfter = extractNumbers(newChange.to);

						const commonSource = existingBefore.filter((n) =>
							newBefore.includes(n),
						);

						if (commonSource.length > 0) {
							const existingTarget = existingAfter.filter(
								(n) => !existingBefore.includes(n),
							);
							const newTarget = newAfter.filter((n) => !newBefore.includes(n));

							if (existingTarget.length > 0 && newTarget.length > 0) {
								const conflict = existingTarget.some((v1) =>
									newTarget.every((v2) => v1 !== v2),
								);
								if (conflict) {
									blockingList.push({
										level: "blocking",
										type: "conflicting_numbers",
										message: `Sprzeczne wartości: ${commonSource.join(", ")} → ${existingTarget.join(", ")} (Poprawka #${existing.id}) vs ${newTarget.join(", ")} (Twoja poprawka)`,
										amendment: existing,
									});
								}
							}
						}
					});
				});
			}
		});

		const existingForArticle = existingAmendments.filter(
			(a) =>
				a?.target?.article === Number(targetArticle) &&
				(a.status === "pending" || a.status === "accepted"),
		);

		if (existingForArticle.length > 0) {
			existingForArticle.forEach((existing) => {
				newChanges.forEach((newChange) => {
					if (
						newChange.type === "add" &&
						existing.changes?.some((ec) => ec.type === "delete")
					) {
						blockingList.push({
							level: "blocking",
							type: "add_delete_conflict",
							message: `Nie możesz dodać nowego artykułu – w poprawce #${existing.id} (${existing.author}) artykuł został usunięty`,
							amendment: existing,
						});
					}
					if (
						newChange.type === "delete" &&
						existing.changes?.some((ec) => ec.type === "add")
					) {
						blockingList.push({
							level: "blocking",
							type: "delete_add_conflict",
							message: `Nie możesz usunąć tego artykułu – w poprawce #${existing.id} (${existing.author}) został on dodany`,
							amendment: existing,
						});
					}
					if (
						newChange.type === "modify" &&
						existing.changes?.some(
							(ec) =>
								ec.type === "delete" && ec.articleId === newChange.articleId,
						)
					) {
						blockingList.push({
							level: "blocking",
							type: "modify_delete_conflict",
							message: `Nie możesz modyfikować tego artykułu – w poprawce #${existing.id} (${existing.author}) został on usunięty`,
							amendment: existing,
						});
					}
					if (
						newChange.type === "delete" &&
						existing.changes?.some(
							(ec) =>
								ec.type === "modify" && ec.articleId === newChange.articleId,
						)
					) {
						blockingList.push({
							level: "blocking",
							type: "delete_modify_conflict",
							message: `Nie możesz usunąć tego artykułu – w poprawce #${existing.id} (${existing.author}) jest on modyfikowany`,
							amendment: existing,
						});
					}
					if (
						newChange.type === "modify" &&
						existing.changes?.some((ec) => ec.type === "modify")
					) {
						const existingModify = existing.changes.find(
							(ec) => ec.type === "modify",
						);
						if (
							existingModify &&
							targetFragment &&
							targetFragment.length > 10
						) {
							const similarity = calculateSimilarity(
								targetFragment,
								existing.target?.fragment || existingModify.before || "",
							);
							if (similarity > 0.5) {
								blockingList.push({
									level: "blocking",
									type: "modify_modify_conflict",
									message: `Ten sam fragment jest już modyfikowany w poprawce #${existing.id} (${existing.author})`,
									amendment: existing,
									similarity: Math.round(similarity * 100),
								});
							}
						}
					}
				});
			});

			if (blockingList.length === 0) {
				conflictsList.push({
					level: "warning",
					type: "existing_amendments",
					message: `Istnieją już ${existingForArticle.length} inne poprawki dla tego artykułu – sprawdź czy nie ma konfliktów`,
					amendments: existingForArticle,
				});
			}
		}

		const hasAdd = newChanges.some((c) => c.type === "add");
		const hasDelete = newChanges.some((c) => c.type === "delete");
		const hasModify = newChanges.some((c) => c.type === "modify");

		if (hasAdd && hasDelete) {
			blockingList.push({
				level: "blocking",
				type: "internal_add_delete_conflict",
				message:
					"Nie możesz jednocześnie dodawać i usuwać artykułów w tej samej poprawce",
			});
		}

		if (hasDelete && hasModify) {
			conflictsList.push({
				level: "warning",
				type: "delete_modify_warning",
				message:
					"Usuwasz jeden artykuł i modyfikujesz inny – czy to zamierzone?",
			});
		}

		if (hasAdd) {
			const newArticleContent =
				newChanges.find((c) => c.type === "add")?.to || "";
			const similarArticles = allArticles.filter(
				(a) =>
					a.content &&
					newArticleContent.length > 20 &&
					a.content.includes(newArticleContent.substring(0, 30)),
			);
			if (similarArticles.length > 0) {
				conflictsList.push({
					level: "warning",
					type: "similar_article",
					message: `Nowy artykuł jest podobny do istniejącego artykułu ${similarArticles[0].number || ""}`,
					article: similarArticles[0],
				});
			}
		}

		if (hasDelete) {
			const deletedArticleId = newChanges.find(
				(c) => c.type === "delete",
			)?.articleId;
			if (deletedArticleId) {
				const amendmentsUsingArticle = existingAmendments.filter(
					(a) =>
						a.changes?.some((c) => c.articleId === deletedArticleId) &&
						a.status === "pending",
				);
				if (amendmentsUsingArticle.length > 0) {
					blockingList.push({
						level: "blocking",
						type: "delete_used_article",
						message: `Ten artykuł jest używany w ${amendmentsUsingArticle.length} innych poprawkach – nie można go usunąć`,
						amendments: amendmentsUsingArticle,
					});
				}
			}
		}

		return { conflicts: conflictsList, blocking: blockingList };
	};

	const handleCheckConflicts = () => {
		const validChanges = changes.filter(
			(c) => c.type && (c.to || c.type === "delete"),
		);

		if (validChanges.length === 0) {
			showToast(
				"warning",
				"Brak zmian",
				"Dodaj przynajmniej jedną kompletną zmianę.",
			);
			return;
		}
		if (!target.article) {
			showToast(
				"warning",
				"Brak artykułu",
				"Wybierz artykuł, którego dotyczy zmiana.",
			);
			return;
		}

		const result = checkConflicts(
			validChanges,
			target.article,
			target.fragment,
		);

		setConflicts(result.conflicts);
		setBlockingConflicts(result.blocking);
		setShowConflicts(result.conflicts.length > 0 || result.blocking.length > 0);
		setHasCheckedConflicts(true);

		if (result.blocking.length === 0 && result.conflicts.length === 0) {
			showToast("success", "Brak kolizji", "Możesz dodać poprawkę.");
		} else {
			showToast(
				"warning",
				"Wykryto kolizje",
				"Sprawdź szczegóły w sekcji poniżej. Możesz mimo to dodać poprawkę.",
			);
		}
	};

	useEffect(() => {
		if (target.article) {
			const validChanges = changes.filter(
				(c) => c.type && (c.to || c.type === "delete"),
			);
			const result = checkConflicts(
				validChanges,
				target.article,
				target.fragment,
			);
			setConflicts(result.conflicts);
			setBlockingConflicts(result.blocking);
			setShowConflicts(
				result.conflicts.length > 0 || result.blocking.length > 0,
			);
		} else {
			setConflicts([]);
			setBlockingConflicts([]);
			setShowConflicts(false);
			setHasCheckedConflicts(false);
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
			prev.map((c) => (c.id === changeId ? { ...c, [field]: value } : c)),
		);
		setHasCheckedConflicts(false);
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
							to: c.type === "modify" ? article?.content || "" : c.to,
						}
					: c,
			),
		);
		setHasCheckedConflicts(false);
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
					: c,
			),
		);
		setHasCheckedConflicts(false);
	};

	const addNewChange = () => {
		setChanges((prev) => [
			...prev,
			{
				id: Date.now() + Math.random(),
				articleId: "",
				type: "",
				to: "",
				from: "",
			},
		]);
		setHasCheckedConflicts(false);
	};

	const removeChange = (changeId) => {
		if (changes.length <= 1) return;
		setChanges((prev) => prev.filter((c) => c.id !== changeId));
		setHasCheckedConflicts(false);
	};

	const submitAmendment = async (validChanges) => {
		setSubmitting(true);

		try {
			const amendmentData = {
				resolutionId: resolution.id,
				author: currentUser.name,
				authorId: currentUser.id,
				club: currentUser.club || "Niezrzeszony",
				content: validChanges
					.map((c) => {
						if (c.type === "add") return `Dodanie nowego artykułu: ${c.to}`;
						if (c.type === "delete") return `Usunięcie artykułu`;
						return `Zmiana treści artykułu: ${c.to}`;
					})
					.join("; "),
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
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(amendmentData),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Nie udało się dodać poprawki");
			}

			showToast(
				"success",
				"Dodano poprawkę",
				"Za chwilę nastąpi przekierowanie...",
			);
			setTimeout(() => navigate(`/${slug}/poprawki`), 800);
		} catch (err) {
			setError(err.message);
			showToast("error", "Błąd", err.message);
			setSubmitting(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!hasCheckedConflicts) {
			showToast(
				"warning",
				"Sprawdź kolizje",
				"Najpierw kliknij „Sprawdź kolizje”.",
			);
			return;
		}

		const validChanges = changes.filter((c) => {
			if (!c.type) return false;
			if (c.type === "add") return c.to.trim();
			if (c.type === "delete") return c.articleId && c.articleId !== "new";
			if (c.type === "modify")
				return c.articleId && c.articleId !== "new" && c.to.trim();
			return false;
		});

		if (validChanges.length === 0) {
			showToast(
				"warning",
				"Brak zmian",
				"Dodaj przynajmniej jedną kompletną zmianę.",
			);
			return;
		}
		if (!target.article) {
			showToast(
				"warning",
				"Brak artykułu",
				"Wybierz artykuł, którego dotyczy zmiana.",
			);
			return;
		}

		if (blockingConflicts.length > 0 || conflicts.length > 0) {
			const allMessages = [
				...blockingConflicts.map((b) => b.message),
				...conflicts.map((c) => c.message),
			];

			setConfirmModal({
				title: "Wykryto potencjalne kolizje",
				variant: "warning",
				messages: allMessages,
				onConfirm: () => {
					setConfirmModal(null);
					submitAmendment(validChanges);
				},
			});
			return;
		}

		submitAmendment(validChanges);
	};

	const getConflictIcon = (level) => {
		switch (level) {
			case "blocking":
			case "conflict":
				return <AlertTriangle size={18} color="#dc2626" />;
			case "warning":
				return <Info size={18} color="#f59e0b" />;
			default:
				return <Info size={18} color="#3b82f6" />;
		}
	};

	const getConflictClass = (level) => {
		switch (level) {
			case "blocking":
				return "conflict-item--blocking";
			case "conflict":
				return "conflict-item--conflict";
			case "warning":
				return "conflict-item--warning";
			default:
				return "conflict-item--info";
		}
	};

	const hasAnyConflict = blockingConflicts.length > 0 || conflicts.length > 0;

	return (
		<div className="add-amendment">
			<div className="uchwaly-bar">
				<Link to={`/${slug}`} className="uchwaly-title">
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
						<p className="field-hint">
							Określ czego dotyczy Twoja poprawka – pomoże to w wykrywaniu
							konfliktów
						</p>

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
										(a) =>
											a?.target?.article === Number(art.id) &&
											(a.status === "pending" || a.status === "accepted"),
									);
									return (
										<option key={art.id || idx} value={art.id}>
											{art.number || `Art. ${idx + 1}`}:{" "}
											{art.content?.substring(0, 40)}...
											{hasAmendments ? " ⚠️" : ""}
										</option>
									);
								})}
							</select>
						</div>

						<div className="form-group">
							<label>Obszar zmiany</label>
							<select
								value={target.section}
								onChange={(e) =>
									setTarget({ ...target, section: e.target.value })
								}
								className="form-select"
							>
								<option value="other">Inne</option>
								<option value="budget">Budżet / Finanse</option>
								<option value="deadline">Termin / Data</option>
								<option value="people">Ludzie / Członkowie</option>
								<option value="procedure">Procedura</option>
							</select>
						</div>

						{target.article && target.fragment && (
							<div className="form-group">
								<small className="field-hint" style={{ color: "#059669" }}>
									Automatycznie pobrano fragment do porównania
								</small>
							</div>
						)}

						{showConflicts && hasAnyConflict && (
							<div className="conflicts-section">
								{blockingConflicts.length > 0 && (
									<>
										<h4 className="conflicts-title conflicts-title--blocking">
											<ShieldAlert size={20} />
											Kolizje z innymi poprawkami ({blockingConflicts.length})
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
														<p className="conflict-item-message">
															{conflict.message}
														</p>
														{conflict.amendment && (
															<div className="conflict-item-amendments">
																<span className="amendment-tag amendment-tag--blocking">
																	Poprawka #{conflict.amendment.id} –{" "}
																	{conflict.amendment.author}
																</span>
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
											Ostrzeżenia ({conflicts.length})
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
														<p className="conflict-item-message">
															{conflict.message}
														</p>
													</div>
												</div>
											))}
										</div>
									</>
								)}

								<div className="conflicts-note conflicts-note--info">
									<FileWarning size={16} />
									<span>
										Możesz dodać tę poprawkę mimo kolizji. Pamiętaj jednak, że
										Marszałek oraz Koordynatorzy mogą ją w każdej chwili usunąć,
										jeśli zostanie uznana za błędną lub kolidującą z innymi.
									</span>
								</div>
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
													{art.number || `Art. ${idx + 1}`}:{" "}
													{art.content?.substring(0, 50)}...
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
										<Trash2 size={16} /> Ten artykuł zostanie{" "}
										<strong>usunięty</strong> z uchwały.
									</div>
								)}
							</div>
						))}
					</div>

					<div className="form-actions">
						<button
							type="button"
							onClick={handleCheckConflicts}
							className="check-conflicts-btn"
							disabled={submitting}
						>
							<Search size={16} /> Sprawdź kolizje
						</button>

						<button
							type="submit"
							className={`submit-btn ${blockingConflicts.length > 0 ? "has-blocking-conflicts" : ""} ${conflicts.length > 0 ? "has-warnings" : ""}`}
							disabled={submitting || !hasCheckedConflicts}
							title={!hasCheckedConflicts ? "Najpierw sprawdź kolizje" : ""}
						>
							{submitting
								? "Dodawanie..."
								: !hasCheckedConflicts
									? "Najpierw sprawdź kolizje"
									: "Dodaj poprawkę"}
							{hasAnyConflict && hasCheckedConflicts && (
								<AlertTriangle size={16} style={{ marginLeft: 8 }} />
							)}
						</button>

						<Link to={`/${slug}/poprawki`} className="cancel-btn">
							Anuluj
						</Link>
					</div>
				</form>
			</div>

			<Toast toast={toast} onClose={closeToast} />

			<Modal
				isOpen={!!confirmModal}
				title={confirmModal?.title}
				variant={confirmModal?.variant || "warning"}
				confirmText="Dodaj mimo to"
				cancelText="Anuluj"
				onConfirm={confirmModal?.onConfirm}
				onCancel={() => setConfirmModal(null)}
			>
				<p style={{ marginBottom: 12 }}>
					Wykryto następujące kolizje z innymi poprawkami:
				</p>
				<ul style={{ marginBottom: 16 }}>
					{confirmModal?.messages?.map((msg, i) => (
						<li key={i}>{msg}</li>
					))}
				</ul>
				<p style={{ fontSize: 13, color: "#64748b" }}>
					Możesz mimo to dodać poprawkę. Pamiętaj jednak, że{" "}
					<strong>Marszałek oraz Koordynatorzy</strong> mogą ją w każdej chwili
					usunąć, jeśli zostanie uznana za błędną lub kolidującą z innymi.
				</p>
			</Modal>
		</div>
	);
}
