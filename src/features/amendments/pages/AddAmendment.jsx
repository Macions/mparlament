import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./AddAmendment.css";

import { bills, resolutions } from "../../../data/legislation";

const CURRENT_USER = {
	name: "Jan Wiśniewski",
	club: "Klub Postępu",
};

const CHANGE_TYPES = [
	{ value: "modify", label: "Zmiana treści" },
	{ value: "add", label: "Dodanie nowego artykułu" },
	{ value: "delete", label: "Usunięcie artykułu" },
];

// POMOCNICZA FUNKCJA DO POBRANIA WSZYSTKICH ARTYKUŁÓW Z ROZDZIAŁÓW
function getAllArticles(bill) {
	if (!bill) return [];
	if (bill.articles) return bill.articles;
	if (bill.chapters) {
		return bill.chapters.flatMap((ch) => ch.articles || []);
	}
	return [];
}

// POMOCNICZA FUNKCJA DO ZAPISANIA ZMIENIONYCH ARTYKUŁÓW Z POWROTEM DO STRUKTURY
function saveArticles(bill, articles) {
	if (!bill) return bill;
	if (bill.articles) {
		return { ...bill, articles };
	}
	if (bill.chapters) {
		// Aktualizuj artykuły w rozdziałach
		const updatedChapters = bill.chapters.map((ch) => ({
			...ch,
			articles: articles.filter(
				(a) =>
					a.id.startsWith(ch.id) || ch.articles.some((ca) => ca.id === a.id),
			),
		}));
		return { ...bill, chapters: updatedChapters };
	}
	return bill;
}

function applyChanges(bill, changes) {
	if (!bill) return null;

	// Pobierz wszystkie artykuły
	const allArticles = getAllArticles(bill);
	const articles = [...allArticles];

	changes.forEach((change) => {
		if (change.type === "add") {
			articles.push({
				id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				content: change.to,
				changed: true,
				before: "",
			});
		} else if (change.type === "delete") {
			const idx = articles.findIndex((a) => a.id === change.articleId);
			if (idx !== -1) {
				articles[idx] = {
					...articles[idx],
					changed: true,
					before: articles[idx].content,
					content: "",
				};
			}
		} else if (change.type === "modify") {
			const article = articles.find((a) => a.id === change.articleId);
			if (article) {
				article.before = article.content;
				article.content = change.to;
				article.changed = true;
			}
		}
	});

	return saveArticles(bill, articles);
}

