import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./AmendmentDetails.module.css";

export default function AmendmentDetails() {
	const { slug, amendmentId } = useParams();

	const [resolution, setResolution] = useState(null);
	const [amendment, setAmendment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetch(`/newapp/api/resolutions/${slug}/amendments/${amendmentId}`)
			.then((res) => {
				if (!res.ok) {
					throw new Error("Nie znaleziono poprawki");
				}
				return res.json();
			})
			.then((data) => {
				setResolution(data.resolution);
				setAmendment(data.amendment);
				setError(null);
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [slug, amendmentId]);

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={`${styles.skeleton} ${styles.skeletonHead}`} />
				<div className={`${styles.skeleton} ${styles.skeletonMeta}`} />
				<div className={`${styles.skeleton} ${styles.skeletonBody}`} />
			</div>
		);
	}

	if (error || !amendment) {
		return (
			<div className={styles.page}>
				<Link to={`/${slug}/poprawki`} className={styles.back}>
					← Wróć do poprawek
				</Link>
				<div className={styles.empty}>
					<p className={styles.emptyTitle}>Nie znaleziono poprawki</p>
					<p className={styles.emptyText}>
						{error || "Poprawka mogła zostać usunięta lub zmienił się link."}
					</p>
				</div>
			</div>
		);
	}

	const getStatusLabel = (status) => {
		const statusMap = {
			accepted: "Przyjęta",
			pending: "Oczekuje",
			rejected: "Odrzucona",
			withdrawn: "Wycofana",
		};
		return statusMap[status] || status;
	};

	const statusClassMap = {
		accepted: styles.statusAccepted,
		pending: styles.statusPending,
		rejected: styles.statusRejected,
		withdrawn: styles.statusWithdrawn,
	};
	const statusClass = statusClassMap[amendment.status] || "";

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<Link to={`/${slug}/poprawki`} className={styles.back}>
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
					Wróć do poprawek
				</Link>

				<div className={styles.session}>
					<span className={styles.sessionLabel}>Posiedzenie</span>
					<span className={styles.sessionCity}>Warszawa</span>
					<span className={styles.sessionDate}>20.05</span>
				</div>
			</header>

			<main className={styles.main}>
				<div className={styles.head}>
					<span className={styles.eyebrow}>Poprawka</span>
					<h1 className={styles.title}>
						Poprawka do uchwały
						<span className={styles.titleQuote}>„{resolution?.title}”</span>
					</h1>
				</div>

				<section className={styles.meta}>
					<div className={styles.metaRow}>
						<span className={styles.metaLabel}>Autor</span>
						<span className={styles.metaValue}>{amendment.author}</span>
					</div>

					<div className={styles.metaRow}>
						<span className={styles.metaLabel}>Status</span>
						<span className={`${styles.statusBadge} ${statusClass}`}>
							{getStatusLabel(amendment.status)}
						</span>
					</div>
				</section>

				{amendment.withdrawnReason && (
					<div className={styles.withdrawnReason}>
						<strong>Powód wycofania</strong>
						<p>{amendment.withdrawnReason}</p>
					</div>
				)}

				<section className={styles.card}>
					<h2 className={styles.cardTitle}>Treść poprawki</h2>
					<div className={styles.contentBox}>{amendment.content}</div>
				</section>

				{amendment.changes && amendment.changes.length > 0 && (
					<section className={styles.changes}>
						<h2 className={styles.cardTitle}>Zmiany w uchwale</h2>

						<ul className={styles.changesList}>
							{amendment.changes.map((change, index) => (
								<li key={index} className={styles.change}>
									<div className={styles.changeHead}>
										<span className={styles.changeNumber}>
											Zmiana {index + 1}
										</span>
									</div>

									<div className={styles.diff}>
										<div className={`${styles.diffCol} ${styles.diffOld}`}>
											<span className={styles.diffLabel}>Przed poprawką</span>
											<p className={styles.diffText}>
												{change.before || "(nowy artykuł)"}
											</p>
										</div>

										<div className={`${styles.diffCol} ${styles.diffNew}`}>
											<span className={styles.diffLabel}>Po poprawce</span>
											<p className={styles.diffText}>
												{change.after || "(usunięcie artykułu)"}
											</p>
										</div>
									</div>
								</li>
							))}
						</ul>
					</section>
				)}
			</main>
		</div>
	);
}
