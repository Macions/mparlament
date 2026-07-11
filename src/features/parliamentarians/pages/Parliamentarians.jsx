import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Parliamentarians.css";
import {
	clubs,
	allParliamentarians as initialParliamentarians,
	unaffiliated as initialUnaffiliated,
} from "../../../data/mockData";

const isAdmin = false;

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

export default function Parliamentarians() {
	const [parliamentarians, setParliamentarians] = useState(
		initialParliamentarians,
	);
	const [unaffiliatedList, setUnaffiliatedList] = useState(initialUnaffiliated);

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedClubId, setSelectedClubId] = useState("all");
	const [selectedParliamentarian, setSelectedParliamentarian] = useState(null);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingParliamentarian, setEditingParliamentarian] = useState(null);

	const [clubsList, setClubsList] = useState(clubs);
	const [isClubModalOpen, setIsClubModalOpen] = useState(false);
	const [editingClub, setEditingClub] = useState(null);

	const [adminMode, setAdminMode] = useState(false);

	const [isManageMembersModalOpen, setIsManageMembersModalOpen] =
		useState(false);
	const [selectedClubForMembers, setSelectedClubForMembers] = useState(null);

	const openManageMembersModal = (club) => {
		setSelectedClubForMembers(club);
		setIsManageMembersModalOpen(true);
	};

	const closeManageMembersModal = () => {
		setIsManageMembersModalOpen(false);
		setSelectedClubForMembers(null);
	};

	const addMemberToClub = (clubId, memberId) => {
		const member = parliamentarians.find((p) => p.id === memberId);
		if (!member) return;

		setParliamentarians((prev) =>
			prev.map((p) => {
				if (p.id === memberId) {
					const club = clubsList.find((c) => c.id === clubId);
					return {
						...p,
						clubId: clubId,
						clubName: club.name,
						clubType: club.type,
						clubColor: club.color,
					};
				}
				return p;
			}),
		);

		setClubsList((prev) =>
			prev.map((c) => {
				if (c.id === clubId) {
					const exists = c.members.some((m) => m.id === memberId);
					if (!exists) {
						return {
							...c,
							members: [
								...c.members,
								{
									id: memberId,
									firstName: member.firstName,
									lastName: member.lastName,
									functions: member.functions || [],
									commissions: member.commissions || [],
								},
							],
						};
					}
				}
				return c;
			}),
		);

		setUnaffiliatedList((prev) => prev.filter((u) => u.id !== memberId));
	};

	const removeMemberFromClub = (clubId, memberId) => {
		setClubsList((prev) =>
			prev.map((c) => {
				if (c.id === clubId) {
					return {
						...c,
						members: c.members.filter((m) => m.id !== memberId),
					};
				}
				return c;
			}),
		);

		const member = parliamentarians.find((p) => p.id === memberId);
		if (member) {
			setParliamentarians((prev) =>
				prev.map((p) => {
					if (p.id === memberId) {
						return {
							...p,
							clubId: null,
							clubName: null,
							clubType: null,
							clubColor: null,
						};
					}
					return p;
				}),
			);

			setUnaffiliatedList((prev) => [
				...prev,
				{
					id: member.id,
					firstName: member.firstName,
					lastName: member.lastName,
					functions: member.functions || [],
					commissions: member.commissions || [],
					clubId: null,
				},
			]);
		}
	};

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

	const openAddClubModal = () => {
		setEditingClub(null);
		setIsClubModalOpen(true);
	};

	const openEditClubModal = (club) => {
		setEditingClub(club);
		setIsClubModalOpen(true);
	};

	const saveClub = (clubData) => {
		if (editingClub) {
			setClubsList((prev) =>
				prev.map((c) =>
					c.id === editingClub.id
						? { ...clubData, id: c.id, members: c.members || [] }
						: c,
				),
			);
		} else {
			const newClub = {
				...clubData,
				id: Math.max(...clubsList.map((c) => c.id), 0) + 1,
				members: [],
			};
			setClubsList((prev) => [...prev, newClub]);
		}
		setIsClubModalOpen(false);
		setEditingClub(null);
	};

	const deleteClub = (clubId) => {
		if (window.confirm(`Czy na pewno chcesz usunąć ten klub/koło?`)) {
			setClubsList((prev) => prev.filter((c) => c.id !== clubId));

			setParliamentarians((prev) => prev.filter((p) => p.clubId !== clubId));
			if (selectedClubId === clubId) {
				setSelectedClubId("all");
			}
		}
	};

	const filteredParliamentarians = useMemo(() => {
		let result = [...parliamentarians];

		if (selectedClubId === "unaffiliated") {
			result = result.filter(
				(p) => p.clubId === null || p.clubId === undefined,
			);
		} else if (selectedClubId !== "all") {
			result = result.filter((p) => p.clubId === selectedClubId);
		}

		if (searchTerm.trim()) {
			const search = searchTerm.toLowerCase().trim();
			result = result.filter((p) => {
				const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
				const clubName = p.clubName ? p.clubName.toLowerCase() : "";
				const functions = p.functions.join(" ").toLowerCase();
				const commissions = p.commissions.join(" ").toLowerCase();
				return (
					fullName.includes(search) ||
					clubName.includes(search) ||
					functions.includes(search) ||
					commissions.includes(search)
				);
			});
		}

		return result;
	}, [parliamentarians, searchTerm, selectedClubId, clubsList]);

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

	const saveParliamentarian = (newData) => {
		if (editingParliamentarian) {
			setParliamentarians((prev) =>
				prev.map((p) =>
					p.id === editingParliamentarian.id ? { ...newData, id: p.id } : p,
				),
			);
		} else {
			const newMember = {
				...newData,
				id: Date.now(),
			};
			setParliamentarians((prev) => [...prev, newMember]);
		}
		setIsAddModalOpen(false);
		setEditingParliamentarian(null);
	};

	const deleteParliamentarian = (id) => {
		if (window.confirm("Czy na pewno chcesz usunąć tego parlamentarzystę?")) {
			setParliamentarians((prev) => prev.filter((p) => p.id !== id));
			setSelectedParliamentarian(null);
		}
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

			<div
				className={`parliamentarians-content ${isAdmin && adminMode ? "admin" : ""}`}
			>
				<aside className={`clubs-panel ${isAdmin && adminMode ? "admin" : ""}`}>
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
								<span className="club-count">{club.members.length}</span>
								<span className="club-type-badge">{club.type}</span>
								{isAdmin && adminMode && (
									<div
										className="club-admin-actions"
										onClick={(e) => e.stopPropagation()}
									>
										<button
											className="club-members-btn"
											onClick={() => openManageMembersModal(club)}
											title="Zarządzaj członkami"
										>
											
										</button>
										<button
											className="club-edit-btn"
											onClick={() => openEditClubModal(club)}
											title="Edytuj"
										>
											
										</button>
										<button
											className="club-delete-btn"
											onClick={() => deleteClub(club.id)}
											title="Usuń"
										>
											×
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
					{}
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
										style={{ color: selectedParliamentarian.clubColor }}
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
								<h3>
									Funkcje / Role
									<span className="badge-count">
										{selectedParliamentarian.functions.length}
									</span>
								</h3>
								<ul>
									{selectedParliamentarian.functions.map((f, i) => (
										<li key={i}>
											<span className="item-content">{f}</span>
											<span className="item-badge">Funkcja</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{selectedParliamentarian.commissions.length > 0 && (
							<div>
								<h3>
									Komisje
									<span className="badge-count purple">
										{selectedParliamentarian.commissions.length}
									</span>
								</h3>
								<ul>
									{selectedParliamentarian.commissions.map((c, i) => (
										<li key={i}>
											<span className="item-content">{c}</span>
											<span className="item-badge commission">Komisja</span>
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
			{}
			{isManageMembersModalOpen && selectedClubForMembers && (
				<ManageMembersModal
					club={selectedClubForMembers}
					members={selectedClubForMembers.members || []}
					allParliamentarians={parliamentarians}
					onAdd={addMemberToClub}
					onRemove={removeMemberFromClub}
					onClose={closeManageMembersModal}
				/>
			)}
		</div>
	);
}

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
						<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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

function ManageMembersModal({
	club,
	members,
	allParliamentarians,
	onAdd,
	onRemove,
	onClose,
}) {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedMembers, setSelectedMembers] = useState([]);

	const clubMemberIds = members.map((m) => m.id);

	const availableMembers = allParliamentarians.filter(
		(p) => !clubMemberIds.includes(p.id) && p.id !== undefined,
	);

	const filteredAvailable = availableMembers.filter((p) => {
		const search = searchTerm.toLowerCase().trim();
		if (!search) return true;
		const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
		return fullName.includes(search);
	});

	const handleAddMembers = () => {
		if (selectedMembers.length === 0) {
			alert("Wybierz przynajmniej jednego parlamentarzystę!");
			return;
		}
		selectedMembers.forEach((id) => {
			onAdd(club.id, id);
		});
		setSelectedMembers([]);
		setSearchTerm("");
	};

	const handleRemoveMember = (memberId) => {
		if (window.confirm("Czy na pewno chcesz usunąć tego członka z klubu?")) {
			onRemove(club.id, memberId);
		}
	};

	const toggleMemberSelection = (id) => {
		setSelectedMembers((prev) =>
			prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id],
		);
	};

	return (
		<ModalPortal onClose={onClose}>
			<h2 style={{ margin: "0 0 1.5rem 0", color: "#002b5c" }}>
				Zarządzaj członkami: {club.name}
			</h2>

			<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
				{}
				<div>
					<h3
						style={{
							margin: "0 0 0.75rem 0",
							fontSize: "1.1rem",
							color: "#1e2937",
						}}
					>
						Aktualni członkowie ({members.length})
					</h3>
					<div
						style={{
							maxHeight: "200px",
							overflowY: "auto",
							border: "2px solid #e2e8f0",
							borderRadius: "12px",
							padding: "8px",
						}}
					>
						{members.length === 0 ? (
							<p
								style={{
									padding: "1rem",
									textAlign: "center",
									color: "#94a3b8",
								}}
							>
								Brak członków w tym klubie
							</p>
						) : (
							members.map((m) => (
								<div
									key={m.id}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "10px 14px",
										borderBottom: "1px solid #f1f5f9",
										gap: "12px",
									}}
								>
									<span style={{ fontWeight: "500" }}>
										{m.firstName} {m.lastName}
									</span>
									<button
										onClick={() => handleRemoveMember(m.id)}
										style={{
											padding: "4px 14px",
											background: "#fee2e2",
											color: "#ef4444",
											border: "none",
											borderRadius: "8px",
											cursor: "pointer",
											fontWeight: "600",
										}}
									>
										Usuń
									</button>
								</div>
							))
						)}
					</div>
				</div>

				{}
				<div>
					<h3
						style={{
							margin: "0 0 0.75rem 0",
							fontSize: "1.1rem",
							color: "#1e2937",
						}}
					>
						Dodaj parlamentarzystów
					</h3>

					<div style={{ marginBottom: "12px" }}>
						<input
							type="text"
							placeholder="Szukaj parlamentarzysty..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							style={{
								width: "100%",
								padding: "12px 16px",
								border: "2px solid #e2e8f0",
								borderRadius: "12px",
								fontSize: "1rem",
							}}
						/>
					</div>

					<div
						style={{
							maxHeight: "200px",
							overflowY: "auto",
							border: "2px solid #e2e8f0",
							borderRadius: "12px",
							padding: "8px",
						}}
					>
						{filteredAvailable.length === 0 ? (
							<p
								style={{
									padding: "1rem",
									textAlign: "center",
									color: "#94a3b8",
								}}
							>
								{searchTerm
									? "Nie znaleziono parlamentarzystów"
									: "Brak dostępnych parlamentarzystów"}
							</p>
						) : (
							filteredAvailable.map((p) => (
								<div
									key={p.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
										padding: "10px 14px",
										borderBottom: "1px solid #f1f5f9",
										cursor: "pointer",
										background: selectedMembers.includes(p.id)
											? "#eff6ff"
											: "transparent",
										transition: "background 0.2s",
									}}
									onClick={() => toggleMemberSelection(p.id)}
								>
									<input
										type="checkbox"
										checked={selectedMembers.includes(p.id)}
										onChange={() => toggleMemberSelection(p.id)}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
									/>
									<span style={{ fontWeight: "500" }}>
										{p.firstName} {p.lastName}
									</span>
									{p.clubName && (
										<span
											style={{
												fontSize: "0.8rem",
												color: "#64748b",
												marginLeft: "auto",
											}}
										>
											{p.clubName}
										</span>
									)}
								</div>
							))
						)}
					</div>

					<button
						onClick={handleAddMembers}
						style={{
							marginTop: "1rem",
							padding: "12px 24px",
							background: "#002b5c",
							color: "white",
							border: "none",
							borderRadius: "12px",
							fontWeight: "600",
							fontSize: "1rem",
							cursor: "pointer",
							width: "100%",
							transition: "all 0.3s",
						}}
						onMouseEnter={(e) => (e.target.style.background = "#003d80")}
						onMouseLeave={(e) => (e.target.style.background = "#002b5c")}
					>
						Dodaj wybranych ({selectedMembers.length})
					</button>
				</div>
			</div>

			<div className="modal-actions" style={{ marginTop: "1.5rem" }}>
				<button type="button" onClick={onClose}>
					Zamknij
				</button>
			</div>
		</ModalPortal>
	);
}
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

	const selectedClub = clubs.find((c) => c.id === form.clubId);

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
						style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}
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
						style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
					>
						Funkcje / Role
					</label>
					<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
						style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
					>
						Komisje
					</label>
					<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
