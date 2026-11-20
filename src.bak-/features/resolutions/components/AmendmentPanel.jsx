// src/features/resolutions/components/AmendmentPanel.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./AmendmentPanel.module.css";

const STATUS_LABEL = {
	pending: "Oczekuje",
	accepted: "Przyjęta",
	rejected: "Odrzucona",
};

const STATUS_TONE = {
	pending: "warn",
	accepted: "ok",
	rejected: "bad",
};

function StatusPill({ status }) {
	const tone = STATUS_TONE[status] ?? "neutral";
	return (
		<span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

/**
 * context = {
 *   type: "article" | "point",
 *   articleId: "art_1",
 *   articleNumber: "Art. 1",
 *   chapterId: "ch_1",
 *   pointIndex?: number,      // tylko dla point
 *   pointMarker?: string,     // np. "2."
 *   pointText?: string,       // treść punktu
 *   articleText?: string,     // treść całego artykułu (dla type="article")
 * }
 */
export default function AmendmentPanel({
	open,
	onClose,
	resolutionSlug,
	context,
	amendments,
	currentUser,
	onCreated,
}) {
	const [showForm, setShowForm] = useState(false);
	const [before, setBefore] = useState("");
	const [after, setAfter] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const isPoint = context?.type === "point";
	const title = isPoint
		? `${context?.articleNumber ?? ""} ${context?.pointMarker ?? ""}`.trim()
		: (context?.articleNumber ?? "");

	// Reset formularza przy zmianie kontekstu / zamknięciu
	useEffect(() => {
		if (!open) {
			setShowForm(false);
			setBefore("");
			setAfter("");
			setError("");
		} else {
			// Wstępne wypełnienie "before" treścią punktu / artykułu
			setBefore(
				isPoint ? (context?.pointText ?? "") : (context?.articleText ?? ""),
			);
			setAfter("");
		}
	}, [open, context, isPoint]);

	// Escape zamyka panel
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		try {
			const token = localStorage.getItem("token");
			const articleNumber =
				parseInt((context?.articleNumber ?? "").match(/\d+/)?.[0] ?? "0", 10) ||
				null;

			const sectionId = isPoint
				? `${context.articleId}__line_${context.pointIndex}`
				: context.articleId;

			const target = {
				article: articleNumber,
				section_id: sectionId,
				chapter_id: context?.chapterId ?? null,
				section: "other",
			};

			const changes = [
				{
					articleId: context.articleId,
					before,
					after,
					type: after ? "modify" : "delete",
				},
			];

			const res = await fetch(
				`/api/resolutions/${encodeURIComponent(resolutionSlug)}/amendments`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						target,
						changes,
						content: isPoint
							? `Zmiana punktu ${context.pointMarker ?? ""} w ${context.articleNumber}`
							: `Zmiana treści artykułu ${context.articleNumber}`,
					}),
				},
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "Nie udało się dodać poprawki");
			}
			setBefore("");
			setAfter("");
			setShowForm(false);
			if (onCreated) onCreated();
		} catch (err) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	};

	if (!open) return null;

	return createPortal(
		<>
			<div className={styles.overlay} onClick={onClose} />
			<aside
				className={styles.panel}
				role="dialog"
				aria-label={`Poprawki do ${title}`}
			>
				<header className={styles.head}>
					<div>
						<p className={styles.eyebrow}>
							{isPoint ? "Poprawka do punktu" : "Poprawki do artykułu"}
						</p>
						<h2 className={styles.title}>{title}</h2>
						{isPoint && context.pointText && (
							<p className={styles.contextText}>{context.pointText}</p>
						)}
					</div>
					<button
						type="button"
						className={styles.closeBtn}
						onClick={onClose}
						aria-label="Zamknij"
					>
						<X size={18} />
					</button>
				</header>

				<div className={styles.body}>
					{amendments.length === 0 && !showForm && (
						<p className={styles.empty}>Brak poprawek.</p>
					)}

					{amendments.length > 0 && (
						<ul className={styles.list}>
							{amendments.map((a) => {
								const changes = a.changes ?? [];
								const first = changes[0] ?? {};
								return (
									<li
										key={a.id}
										className={`${styles.item} ${styles[`item--${a.status}`] ?? ""}`}
									>
										<div className={styles.itemMeta}>
											<strong>{a.author}</strong>
											{a.club && <span>{a.club}</span>}
											{a.createdAt && <span>{a.createdAt}</span>}
											<StatusPill status={a.status} />
										</div>
										{first.before && (
											<div className={styles.diff}>
												<div className={styles.diffBefore}>
													<span className={styles.diffLabel}>Przed</span>
													<p>{first.before}</p>
												</div>
												{first.after && (
													<div className={styles.diffAfter}>
														<span className={styles.diffLabel}>Po</span>
														<p>{first.after}</p>
													</div>
												)}
											</div>
										)}
									</li>
								);
							})}
						</ul>
					)}

					{currentUser && !showForm && (
						<button
							type="button"
							className={styles.addBtn}
							onClick={() => setShowForm(true)}
						>
							+ Dodaj poprawkę
						</button>
					)}

					{showForm && (
						<form className={styles.form} onSubmit={handleSubmit}>
							<label className={styles.formField}>
								<span className={styles.formLabel}>Obecna treść</span>
								<textarea
									className={styles.textarea}
									value={before}
									onChange={(e) => setBefore(e.target.value)}
									placeholder="Wklej obecną treść…"
									rows={4}
								/>
							</label>
							<label className={styles.formField}>
								<span className={styles.formLabel}>Nowa treść</span>
								<textarea
									className={styles.textarea}
									value={after}
									onChange={(e) => setAfter(e.target.value)}
									placeholder="Wpisz nową treść (albo zostaw puste, żeby usunąć)…"
									rows={4}
								/>
							</label>
							{error && <p className={styles.error}>{error}</p>}
							<div className={styles.formActions}>
								<button
									type="submit"
									className={styles.btnPrimary}
									disabled={saving}
								>
									{saving ? "Zapisywanie…" : "Zapisz poprawkę"}
								</button>
								<button
									type="button"
									className={styles.btnGhost}
									onClick={() => {
										setShowForm(false);
										setError("");
									}}
									disabled={saving}
								>
									Anuluj
								</button>
							</div>
						</form>
					)}
				</div>
			</aside>
		</>,
		document.body,
	);
}
