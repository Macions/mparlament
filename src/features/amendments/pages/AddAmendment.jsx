import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
										️ Ten artykuł zostanie <strong>usunięty</strong> z uchwały.
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