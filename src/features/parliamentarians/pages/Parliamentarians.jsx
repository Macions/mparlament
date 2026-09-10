import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import "./Parliamentarians.css";

const ModalPortal = ({ children, onClose }) => {
	return ReactDOM.createPortal(
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				{children}
			</div>
		</div>,
		document.body,
	);
};

// ============================================================
// HEMICYCLE – układ sali plenarnej z sektorami
// ============================================================
function Hemicycle({ parliamentarians, unaffiliated, clubs, onSelect }) {
	// Kolejność klubów od lewej do prawej (jak w opisie)
	const seatOrder = useMemo(() => {
		const order = [];
		// najpierw kluby w kolejności z listy
		clubs.forEach((club) => {
			order.push({
				id: club.id,
				name: club.name,
				color: club.color,
				count: parliamentarians.filter((p) => p.clubId === club.id).length,
				members: parliamentarians.filter((p) => p.clubId === club.id),
			});
		});
		// na końcu niezrzeszeni
		order.push({
			id: "unaffiliated",
			name: "Niezrzeszeni",
			color: "#94a3b8",
			count: unaffiliated.length,
			members: unaffiliated,
		});
		// dodaj puste miejsca, żeby wypełnić salę (opcjonalnie)
		const total = order.reduce((s, g) => s + g.count, 0);
		const emptySeats = Math.max(0, 100 - total); // np. 100 miejsc w sali
		if (emptySeats > 0) {
			order.push({
				id: "empty",
				name: "Puste",
				color: "#e6e6e6",
				count: emptySeats,
				members: [],
				isEmpty: true,
			});
		}
		return order;
	}, [clubs, parliamentarians, unaffiliated]);

	const totalSeats = seatOrder.reduce((s, g) => s + g.count, 0);

	// Geometria
	const width = 1000;
	const height = 520;
	const centerX = width / 2;
	const centerY = height - 20;
	const maxRadius = 460;
	const minRadius = 100;
	const rows = 8;

	// Rozkładamy wszystkie miejsca po kolei (klub po klubie)
	const allSeats = useMemo(() => {
		const seats = [];
		seatOrder.forEach((group) => {
			group.members.forEach((m, i) => {
				seats.push({
					...m,
					group,
					groupIndex: seatOrder.findIndex((g) => g.id === group.id),
				});
			});
			// puste miejsca
			if (group.isEmpty) {
				for (let i = 0; i < group.count; i++) {
					seats.push({
						id: `empty-${i}`,
						firstName: "",
						lastName: "",
						group,
						isEmpty: true,
					});
				}
			}
		});
		return seats;
	}, [seatOrder]);

	// Rozmieszczenie miejsc: dla każdego miejsca liczymy kąt i promień
	const seatPositions = useMemo(() => {
		const positions = [];
		const total = allSeats.length;
		// kąty od 180° (lewo) do 0° (prawo)
		const angleStart = Math.PI;
		const angleEnd = 0;

		allSeats.forEach((seat, idx) => {
			// proporcjonalnie do pozycji w całym półkolu
			const t = total === 1 ? 0 : idx / (total - 1);
			const angle = angleStart + t * (angleEnd - angleStart);

			// rząd: im dalej od środka, tym wyżej
			const rowIndex = idx % rows;
			const radius =
				minRadius + (rowIndex / (rows - 1)) * (maxRadius - minRadius);

			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle) * -1;
			positions.push({ x, y, seat });
		});
		return positions;
	}, [allSeats, rows, minRadius, maxRadius, centerX, centerY]);

	// Kolory sektorów (dla legendy)
	const sectorLegend = seatOrder.map((g) => ({
		name: g.name,
		count: g.count,
		color: g.color,
		isEmpty: g.isEmpty,
	}));

	return (
		<div className="hemicycle-wrapper">
			<h2 className="hemicycle-title">Układ sali plenarnej</h2>
			<p className="hemicycle-subtitle">
				{totalSeats} mandatów · {clubs.length} klubów i kół
			</p>

			{/* Pasek proporcji */}
			<div className="hemicycle-bar">
				<svg
					viewBox={`0 0 ${width} 40`}
					className="hemicycle-bar-svg"
					preserveAspectRatio="none"
				>
					<defs>
						<pattern
							id="stripe-pattern"
							width="8"
							height="8"
							patternTransform="rotate(45 0 0)"
							patternUnits="userSpaceOnUse"
						>
							<line
								x1="0"
								y1="0"
								x2="0"
								y2="8"
								stroke="#ff4d4d"
								strokeWidth="4"
							/>
							<line
								x1="4"
								y1="0"
								x2="4"
								y2="8"
								stroke="#ffffff"
								strokeWidth="4"
							/>
						</pattern>
					</defs>
					{(() => {
						let x = 0;
						return seatOrder.map((g) => {
							const w = (g.count / totalSeats) * width;
							const fill = g.isEmpty ? "url(#stripe-pattern)" : g.color;
							const rect = (
								<rect
									key={g.id}
									x={x}
									y="0"
									width={w}
									height="40"
									fill={fill}
									stroke="#ffffff"
									strokeWidth="1"
								>
									<title>
										{g.name}: {g.count}
									</title>
								</rect>
							);
							x += w;
							return rect;
						});
					})()}
				</svg>
			</div>

			{/* Legenda */}
			<div className="hemicycle-legend">
				{sectorLegend.map((g) => (
					<div key={g.name} className="hemicycle-legend__item">
						<span
							className="hemicycle-legend__color"
							style={{
								background: g.isEmpty
									? "repeating-linear-gradient(-45deg, #fff, #fff 4px, #ff4d4d 4px, #ff4d4d 8px)"
									: g.color,
								border: g.isEmpty ? "1px solid #ccc" : "none",
							}}
						/>
						<span className="hemicycle-legend__label">
							<strong>{g.name}:</strong> {g.count}
						</span>
					</div>
				))}
			</div>

			{/* Półkole */}
			<svg viewBox={`0 0 ${width} ${height}`} className="hemicycle-svg">
				{/* Łuki pomocnicze */}
				{Array.from({ length: rows }).map((_, rowIndex) => {
					const radius =
						minRadius + (rowIndex / (rows - 1)) * (maxRadius - minRadius);
					return (
						<path
							key={`arc-${rowIndex}`}
							d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
							className="hemicycle-arc"
						/>
					);
				})}

				{/* Miejsca */}
				{seatPositions.map(({ x, y, seat }, idx) => (
					<g
						key={seat.id || idx}
						className={`hemicycle-seat ${seat.isEmpty ? "hemicycle-seat--empty" : ""}`}
						onClick={() => !seat.isEmpty && onSelect && onSelect(seat)}
						style={{ cursor: seat.isEmpty ? "default" : "pointer" }}
					>
						<circle
							cx={x}
							cy={y}
							r={7}
							fill={seat.isEmpty ? "none" : seat.group.color}
							stroke={seat.isEmpty ? "#ff4d4d" : "#ffffff"}
							strokeWidth={seat.isEmpty ? 1.5 : 1.5}
						/>
						{!seat.isEmpty && (
							<title>
								{seat.firstName} {seat.lastName} · {seat.group.name}
							</title>
						)}
					</g>
				))}
			</svg>
		</div>
	);
}

