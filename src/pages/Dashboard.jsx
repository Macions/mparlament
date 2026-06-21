import "./Dashboard.css";

function CalendarIcon() {
	return (
		<svg
			className="dashboard__calendar-icon"
			viewBox="0 0 120 120"
			aria-hidden="true"
		>
			<rect
				x="14"
				y="28"
				width="92"
				height="78"
				rx="8"
				fill="none"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<line x1="14" y1="48" x2="106" y2="48" stroke="currentColor" strokeWidth="4" />
			<circle cx="38" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
			<circle cx="60" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
			<circle cx="82" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth="4" />
			<line x1="38" y1="20" x2="38" y2="32" stroke="currentColor" strokeWidth="4" />
			<line x1="60" y1="20" x2="60" y2="32" stroke="currentColor" strokeWidth="4" />
			<line x1="82" y1="20" x2="82" y2="32" stroke="currentColor" strokeWidth="4" />
			{[0, 1, 2, 3].map((row) =>
				[0, 1, 2].map((col) => (
					<rect
						key={`${row}-${col}`}
						x={26 + col * 28}
						y={58 + row * 14}
						width="18"
						height="10"
						rx="2"
						fill="currentColor"
					/>
				)),
			)}
		</svg>
	);
}

export default function Dashboard() {
	return (
		<div className="dashboard">
			<section className="dashboard__user">
				<p className="dashboard__user-name">Zalogowano jako Jan Kowalski</p>
				<p className="dashboard__user-club">KLUB PARLAMENTARNY CZAS MŁODYCH</p>
			</section>

			<div className="dashboard__grid">
				<article className="dashboard__card dashboard__card--session">
					<h2 className="dashboard__card-title">POSIEDZENIE</h2>
					<p className="dashboard__card-text">
						W tej chwili nie odbywa się żadne posiedzenie.
					</p>
					<button type="button" className="dashboard__card-button">
						ŚLEDŹ POSIEDZENIE
					</button>
				</article>

				<div className="dashboard__actions">
					<button
						type="button"
						className="dashboard__action dashboard__action--resolutions"
					>
						SPRAWDŹ UCHWAŁY
					</button>
					<button
						type="button"
						className="dashboard__action dashboard__action--submit"
					>
						ZŁÓŻ UCHWAŁĘ
					</button>
				</div>

				<article className="dashboard__card dashboard__card--calendar">
					<h2 className="dashboard__card-title">KALENDARZ</h2>
					<div className="dashboard__calendar-wrap">
						<CalendarIcon />
					</div>
				</article>
			</div>
		</div>
	);
}
