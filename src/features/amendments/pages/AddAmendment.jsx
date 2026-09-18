import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Modal from "../../../components/Modal";
import Toast from "../../../components/Toast";
import {
	X,
	Plus,
	AlertTriangle,
	Info,
	Search,
	ShieldAlert,
	Trash2,
	FileWarning,
} from "lucide-react";
import styles from "./AddAmendment.module.css";

function getAuthHeaders() {
	try {
		const raw = localStorage.getItem("token");
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		const jwt = parsed?.token;
		return jwt ? { Authorization: `Bearer ${jwt}` } : {};
	} catch {
		return {};
	}
}

function getCachedUser() {
	try {
		const raw = localStorage.getItem("user");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

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
		section_id: "",
		section_text: "",
		chapter_id: "", // ← NOWE
		section: "other",
		fragment: "",
	});

	const CHANGE_TYPES = [
		{ value: "modify", label: "Zmiana treści" },
		{ value: "add", label: "Dodanie nowego artykułu" },
		{ value: "delete", label: "Usunięcie artykułu" },
		{ value: "rename_chapter", label: "Zmiana nazwy rozdziału" }, // ← NOWE
	];

	const showToast = (type, title, message) => {
		setToast({ type, title, message });
	};

	const closeToast = () => setToast(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const authHeaders = getAuthHeaders();

				const [resRes, amdRes] = await Promise.all([
					fetch(`/newapp/api/resolutions/${slug}`, { headers: authHeaders }),
					fetch(`/newapp/api/resolutions/${slug}/amendments`, {
						headers: authHeaders,
					}),
				]);

				if (!resRes.ok) throw new Error("Nie znaleziono uchwały");

				const resolutionData = await resRes.json();
				const amendmentsData = await amdRes.json();

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
				setCurrentUser(getCachedUser());
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
	const buildArticleTree = () => {
		if (!resolution) return [];

		const articles = resolution.chapters
			? resolution.chapters.flatMap((ch) =>
					(ch.articles || []).map((art) => ({
						...art,
						chapterTitle: ch.subtitle || ch.title || "",
					})),
				)
			: resolution.articles || [];

		return articles.map((art) => {
			const lines = art.contentLines || [];

			const sections = [];
			let currentSection = null;

			for (const line of lines) {
				if (line.level === 1) {
					let text = line.text || "";
					let marker = line.marker;

					if (!marker) {
						const match = text.match(
							/^(\d+\.?|\d+\)|[a-z][.)]|[IVXLCDM]+[.)]?)\s+(.+)$/,
						);
						if (match) {
							marker = match[1];
							text = match[2];
						}
					}

					if (marker && /^\d+$/.test(marker)) {
						marker = `${marker}.`;
					}

					currentSection = {
						id: `${art.id}_${sections.length + 1}`,
						marker: marker || `${sections.length + 1}.`,
						text,
						introText: text, // ← DODAJ: sama treść bez dzieci
						children: [],
					};
					sections.push(currentSection);
				} else if (currentSection && line.level === 2) {
					let text = line.text || "";
					let marker = line.marker;

					if (!marker) {
						const match = text.match(
							/^(\d+\)|[a-z][.)]|[IVXLCDM]+[.)]?)\s+(.+)$/,
						);
						if (match) {
							marker = match[1];
							text = match[2];
						}
					}

					currentSection.children.push({
						id: `${currentSection.id}_${currentSection.children.length + 1}`,
						marker: marker || `${currentSection.children.length + 1})`,
						text,
					});
				}
			}

			// ← DODAJ: po zebraniu children — zbuduj pełny tekst sekcji
			for (const section of sections) {
				const childrenText = section.children
					.map((c) => `${c.marker} ${c.text}`)
					.join("\n");

				section.fullText = childrenText
					? `${section.marker} ${section.introText}\n${childrenText}`
					: `${section.marker} ${section.introText}`;

				// Zachowaj `text` jako sam intro (bez markera) — dla UI
				section.text = section.introText;
			}

			return {
				id: art.id,
				number: art.number,
				chapterTitle: art.chapterTitle,
				content: art.content,
				sections,
			};
		});
	};

	const articleTree = buildArticleTree();
	const allArticles = getAllArticles();

	// ← NOWE: drzewo rozdziałów
	const chapterTree = (resolution?.chapters || []).map((ch, idx) => ({
		id: `chapter_${ch.id ?? idx}`,
		rawId: ch.id ?? idx,
		title: ch.title || "",
		subtitle: ch.subtitle || "",
		fullTitle:
			`${ch.title || ""}${ch.subtitle ? " — " + ch.subtitle : ""}`.trim(),
	}));

	const handleSectionChange = (value) => {
		if (!value) {
			setTarget({
				...target,
				article: "",
				section_id: "",
				section_text: "",
				chapter_id: "",
				fragment: "",
			});
			setHasCheckedConflicts(false);
			return;
		}

		// ← NOWE: obsługa rozdziału
		if (value.startsWith("chapter:")) {
			const rawId = value.split(":")[1];
			const ch = chapterTree.find((c) => String(c.rawId) === String(rawId));
			setTarget({
				...target,
				article: "",
				section_id: "",
				section_text: ch?.fullTitle || "",
				chapter_id: rawId,
				fragment: ch?.fullTitle || "",
			});
			setHasCheckedConflicts(false);
			return;
		}

		const [articleId, sectionId] = value.split(":");
		const article = articleTree.find((a) => String(a.id) === String(articleId));

		if (!article) return;

		let fragment = article.content || "";
		let sectionText = "";

		if (sectionId && sectionId !== "all") {
			const section = article.sections.find((s) => s.id === sectionId);
			if (section) {
				fragment = section.fullText; // ← pełny tekst z dziećmi
				sectionText = section.fullText;
			}
		}

		setTarget({
			...target,
			article: articleId,
			section_id: sectionId || "",
			section_text: sectionText,
			chapter_id: "", // ← NOWE
			fragment,
		});
		setHasCheckedConflicts(false);
	};
	const getBaseArticleId = (compositeId) => {
		if (!compositeId) return "";
		return String(compositeId).split(":")[0];
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

	const checkConflicts = (
		newChanges,
		targetArticle,
		targetFragment,
		targetSectionId = null,
	) => {
		const conflictsList = [];
		const blockingList = [];

		existingAmendments.forEach((existing) => {
			const sameAuthor = existing.authorId === currentUser?.id;
			const existingContent = existing.content || "";
			const newContent = newChanges
				.map((c) => {
					if (c.type === "add") return `Dodanie nowego artykułu: ${c.to}`;
					if (c.type === "delete") return `Usunięcie artykułu`;
					if (c.type === "rename_chapter")
						return `Zmiana nazwy rozdziału: ${c.from} → ${c.to}`;
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
						if (
							getBaseArticleId(existingChange.articleId) !==
							getBaseArticleId(newChange.articleId)
						)
							return;

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
		const existingForSection = targetSectionId
			? existingAmendments.filter(
					(a) =>
						a?.target?.article === Number(targetArticle) &&
						a?.target?.section_id === targetSectionId &&
						(a.status === "pending" || a.status === "accepted"),
				)
			: existingForArticle;
		if (existingForSection.length > 0) {
			existingForSection.forEach((existing) => {
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
					message: targetSectionId
						? `Istnieją już ${existingForSection.length} inne poprawki dla tego ustępu – sprawdź czy nie ma konfliktów`
						: `Istnieją już ${existingForSection.length} inne poprawki dla tego artykułu – sprawdź czy nie ma konfliktów`,
					amendments: existingForSection,
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
		// ← NOWE: kolizje przy zmianie nazwy rozdziału
		const renameChapterChange = newChanges.find(
			(c) => c.type === "rename_chapter",
		);
		if (renameChapterChange) {
			const rawId = String(renameChapterChange.articleId).replace(
				"chapter:",
				"",
			);
			const chapterAmendments = existingAmendments.filter(
				(a) =>
					String(a?.target?.chapter_id) === String(rawId) &&
					(a.status === "pending" || a.status === "accepted"),
			);
			chapterAmendments.forEach((existing) => {
				const existingRename = existing.changes?.find(
					(ec) => ec.type === "rename_chapter",
				);
				if (!existingRename) return;
				if (existingRename.after === renameChapterChange.to) {
					blockingList.push({
						level: "blocking",
						type: "duplicate_chapter_rename",
						message:
							existing.authorId === currentUser?.id
								? `Ta sama zmiana nazwy rozdziału została już przez Ciebie zgłoszona (Poprawka #${existing.id})`
								: `Ta sama zmiana nazwy rozdziału została już zgłoszona przez ${existing.author} (Poprawka #${existing.id})`,
						amendment: existing,
					});
				} else {
					conflictsList.push({
						level: "warning",
						type: "chapter_rename_conflict",
						message: `Rozdział ten jest już przemianowywany w poprawce #${existing.id} (${existing.author}) na „${existingRename.after}”`,
						amendment: existing,
					});
				}
			});
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
		const validChanges = changes.filter((c) => {
			if (!c.type) return false;
			if (c.type === "delete") return true;
			return !!c.to;
		});
		if (validChanges.length === 0) {
			showToast(
				"warning",
				"Brak zmian",
				"Dodaj przynajmniej jedną kompletną zmianę.",
			);
			return;
		}
		if (!target.article && !target.chapter_id) {
			showToast(
				"warning",
				"Brak celu",
				"Wybierz artykuł, ustęp lub rozdział, którego dotyczy zmiana.",
			);
			return;
		}

		const result = checkConflicts(
			validChanges,
			target.article,
			target.fragment,
			target.section_id,
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
		if (target.article || target.chapter_id) {
			// ← ZMIANA
			const validChanges = changes.filter((c) => {
				if (!c.type) return false;
				if (c.type === "delete") return true;
				return !!c.to;
			});
			const result = checkConflicts(
				validChanges,
				target.article,
				target.fragment,
				target.section_id,
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
	}, [
		target.article,
		target.section_id,
		target.chapter_id, // ← NOWE
		target.fragment,
		changes,
		existingAmendments,
	]);

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={`${styles.skeleton} ${styles.skeletonBody}`} />
			</div>
		);
	}

	if (error || !resolution) {
		return (
			<div className={styles.page}>
				<Link to={`/${slug}`} className={styles.back}>
					← Wróć do uchwały
				</Link>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono uchwały</p>
					<p className={styles.emptyText}>
						{error || `Nie znaleziono uchwały: ${slug}`}
					</p>
				</div>
			</div>
		);
	}

	const handleChangeUpdate = (changeId, field, value) => {
		setChanges((prev) =>
			prev.map((c) => (c.id === changeId ? { ...c, [field]: value } : c)),
		);
		setHasCheckedConflicts(false);
	};

	const handleArticleSelect = (changeId, value) => {
		if (!value) {
			setChanges((prev) =>
				prev.map((c) =>
					c.id === changeId ? { ...c, articleId: "", from: "", to: "" } : c,
				),
			);
			setHasCheckedConflicts(false);
			return;
		}

		const [articleId, sectionId] = value.split(":");
		const article = articleTree.find((a) => String(a.id) === String(articleId));

		let fromText = article?.content || "";
		if (article && sectionId && sectionId !== "all") {
			const section = article.sections.find((s) => s.id === sectionId);
			if (section) {
				fromText = section.fullText; // ← pełny tekst z dziećmi
			}
		}

		setChanges((prev) =>
			prev.map((c) =>
				c.id === changeId
					? {
							...c,
							articleId: value, // ← zachowaj pełny klucz "artId:sectionId"
							from: fromText,
							to: c.type === "modify" ? fromText : c.to,
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
						if (c.type === "rename_chapter")
							return `Zmiana nazwy rozdziału: ${c.from} → ${c.to}`;
						return `Zmiana treści artykułu: ${c.to}`;
					})
					.join("; "),
				status: "pending",
				target: {
					article: target.article
						? Number(String(target.article).replace(/^art_/, ""))
						: null,
					section_id: target.section_id || null,
					chapter_id: target.chapter_id || null, // ← NOWE
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

			const response = await fetch(
				`/newapp/api/resolutions/${slug}/amendments`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...getAuthHeaders(),
					},
					body: JSON.stringify(amendmentData),
				},
			);

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
			if (c.type === "rename_chapter") return c.articleId && c.to.trim(); // ← NOWE
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
		if (!target.article && !target.chapter_id) {
			showToast(
				"warning",
				"Brak celu",
				"Wybierz artykuł, ustęp lub rozdział, którego dotyczy zmiana.",
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
				return styles.conflictBlocking;
			case "conflict":
				return styles.conflictConflict;
			case "warning":
				return styles.conflictWarning;
			default:
				return styles.conflictInfo;
		}
	};

	const hasAnyConflict = blockingConflicts.length > 0 || conflicts.length > 0;

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<Link to={`/${slug}`} className={styles.back}>
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
					Wróć do uchwały
				</Link>

				<div className={styles.session}>
					<span className={styles.sessionLabel}>Posiedzenie</span>
					<span className={styles.sessionCity}>Warszawa</span>
					<span className={styles.sessionDate}>20.05</span>
				</div>
			</header>

			<main className={styles.main}>
				<div className={styles.head}>
					<span className={styles.eyebrow}>Nowa poprawka</span>
					<h1 className={styles.title}>Dodaj poprawkę</h1>
					<p className={styles.subtitle}>{resolution.title}</p>

					{currentUser && (
						<div className={styles.authorBadge}>
							<span className={styles.authorBadgeDot} />
							{currentUser.name} — {currentUser.club || "Niezrzeszony"}
						</div>
					)}
				</div>

				{error && <div className={styles.error}>{error}</div>}

				<form onSubmit={handleSubmit} className={styles.form}>
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle}>Cel zmiany</h2>
							<p className={styles.sectionHint}>
								Określ czego dotyczy Twoja poprawka — pomoże to w wykrywaniu
								konfliktów
							</p>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="target-article">
								Artykuł / ustęp
							</label>
							<select
								id="target-article"
								value={
									target.chapter_id
										? `chapter:${target.chapter_id}`
										: target.section_id
											? `${target.article}:${target.section_id}`
											: ""
								}
								onChange={(e) => handleSectionChange(e.target.value)}
								className={styles.select}
								required
							>
								<option value="">— wybierz artykuł lub ustęp —</option>

								{/* ← NOWE: rozdziały */}
								{chapterTree.length > 0 && (
									<optgroup label="Rozdziały">
										{chapterTree.map((ch) => (
											<option key={ch.id} value={`chapter:${ch.rawId}`}>
												{ch.fullTitle}
											</option>
										))}
									</optgroup>
								)}

								{articleTree.map((art) => {
									const hasAmendments = existingAmendments.some(
										(a) =>
											a?.target?.article === Number(art.id) &&
											(a.status === "pending" || a.status === "accepted"),
									);

									return (
										<optgroup
											key={art.id}
											label={`${art.number}${art.chapterTitle ? ` — ${art.chapterTitle}` : ""}${hasAmendments ? " ⚠" : ""}`}
										>
											{/* Opcja: cały artykuł */}
											<option value={`${art.id}:all`}>
												Cały artykuł: {art.number}
											</option>

											{/* Opcje: poszczególne ustępy */}
											{art.sections.map((sec) => {
												const secHasAmendments = existingAmendments.some(
													(a) =>
														a?.target?.article === Number(art.id) &&
														a?.target?.section_id === sec.id &&
														(a.status === "pending" || a.status === "accepted"),
												);

												return (
													<option key={sec.id} value={`${art.id}:${sec.id}`}>
														{art.number} ust. {sec.marker.replace(/[.)]$/, "")}:{" "}
														{sec.text.substring(0, 60)}…
														{secHasAmendments ? " ⚠" : ""}
													</option>
												);
											})}
										</optgroup>
									);
								})}
							</select>
						</div>

						<div className={styles.field}>
							<label className={styles.label} htmlFor="target-section">
								Obszar zmiany
							</label>
							<select
								id="target-section"
								value={target.section}
								onChange={(e) =>
									setTarget({ ...target, section: e.target.value })
								}
								className={styles.select}
							>
								<option value="other">Inne</option>
								<option value="budget">Budżet / Finanse</option>
								<option value="deadline">Termin / Data</option>
								<option value="people">Ludzie / Członkowie</option>
								<option value="procedure">Procedura</option>
							</select>
						</div>

						{(target.article || target.chapter_id) && target.fragment && (
							<p className={styles.fragmentHint}>
								Automatycznie pobrano fragment do porównania.
							</p>
						)}

						{showConflicts && hasAnyConflict && (
							<div className={styles.conflicts}>
								{blockingConflicts.length > 0 && (
									<>
										<h3
											className={`${styles.conflictsTitle} ${styles.conflictsTitleBlocking}`}
										>
											<ShieldAlert size={20} />
											Kolizje z innymi poprawkami ({blockingConflicts.length})
										</h3>
										<div className={styles.conflictsList}>
											{blockingConflicts.map((conflict, index) => (
												<div
													key={`blocking-${index}`}
													className={`${styles.conflictItem} ${getConflictClass(
														conflict.level,
													)}`}
												>
													<div className={styles.conflictIcon}>
														{getConflictIcon(conflict.level)}
													</div>
													<div className={styles.conflictContent}>
														<p className={styles.conflictMessage}>
															{conflict.message}
														</p>
														{conflict.amendment && (
															<div className={styles.conflictTags}>
																<span
																	className={`${styles.tag} ${styles.tagBlocking}`}
																>
																	Poprawka #{conflict.amendment.id} —{" "}
																	{conflict.amendment.author}
																</span>
															</div>
														)}
														{conflict.similarity && (
															<div className={styles.conflictSimilarity}>
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
										<h3 className={styles.conflictsTitle}>
											<Info size={20} />
											Ostrzeżenia ({conflicts.length})
										</h3>
										<div className={styles.conflictsList}>
											{conflicts.map((conflict, index) => (
												<div
													key={`warning-${index}`}
													className={`${styles.conflictItem} ${getConflictClass(
														conflict.level,
													)}`}
												>
													<div className={styles.conflictIcon}>
														{getConflictIcon(conflict.level)}
													</div>
													<div className={styles.conflictContent}>
														<p className={styles.conflictMessage}>
															{conflict.message}
														</p>
													</div>
												</div>
											))}
										</div>
									</>
								)}

								<div className={styles.conflictsNote}>
									<FileWarning size={16} />
									<span>
										Możesz dodać tę poprawkę mimo kolizji. Pamiętaj jednak, że
										Marszałek oraz Koordynatorzy mogą ją w każdej chwili usunąć,
										jeśli zostanie uznana za błędną lub kolidującą z innymi.
									</span>
								</div>
							</div>
						)}
					</section>

					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle}>Zmiany w artykułach</h2>
							<button
								type="button"
								onClick={addNewChange}
								className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
							>
								<Plus size={16} /> Dodaj kolejną zmianę
							</button>
						</div>

						<div className={styles.changes}>
							{changes.map((change, index) => (
								<article key={change.id} className={styles.change}>
									<header className={styles.changeHead}>
										<span className={styles.changeNumber}>
											Zmiana {index + 1}
										</span>
										{changes.length > 1 && (
											<button
												type="button"
												onClick={() => removeChange(change.id)}
												className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
											>
												<X size={16} />
											</button>
										)}
									</header>

									<div className={styles.field}>
										<label className={styles.label}>Rodzaj zmiany</label>
										<div className={styles.types}>
											{CHANGE_TYPES.map((ct) => (
												<button
													key={ct.value}
													type="button"
													className={`${styles.typeBtn} ${
														change.type === ct.value ? styles.typeBtnActive : ""
													}`}
													onClick={() => handleTypeChange(change.id, ct.value)}
												>
													{ct.label}
												</button>
											))}
										</div>
									</div>

									{change.type === "rename_chapter" && (
										<div className={styles.field}>
											<label className={styles.label}>Wybierz rozdział</label>
											<select
												value={change.articleId}
												onChange={(e) => {
													const val = e.target.value;
													const ch = chapterTree.find(
														(c) => `chapter:${c.rawId}` === val,
													);
													setChanges((prev) =>
														prev.map((c) =>
															c.id === change.id
																? {
																		...c,
																		articleId: val,
																		from: ch?.fullTitle || "",
																		to: ch?.fullTitle || "",
																	}
																: c,
														),
													);
													setHasCheckedConflicts(false);
												}}
												className={styles.select}
											>
												<option value="">— wybierz rozdział —</option>
												{chapterTree.map((ch) => (
													<option key={ch.id} value={`chapter:${ch.rawId}`}>
														{ch.fullTitle}
													</option>
												))}
											</select>
										</div>
									)}

									{(change.type === "modify" || change.type === "delete") && (
										<div className={styles.field}>
											<label className={styles.label}>
												Wybierz artykuł lub ustęp
											</label>
											<select
												value={change.articleId}
												onChange={(e) =>
													handleArticleSelect(change.id, e.target.value)
												}
												className={styles.select}
											>
												<option value="">— wybierz artykuł lub ustęp —</option>

												{articleTree.map((art) => (
													<optgroup
														key={art.id}
														label={`${art.number}${art.chapterTitle ? ` — ${art.chapterTitle}` : ""}`}
													>
														<option value={art.id}>
															Cały artykuł: {art.number}
														</option>

														{art.sections.map((sec) => (
															<option
																key={sec.id}
																value={`${art.id}:${sec.id}`}
															>
																{art.number} ust.{" "}
																{sec.marker.replace(/[.)]$/, "")}:{" "}
																{sec.text.substring(0, 50)}…
															</option>
														))}
													</optgroup>
												))}
											</select>
										</div>
									)}
									{(change.type === "modify" ||
										change.type === "add" ||
										change.type === "rename_chapter") && (
										<div className={styles.field}>
											<label className={styles.label}>
												{change.type === "add"
													? "Treść nowego artykułu"
													: change.type === "rename_chapter"
														? "Nowa nazwa rozdziału"
														: "Nowa treść artykułu"}
											</label>
											<textarea
												value={change.to}
												onChange={(e) =>
													handleChangeUpdate(change.id, "to", e.target.value)
												}
												placeholder={
													change.type === "add"
														? "np. Art. 1a: Wprowadza się nowy przepis…"
														: change.type === "rename_chapter"
															? "np. Rozdział 1 — Przepisy ogólne"
															: "Wpisz nową treść artykułu…"
												}
												className={styles.textarea}
												rows={4}
											/>
										</div>
									)}

									{change.type === "delete" && change.articleId && (
										<div className={styles.deleteInfo}>
											<Trash2 size={16} /> Ten artykuł zostanie{" "}
											<strong>usunięty</strong> z uchwały.
										</div>
									)}
								</article>
							))}
						</div>
					</section>

					<div className={styles.actions}>
						<button
							type="button"
							onClick={handleCheckConflicts}
							className={`${styles.btn} ${styles.btnOutline}`}
							disabled={submitting}
						>
							<Search size={16} /> Sprawdź kolizje
						</button>

						<button
							type="submit"
							className={`${styles.btn} ${styles.btnPrimary} ${
								blockingConflicts.length > 0 ? styles.btnHasBlocking : ""
							} ${conflicts.length > 0 ? styles.btnHasWarnings : ""}`}
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

						<Link
							to={`/${slug}/poprawki`}
							className={`${styles.btn} ${styles.btnGhost}`}
						>
							Anuluj
						</Link>
					</div>
				</form>
			</main>

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