// ============================================================
// GŁÓWNY KOMPONENT
// ============================================================
export default function Parliamentarians() {
	const location = useLocation();
	const navigate = useNavigate();
	const [parliamentarians, setParliamentarians] = useState([]);
	const [unaffiliatedList, setUnaffiliatedList] = useState([]);
	const [clubsList, setClubsList] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedClubId, setSelectedClubId] = useState("all");
	const [selectedParliamentarian, setSelectedParliamentarian] = useState(null);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingParliamentarian, setEditingParliamentarian] = useState(null);

	const [isClubModalOpen, setIsClubModalOpen] = useState(false);
	const [editingClub, setEditingClub] = useState(null);

	const [adminMode, setAdminMode] = useState(false);
	const [viewMode, setViewMode] = useState("list"); // "list" | "hemicycle"

	const token = localStorage.getItem("token");

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);
				const membersRes = await fetch("/api/parliamentarians", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!membersRes.ok)
					throw new Error("Nie udało się pobrać parlamentarzystów");
				const membersData = await membersRes.json();

				const clubsRes = await fetch("/api/clubs", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!clubsRes.ok) throw new Error("Nie udało się pobrać klubów");
				const clubsData = await clubsRes.json();

				setParliamentarians(membersData.parliamentarians || []);
				setUnaffiliatedList(membersData.unaffiliated || []);
				setClubsList(clubsData || []);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		async function fetchUser() {
			try {
				const response = await fetch("/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					const user = await response.json();
					setIsAdmin(
						user.role === "admin" ||
							user.permissions?.includes("MANAGE_PARLIAMENTARIANS"),
					);
				}
			} catch {
				setIsAdmin(false);
			}
		}

		fetchData();
		fetchUser();
	}, [token]);

	const getClubMemberCount = (clubId) => {
		return parliamentarians.filter((p) => p.clubId === clubId).length;
	};

	const saveParliamentarian = async (newData) => {
		try {
			const response = await fetch("/api/parliamentarians", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(newData),
			});
			if (!response.ok) throw new Error("Nie udało się dodać parlamentarzysty");
			const saved = await response.json();

			if (editingParliamentarian) {
				setParliamentarians((prev) =>
					prev.map((p) => (p.id === saved.id ? saved : p)),
				);
			} else {
				setParliamentarians((prev) => [...prev, saved]);
			}
			setIsAddModalOpen(false);
			setEditingParliamentarian(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const deleteParliamentarian = async (id) => {
		if (!window.confirm("Czy na pewno chcesz usunąć tego parlamentarzystę?"))
			return;
		try {
			const response = await fetch(`/api/parliamentarians/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!response.ok)
				throw new Error("Nie udało się usunąć parlamentarzysty");
			setParliamentarians((prev) => prev.filter((p) => p.id !== id));
			setSelectedParliamentarian(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const openAddClubModal = () => {
		setEditingClub(null);
		setIsClubModalOpen(true);
	};

	const openEditClubModal = (club) => {
		setEditingClub(club);
		setIsClubModalOpen(true);
	};

	const saveClub = async (clubData) => {
		try {
			let url = "/api/clubs";
			let method = "POST";

			if (editingClub) {
				url = `/api/clubs/${editingClub.id}`;
				method = "PUT";
			}

			const response = await fetch(url, {
				method: method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(clubData),
			});
			if (!response.ok) throw new Error("Nie udało się zapisać klubu");
			const saved = await response.json();

			if (editingClub) {
				setClubsList((prev) =>
					prev.map((c) => (c.id === saved.id ? saved : c)),
				);
			} else {
				setClubsList((prev) => [...prev, saved]);
			}
			setIsClubModalOpen(false);
			setEditingClub(null);
		} catch (err) {
			setError(err.message);
		}
	};

	const deleteClub = async (clubId) => {
		if (!window.confirm("Czy na pewno chcesz usunąć ten klub/koło?")) return;
		try {
			const response = await fetch(`/api/clubs/${clubId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!response.ok) throw new Error("Nie udało się usunąć klubu");
			setClubsList((prev) => prev.filter((c) => c.id !== clubId));
			setParliamentarians((prev) =>
				prev.map((p) =>
					p.clubId === clubId
						? { ...p, clubId: null, clubName: null, clubColor: null }
						: p,
				),
			);
			if (selectedClubId === clubId) {
				setSelectedClubId("all");
			}
		} catch (err) {
			setError(err.message);
		}
	};

	const filteredParliamentarians = useMemo(() => {
		let result = [];

		if (selectedClubId === "unaffiliated") {
			result = [...unaffiliatedList];
		} else if (selectedClubId === "all") {
			result = [...parliamentarians, ...unaffiliatedList];
		} else {
			result = parliamentarians.filter((p) => p.clubId === selectedClubId);
		}

		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase().trim();
			result = result.filter((p) => {
				const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
				const clubName = p.clubName ? p.clubName.toLowerCase() : "";
				const functions = (p.functions || []).join(" ").toLowerCase();
				const commissions = (p.commissions || []).join(" ").toLowerCase();
				return (
					fullName.includes(search) ||
					clubName.includes(search) ||
					functions.includes(search) ||
					commissions.includes(search)
				);
			});
		}

		return result;
	}, [parliamentarians, unaffiliatedList, searchTerm, selectedClubId]);

	const totalClubs = clubsList.filter((c) => c.type === "klub").length;
	const totalCircles = clubsList.filter((c) => c.type === "koło").length;
	const totalCommittees = clubsList.filter((c) => c.type === "komitet").length;
	const totalSeats = parliamentarians.length + unaffiliatedList.length;

	const handleSelectClub = (clubId) => {
		setSelectedClubId(clubId === selectedClubId ? "all" : clubId);
		setSelectedParliamentarian(null);
	};

	const clearAllFilters = () => {
		setSearchTerm("");
		setSelectedClubId("all");
		setSelectedParliamentarian(null);
	};

	const openAddModal = () => {
		setEditingParliamentarian(null);
		setIsAddModalOpen(true);
	};

	const openEditModal = (p) => {
		setEditingParliamentarian(p);
		setIsAddModalOpen(true);
	};

	const polishPlural = (count, one, few, many) => {
		if (count === 1) return one;
		if (
			count % 10 >= 2 &&
			count % 10 <= 4 &&
			!(count % 100 >= 12 && count % 100 <= 14)
		) {
			return few;
		}
		return many;
	};

	return (
		<div className="parliamentarians-page">
			<button className="back-to-home-btn" onClick={() => navigate("/")}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M15 18L9 12L15 6"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				Strona główna
			</button>

			<section className="stats-section">
				<div className="stat-card">
					<span className="stat-number">{totalSeats}</span>
					<span className="stat-label">
						{polishPlural(totalSeats, "Mandat", "Mandaty", "Mandatów")}
					</span>
				</div>
				<div className="stat-card">
					<span className="stat-number">{totalClubs}</span>
					<span className="stat-label">
						{polishPlural(totalClubs, "Klub", "Kluby", "Klubów")}
					</span>
				</div>
				<div className="stat-card">
					<span className="stat-number">{totalCircles}</span>
					<span className="stat-label">
						{polishPlural(totalCircles, "Koło", "Koła", "Kół")}
					</span>
				</div>
				<div className="stat-card">
					<span className="stat-number">{totalCommittees}</span>
					<span className="stat-label">
						{polishPlural(totalCommittees, "Komitet", "Komitety", "Komitetów")}
					</span>
				</div>
				<div className="stat-card">
					<span className="stat-number">{unaffiliatedList.length}</span>
					<span className="stat-label">
						{polishPlural(
							unaffiliatedList.length,
							"Niezrzeszony",
							"Niezrzeszonych",
							"Niezrzeszonych",
						)}
					</span>
				</div>
				<AdminToggle
					isAdmin={isAdmin}
					adminMode={adminMode}
					setAdminMode={setAdminMode}
				/>
			</section>

			{/* ✅ Przełącznik widoku */}
			<div className="view-toggle">
				<button
					className={`view-toggle__btn ${viewMode === "list" ? "active" : ""}`}
					onClick={() => setViewMode("list")}
				>
					Widok listy
				</button>
				<button
					className={`view-toggle__btn ${viewMode === "hemicycle" ? "active" : ""}`}
					onClick={() => setViewMode("hemicycle")}
				>
					Układ sali
				</button>
			</div>

			{viewMode === "hemicycle" ? (
				<Hemicycle
					parliamentarians={parliamentarians}
					unaffiliated={unaffiliatedList}
					clubs={clubsList}
					onSelect={setSelectedParliamentarian}
				/>
			) : (
				<div
					className={`parliamentarians-content ${isAdmin && adminMode ? "admin" : ""}`}
				>
					<aside
						className={`clubs-panel ${isAdmin && adminMode ? "admin" : ""}`}
					>
						<div className="panel-header">
							<h2>Kluby i koła</h2>
							<div className="panel-actions">
								{(selectedClubId !== "all" || searchTerm) && (
									<button className="clear-filter" onClick={clearAllFilters}>
										Wyczyść filtry
									</button>
								)}
								{isAdmin && adminMode && (
									<button className="add-club-btn" onClick={openAddClubModal}>
										+ Dodaj
									</button>
								)}
							</div>
						</div>
						<ul className="clubs-list">
							{clubsList.map((club) => (
								<li
									key={club.id}
									className={`club-item ${selectedClubId === club.id ? "active" : ""}`}
									onClick={() => handleSelectClub(club.id)}
								>
									<span
										className="club-color"
										style={{ backgroundColor: club.color }}
									></span>
									<span className="club-name">{club.name}</span>
									<span className="club-count">
										{getClubMemberCount(club.id)}
									</span>
									<span className="club-type-badge">{club.type}</span>
									{isAdmin && adminMode && (
										<div
											className="club-admin-actions"
											onClick={(e) => e.stopPropagation()}
										>
											<button
												className="club-edit-btn"
												onClick={() => openEditClubModal(club)}
												title="Edytuj"
											>
												✏️
											</button>
											<button
												className="club-delete-btn"
												onClick={() => deleteClub(club.id)}
												title="Usuń"
											>
												❌
											</button>
										</div>
									)}
								</li>
							))}
							<li
								className={`club-item ${selectedClubId === "unaffiliated" ? "active" : ""}`}
								onClick={() => handleSelectClub("unaffiliated")}
							>
								<span
									className="club-color"
									style={{ backgroundColor: "#94a3b8" }}
								></span>
								<span className="club-name">Niezrzeszeni</span>
								<span className="club-count">{unaffiliatedList.length}</span>
							</li>
						</ul>
					</aside>

					<main className="members-panel">
						<div className="search-bar">
							<input
								type="text"
								placeholder="Szukaj po imieniu, nazwisku, klubie..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							{searchTerm && (
								<button
									className="clear-filter"
									onClick={() => setSearchTerm("")}
								>
									✕
								</button>
							)}
						</div>

						{isAdmin && adminMode && (
							<button className="add-member-btn" onClick={openAddModal}>
								+ Dodaj parlamentarzystę
							</button>
						)}

						{isClubModalOpen && (
							<ClubModal
								club={editingClub}
								onSave={saveClub}
								onClose={() => {
									setIsClubModalOpen(false);
									setEditingClub(null);
								}}
							/>
						)}

						<div className="members-grid">
							{filteredParliamentarians.length === 0 ? (
								<p className="no-results">
									Brak parlamentarzystów spełniających kryteria.
								</p>
							) : (
								filteredParliamentarians.map((p) => (
									<div
										key={p.id}
										className={`member-card ${selectedParliamentarian?.id === p.id ? "selected" : ""}`}
										onClick={() => setSelectedParliamentarian(p)}
									>
										<div className="member-avatar">
											{p.firstName.charAt(0)}
											{p.lastName.charAt(0)}
										</div>
										<div className="member-info">
											<h4>
												{p.firstName} {p.lastName}
											</h4>
											{p.clubName && (
												<span
													className="member-club"
													style={{ color: p.clubColor }}
												>
													{p.clubName}
												</span>
											)}

											{p.functions.length > 0 && (
												<div className="member-functions">
													{p.functions.map((f, i) => (
														<span key={i} className="function-badge">
															{f}
														</span>
													))}
												</div>
											)}
										</div>

										{isAdmin && adminMode && (
											<div className="admin-actions">
												<button
													onClick={(e) => {
														e.stopPropagation();
														openEditModal(p);
													}}
												>
													Edytuj
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														deleteParliamentarian(p.id);
													}}
												>
													Usuń
												</button>
											</div>
										)}
									</div>
								))
							)}
						</div>
					</main>
				</div>
			)}

			{selectedParliamentarian && !isAddModalOpen && (
				<ModalPortal onClose={() => setSelectedParliamentarian(null)}>
					<div className="modal-header">
						<div className="modal-avatar">
							{selectedParliamentarian.firstName.charAt(0)}
							{selectedParliamentarian.lastName.charAt(0)}
						</div>
						<div className="info-wrapper">
							<h2>
								{selectedParliamentarian.firstName}{" "}
								{selectedParliamentarian.lastName}
							</h2>
							{selectedParliamentarian.clubName && (
								<div className="club-info">
									<span
										className="club-dot"
										style={{
											backgroundColor: selectedParliamentarian.clubColor,
										}}
									></span>
									<p
										className="club-name"
										style={{
											color: selectedParliamentarian.clubColor,
										}}
									>
										{selectedParliamentarian.clubName}
									</p>
								</div>
							)}
						</div>
						<button
							className="modal-close"
							onClick={() => setSelectedParliamentarian(null)}
						>
							✕
						</button>
					</div>

					<div className="modal-body">
						<div className="member-stats">
							<div className="stat-chip">
								<span className="stat-label">Funkcje</span>
								<span className="stat-value">
									{selectedParliamentarian.functions.length}
								</span>
							</div>
							<div className="stat-chip">
								<span className="stat-label">Komisje</span>
								<span className="stat-value">
									{selectedParliamentarian.commissions.length}
								</span>
							</div>
						</div>

						{selectedParliamentarian.functions.length > 0 && (
							<div>
								<h3>Funkcje / Role</h3>
								<ul>
									{selectedParliamentarian.functions.map((f, i) => (
										<li key={i}>
											<span className="item-content">{f}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{selectedParliamentarian.commissions.length > 0 && (
							<div>
								<h3>Komisje</h3>
								<ul>
									{selectedParliamentarian.commissions.map((c, i) => (
										<li key={i}>
											<span className="item-content">{c}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{!selectedParliamentarian.functions.length &&
							!selectedParliamentarian.commissions.length && (
								<div className="no-info">
									Brak dodatkowych informacji o tym parlamentarzyście.
									<div className="sub-text">
										Nie pełni żadnych funkcji ani nie należy do komisji.
									</div>
								</div>
							)}
					</div>
				</ModalPortal>
			)}

			{isAddModalOpen && (
				<AddEditModal
					parliamentarian={editingParliamentarian}
					onSave={saveParliamentarian}
					onClose={() => {
						setIsAddModalOpen(false);
						setEditingParliamentarian(null);
					}}
					clubs={clubsList}
				/>
			)}
		</div>
	);
}

// ============================================================
// AdminToggle
// ============================================================
function AdminToggle({ isAdmin, adminMode, setAdminMode }) {
	if (!isAdmin) return null;
	return (
		<div className="admin-toggle-container">
			<span className="admin-toggle-label">
				{adminMode ? "Tryb Admina" : "Tryb Użytkownika"}
			</span>
			<label className="admin-toggle">
				<input
					type="checkbox"
					checked={adminMode}
					onChange={() => setAdminMode(!adminMode)}
				/>
				<span className="admin-toggle-slider"></span>
			</label>
		</div>
	);
}

// ============================================================
// ClubModal
// ============================================================
function ClubModal({ club, onSave, onClose }) {
	const [form, setForm] = useState({
		name: club?.name || "",
		type: club?.type || "klub",
		color:
			club?.color || "#" + Math.floor(Math.random() * 16777215).toString(16),
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!form.name.trim()) {
			alert("Nazwa klubu/koła jest wymagana!");
			return;
		}
		onSave(form);
	};

	return (
		<ModalPortal onClose={onClose}>
			<h2 style={{ margin: "0 0 1.5rem 0", color: "#002b5c" }}>
				{club ? "Edytuj klub/koło" : "Dodaj nowy klub/koło"}
			</h2>

			<form onSubmit={handleSubmit}>
				<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					<input
						type="text"
						placeholder="Nazwa klubu/koła"
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
						required
					/>

					<div>
						<label
							style={{
								display: "block",
								marginBottom: "6px",
								fontWeight: "600",
							}}
						>
							Typ
						</label>
						<select
							value={form.type}
							onChange={(e) => setForm({ ...form, type: e.target.value })}
							style={{
								width: "100%",
								padding: "12px 16px",
								borderRadius: "12px",
								border: "2px solid #e2e8f0",
							}}
						>
							<option value="klub">Klub</option>
							<option value="koło">Koło</option>
							<option value="komitet">Komitet</option>
						</select>
					</div>

					<div>
						<label
							style={{
								display: "block",
								marginBottom: "6px",
								fontWeight: "600",
							}}
						>
							Kolor
						</label>
						<div
							style={{
								display: "flex",
								gap: "12px",
								alignItems: "center",
							}}
						>
							<input
								type="color"
								value={form.color}
								onChange={(e) => setForm({ ...form, color: e.target.value })}
								style={{
									width: "60px",
									height: "60px",
									padding: "4px",
									cursor: "pointer",
								}}
							/>
							<input
								type="text"
								value={form.color}
								onChange={(e) => setForm({ ...form, color: e.target.value })}
								placeholder="#000000"
								style={{
									flex: 1,
									padding: "12px 16px",
									borderRadius: "12px",
									border: "2px solid #e2e8f0",
								}}
							/>
						</div>
					</div>
				</div>

				<div className="modal-actions" style={{ marginTop: "1.5rem" }}>
					<button type="button" onClick={onClose}>
						Anuluj
					</button>
					<button type="submit">{club ? "Zapisz zmiany" : "Dodaj klub"}</button>
				</div>
			</form>
		</ModalPortal>
	);
}

// ============================================================
// AddEditModal
// ============================================================
function AddEditModal({ parliamentarian, onSave, onClose, clubs }) {
	const [form, setForm] = useState({
		firstName: parliamentarian?.firstName || "",
		lastName: parliamentarian?.lastName || "",
		clubId: parliamentarian?.clubId || null,
		functions: parliamentarian?.functions || [],
		commissions: parliamentarian?.commissions || [],
	});

	const [newFunction, setNewFunction] = useState("");
	const [newCommission, setNewCommission] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!form.firstName || !form.lastName) {
			alert("Imię i nazwisko są wymagane!");
			return;
		}
		onSave(form);
	};

	const addFunction = () => {
		if (newFunction.trim()) {
			setForm((prev) => ({
				...prev,
				functions: [...prev.functions, newFunction.trim()],
			}));
			setNewFunction("");
		}
	};

	const removeFunction = (index) => {
		setForm((prev) => ({
			...prev,
			functions: prev.functions.filter((_, i) => i !== index),
		}));
	};

	const addCommission = () => {
		if (newCommission.trim()) {
			setForm((prev) => ({
				...prev,
				commissions: [...prev.commissions, newCommission.trim()],
			}));
			setNewCommission("");
		}
	};

	const removeCommission = (index) => {
		setForm((prev) => ({
			...prev,
			commissions: prev.commissions.filter((_, i) => i !== index),
		}));
	};

	return (
		<ModalPortal onClose={onClose}>
			<h2 style={{ margin: "0 0 1.5rem 0", color: "#002b5c" }}>
				{parliamentarian
					? "Edytuj parlamentarzystę"
					: "Dodaj nowego parlamentarzystę"}
			</h2>

			<form onSubmit={handleSubmit}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "1rem",
					}}
				>
					<input
						type="text"
						placeholder="Imię"
						value={form.firstName}
						onChange={(e) => setForm({ ...form, firstName: e.target.value })}
						required
					/>
					<input
						type="text"
						placeholder="Nazwisko"
						value={form.lastName}
						onChange={(e) => setForm({ ...form, lastName: e.target.value })}
						required
					/>
				</div>

				<div>
					<label
						style={{
							display: "block",
							marginBottom: "6px",
							fontWeight: "600",
						}}
					>
						Klub / Koło
					</label>
					<select
						value={form.clubId || ""}
						onChange={(e) =>
							setForm({
								...form,
								clubId: e.target.value ? Number(e.target.value) : null,
							})
						}
						style={{ width: "100%", padding: "12px 16px" }}
					>
						<option value="">— Niezrzeszony —</option>
						{clubs.map((club) => (
							<option key={club.id} value={club.id}>
								{club.name} ({club.type})
							</option>
						))}
					</select>
				</div>

				<div>
					<label
						style={{
							display: "block",
							marginBottom: "8px",
							fontWeight: "600",
						}}
					>
						Funkcje / Role
					</label>
					<div
						style={{
							display: "flex",
							gap: "8px",
							marginBottom: "8px",
						}}
					>
						<input
							type="text"
							placeholder="Np. Przewodniczący komisji..."
							value={newFunction}
							onChange={(e) => setNewFunction(e.target.value)}
							style={{ flex: 1 }}
						/>
						<button type="button" onClick={addFunction}>
							Dodaj
						</button>
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
						{form.functions.map((func, i) => (
							<span
								key={i}
								style={{
									background: "#e0f2fe",
									padding: "6px 12px",
									borderRadius: "999px",
									fontSize: "0.9rem",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								{func}
								<button
									type="button"
									onClick={() => removeFunction(i)}
									style={{
										background: "none",
										border: "none",
										color: "#ef4444",
										cursor: "pointer",
									}}
								>
									×
								</button>
							</span>
						))}
					</div>
				</div>

				<div>
					<label
						style={{
							display: "block",
							marginTop: "9px",
							marginBottom: "8px",
							fontWeight: "600",
						}}
					>
						Komisje
					</label>
					<div
						style={{
							display: "flex",
							gap: "8px",
							marginBottom: "8px",
						}}
					>
						<input
							type="text"
							placeholder="Np. Komisja Spraw Zagranicznych"
							value={newCommission}
							onChange={(e) => setNewCommission(e.target.value)}
							style={{ flex: 1 }}
						/>
						<button type="button" onClick={addCommission}>
							Dodaj
						</button>
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
						{form.commissions.map((comm, i) => (
							<span
								key={i}
								style={{
									background: "#f3e8ff",
									padding: "6px 12px",
									borderRadius: "999px",
									fontSize: "0.9rem",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								{comm}
								<button
									type="button"
									onClick={() => removeCommission(i)}
									style={{
										background: "none",
										border: "none",
										color: "#ef4444",
										cursor: "pointer",
									}}
								>
									×
								</button>
							</span>
						))}
					</div>
				</div>

				<div className="modal-actions">
					<button type="button" onClick={onClose}>
						Anuluj
					</button>
					<button type="submit">Zapisz parlamentarzystę</button>
				</div>
			</form>
		</ModalPortal>
	);
}
