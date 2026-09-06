import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { X, Plus, ArrowLeft } from "lucide-react";
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

	useEffect(() => {
		Promise.all([
			fetch(`/api/resolutions/${slug}`),
			fetch("/api/auth/me")
		])
			.then(([resRes, userRes]) => {
				if (!resRes.ok) throw new Error("Nie znaleziono uchwały");
				if (!userRes.ok) throw new Error("Nie znaleziono użytkownika");
				return Promise.all([resRes.json(), userRes.json()]);
			})
			.then(([resolutionData, userData]) => {
				setResolution(resolutionData.resolution);
				setResolutionData(resolutionData);
				setCurrentUser(userData);
				setError(null);
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
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
		const article = allArticles.find((a) => a.id === Number(articleId) || a.id === articleId);
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
								onChange={(e) => setTarget({ ...target, article: e.target.value })}
								className="form-select"
								required
							>
								<option value="">-- wybierz artykuł --</option>
								{allArticles.map((art, idx) => (
									<option key={art.id || idx} value={art.id}>
										{art.number || `Art. ${idx + 1}`}: {art.content?.substring(0, 40)}...
									</option>
								))}
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

						<div className="form-group">
							<label>Fragment który zmieniasz (opcjonalnie)</label>
							<textarea
								value={target.fragment}
								onChange={(e) => setTarget({ ...target, fragment: e.target.value })}
								placeholder="Wklej dokładny fragment tekstu który zmieniasz (pomoże to w wykryciu konfliktów)..."
								className="form-textarea"
								rows={2}
							/>
						</div>
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
							className="submit-btn"
							disabled={submitting}
						>
							{submitting ? "Dodawanie..." : "Dodaj poprawkę"}
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