export default function AddAmendment() {
	const { slug } = useParams();
	const navigate = useNavigate();

	const resolution = resolutions.find((r) => r.slug === slug);
	let relatedBill = null;

	try {
		const stored = localStorage.getItem("currentBill");
		relatedBill = stored ? JSON.parse(stored) : null;
	} catch (e) {
		console.error("Invalid bill in localStorage", e);
	}

	const [changes, setChanges] = useState([
		{ id: Date.now(), articleId: "", type: "", to: "" },
	]);

	const previewBill = useMemo(() => {
		if (!relatedBill) return null;
		const validChanges = changes.filter(
			(c) => c.type && (c.type === "add" || c.articleId),
		);
		if (validChanges.length === 0) return relatedBill;
		return applyChanges(relatedBill, validChanges);
	}, [relatedBill, changes]);

	// Pobierz wszystkie artykuły do wyświetlenia
	const allArticles = useMemo(() => {
		return getAllArticles(relatedBill);
	}, [relatedBill]);

	// Pobierz zmienione artykuły z podglądu
	const changedArticles = useMemo(() => {
		if (!previewBill) return [];
		const articles = getAllArticles(previewBill);
		return articles.filter((a) => a.changed) || [];
	}, [previewBill]);

	if (!relatedBill) {
		return <div className="not-found">Nie znaleziono ustawy dla: {slug}</div>;
	}

	const handleChangeUpdate = (changeId, field, value) => {
		setChanges((prev) =>
			prev.map((c) => (c.id === changeId ? { ...c, [field]: value } : c)),
		);
	};

	const handleArticleSelect = (changeId, articleId) => {
		const article = allArticles.find((a) => a.id === articleId);
		setChanges((prev) =>
			prev.map((c) =>
				c.id === changeId
					? { ...c, articleId, from: article ? article.content : "", to: "" }
					: c,
			),
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
							...(type === "add"
								? { articleId: "new", from: "" }
								: type === "delete"
									? { to: "" }
									: {}),
						}
					: c,
			),
		);
	};

	const addNewChange = () => {
		setChanges((prev) => [
			...prev,
			{ id: Date.now() + Math.random(), articleId: "", type: "", to: "" },
		]);
	};

	const removeChange = (changeId) => {
		if (changes.length <= 1) return;
		setChanges((prev) => prev.filter((c) => c.id !== changeId));
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		const validChanges = changes.filter((c) => {
			if (!c.type) return false;
			if (c.type === "add") return c.to.trim();
			if (c.type === "delete") return c.articleId;
			if (c.type === "modify") return c.articleId && c.to.trim();
			return false;
		});

		if (validChanges.length === 0) {
			alert("Dodaj przynajmniej jedną kompletną zmianę.");
			return;
		}

		const newAmendment = {
			id: `am_${Date.now()}`,
			billId: relatedBill.id,
			author: CURRENT_USER.club,
			status: "pending",
			changes: validChanges.map((c, i) => ({
				id: `am_${Date.now()}_${i + 1}`,
				articleId: c.type === "add" ? `new_${i}` : c.articleId,
				from: c.type === "add" ? "" : c.from || "",
				to: c.type === "delete" ? "" : c.to.trim(),
			})),
		};

		console.log("Nowa poprawka:", JSON.stringify(newAmendment, null, 2));
		alert("Poprawka została dodana! (dane w konsoli)");
		navigate(`/${slug}/poprawki`);
	};

	return (
		<div className="add-amendment">
			<div className="uchwaly-bar">
				<Link to={`/${slug}/poprawki`} className="uchwaly-title">
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
					{resolution?.meeting || "Posiedzenie: Warszawa"}
					<br />
					<span>20.05</span>
				</div>
			</div>

			<div className="main-content">
				<h1 className="page-title">Dodaj poprawkę</h1>
				<p className="page-subtitle">
					{resolution?.title || relatedBill.title}
				</p>

				<div className="author-badge">
					{CURRENT_USER.name} – {CURRENT_USER.club}
				</div>

				<form onSubmit={handleSubmit}>
					<div className="changes-section">
						<div className="changes-header">
							<h2>Zmiany w artykułach</h2>
							<button
								type="button"
								onClick={addNewChange}
								className="add-change-btn"
							>
								+ Dodaj kolejną zmianę
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
											✕
										</button>
									)}
								</div>

								{change.type !== "add" && (
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
											{allArticles.map((art) => (
												<option key={art.id} value={art.id}>
													{art.content}
												</option>
											))}
										</select>
									</div>
								)}

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
											disabled={change.type === "modify" && !change.articleId}
										/>
									</div>
								)}

								{change.type === "delete" && change.articleId && (
									<div className="delete-info">
										⚠️ Ten artykuł zostanie <strong>usunięty</strong> z ustawy.
									</div>
								)}
							</div>
						))}
					</div>

					{changedArticles.length > 0 && (
						<div className="preview-section">
							<h2 className="preview-title">Podgląd zmian</h2>
							{changedArticles.map((article, i) => (
								<div key={article.id} className="preview-diff">
									<span className="preview-label">Zmiana {i + 1}</span>
									<div className="diff-box">
										<div className="diff-old">
											<span>Przed</span>
											<p>{article.before || "(nowy artykuł)"}</p>
										</div>
										<div className="diff-arrow">→</div>
										<div className="diff-new">
											<span>Po</span>
											<p>{article.content || "(usunięty)"}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					<div className="form-actions">
						<button
							type="button"
							className="generate-btn"
							onClick={() =>
								console.log(
									"Uchwała po poprawkach:",
									JSON.stringify(previewBill, null, 2),
								)
							}
						>
							Generuj uchwałę po poprawkach
						</button>
						<button type="submit" className="submit-btn">
							Dodaj poprawkę
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
