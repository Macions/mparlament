import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Parliamentarians.css";
import {
    clubs,
    allParliamentarians as initialParliamentarians,
    unaffiliated as initialUnaffiliated,
} from "../../../data/mockData";

const isAdmin = false; // ← zmienna admina

// Modal przez Portal
const ModalPortal = ({ children, onClose }) => {
    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default function Parliamentarians() {
    const [parliamentarians, setParliamentarians] = useState(initialParliamentarians);
    const [unaffiliatedList, setUnaffiliatedList] = useState(initialUnaffiliated);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClubId, setSelectedClubId] = useState(null); // null = wszyscy / niezrzeszeni
    const [selectedParliamentarian, setSelectedParliamentarian] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingParliamentarian, setEditingParliamentarian] = useState(null);

    // Filtracja
    const filteredParliamentarians = useMemo(() => {
        let result = [...parliamentarians];

        if (selectedClubId !== null) {
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
    }, [parliamentarians, searchTerm, selectedClubId]);

    // Statystyki
    const totalSeats = parliamentarians.length + unaffiliatedList.length;
    const totalClubs = clubs.filter((c) => c.type === "klub").length;
    const totalCircles = clubs.filter((c) => c.type === "koło").length;

    const handleSelectClub = (clubId) => {
        setSelectedClubId(clubId === selectedClubId ? null : clubId);
        setSelectedParliamentarian(null);
    };

    const clearAllFilters = () => {
        setSearchTerm("");
        setSelectedClubId(null);
        setSelectedParliamentarian(null);
    };

    // ===================== ADMIN =====================
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
            // Edycja
            setParliamentarians(prev =>
                prev.map(p => p.id === editingParliamentarian.id ? { ...newData, id: p.id } : p)
            );
        } else {
            // Dodawanie nowego
            const newMember = {
                ...newData,
                id: Date.now(),
            };
            setParliamentarians(prev => [...prev, newMember]);
        }
        setIsAddModalOpen(false);
        setEditingParliamentarian(null);
    };

    const deleteParliamentarian = (id) => {
        if (window.confirm("Czy na pewno chcesz usunąć tego parlamentarzystę?")) {
            setParliamentarians(prev => prev.filter(p => p.id !== id));
            setSelectedParliamentarian(null);
        }
    };

    return (
        <div className="parliamentarians-page">
            {/* Statystyki */}
            <section className="stats-section">
                <div className="stat-card">
                    <span className="stat-number">{totalSeats}</span>
                    <span className="stat-label">Mandaty</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{totalClubs}</span>
                    <span className="stat-label">Kluby</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{totalCircles}</span>
                    <span className="stat-label">Koła</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{unaffiliatedList.length}</span>
                    <span className="stat-label">Niezrzeszeni</span>
                </div>
            </section>

            {/* Główna zawartość */}
            <div className="parliamentarians-content">
                <aside className="clubs-panel">
                    <div className="panel-header">
                        <h2>Kluby i koła</h2>
                        {(selectedClubId !== null || searchTerm) && (
                            <button className="clear-filter" onClick={clearAllFilters}>
                                Wyczyść filtry
                            </button>
                        )}
                    </div>

                    <ul className="clubs-list">
                        {clubs.map((club) => (
                            <li
                                key={club.id}
                                className={`club-item ${selectedClubId === club.id ? "active" : ""}`}
                                onClick={() => handleSelectClub(club.id)}
                            >
                                <span className="club-color" style={{ backgroundColor: club.color }}></span>
                                <span className="club-name">{club.name}</span>
                                <span className="club-count">{club.members.length}</span>
                                <span className="club-type-badge">{club.type}</span>
                            </li>
                        ))}
                        <li
                            className={`club-item ${selectedClubId === null ? "active" : ""}`}
                            onClick={() => handleSelectClub(null)}
                        >
                            <span className="club-color" style={{ backgroundColor: "#94a3b8" }}></span>
                            <span className="club-name">Niezrzeszeni</span>
                            <span className="club-count">{unaffiliatedList.length}</span>
                            <span className="club-type-badge">brak</span>
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
                            <button className="clear-filter" onClick={() => setSearchTerm("")}>
                                ✕
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <button className="add-member-btn" onClick={openAddModal}>
                            + Dodaj parlamentarzystę
                        </button>
                    )}

                    <div className="members-grid">
                        {filteredParliamentarians.length === 0 ? (
                            <p className="no-results">Brak parlamentarzystów spełniających kryteria.</p>
                        ) : (
                            filteredParliamentarians.map((p) => (
                                <div
                                    key={p.id}
                                    className={`member-card ${selectedParliamentarian?.id === p.id ? "selected" : ""}`}
                                    onClick={() => setSelectedParliamentarian(p)}
                                >
                                    <div className="member-avatar">
                                        {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                    </div>
                                    <div className="member-info">
                                        <h4>{p.firstName} {p.lastName}</h4>
                                        {p.clubName && <span className="member-club" style={{ color: p.clubColor }}>{p.clubName}</span>}

                                        {p.functions.length > 0 && (
                                            <div className="member-functions">
                                                {p.functions.map((f, i) => <span key={i} className="function-badge">{f}</span>)}
                                            </div>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <div className="admin-actions">
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>Edytuj</button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteParliamentarian(p.id); }}>Usuń</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>

            {/* Modal szczegółów */}
            {selectedParliamentarian && !isAddModalOpen && (
                <ModalPortal onClose={() => setSelectedParliamentarian(null)}>
                    <div className="modal-header">
                        <div className="modal-avatar">
                            {selectedParliamentarian.firstName.charAt(0)}
                            {selectedParliamentarian.lastName.charAt(0)}
                        </div>
                        <div>
                            <h2>
                                {selectedParliamentarian.firstName} {selectedParliamentarian.lastName}
                            </h2>
                            {selectedParliamentarian.clubName && (
                                <p style={{ color: selectedParliamentarian.clubColor }}>
                                    {selectedParliamentarian.clubName}
                                </p>
                            )}
                        </div>
                        <button className="modal-close" onClick={() => setSelectedParliamentarian(null)}>
                            ✕
                        </button>
                    </div>
                    <div className="modal-body">
                        {selectedParliamentarian.functions.length > 0 && (
                            <div>
                                <h3>Funkcje / Role</h3>
                                <ul>
                                    {selectedParliamentarian.functions.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {selectedParliamentarian.commissions.length > 0 && (
                            <div>
                                <h3>Komisje</h3>
                                <ul>
                                    {selectedParliamentarian.commissions.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {!selectedParliamentarian.functions.length &&
                            !selectedParliamentarian.commissions.length && (
                                <p>Brak dodatkowych informacji.</p>
                            )}
                    </div>
                </ModalPortal>
            )}

            {/* Modal dodawania/edycji */}
            {isAddModalOpen && (
                <AddEditModal
                    parliamentarian={editingParliamentarian}
                    onSave={saveParliamentarian}
                    onClose={() => { setIsAddModalOpen(false); setEditingParliamentarian(null); }}
                    clubs={clubs}
                />
            )}
        </div>
    );
}

/* ===================== MODAL DODAWANIA / EDYCJI ===================== */
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

    const selectedClub = clubs.find(c => c.id === form.clubId);

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
            setForm(prev => ({
                ...prev,
                functions: [...prev.functions, newFunction.trim()]
            }));
            setNewFunction("");
        }
    };

    const removeFunction = (index) => {
        setForm(prev => ({
            ...prev,
            functions: prev.functions.filter((_, i) => i !== index)
        }));
    };

    const addCommission = () => {
        if (newCommission.trim()) {
            setForm(prev => ({
                ...prev,
                commissions: [...prev.commissions, newCommission.trim()]
            }));
            setNewCommission("");
        }
    };

    const removeCommission = (index) => {
        setForm(prev => ({
            ...prev,
            commissions: prev.commissions.filter((_, i) => i !== index)
        }));
    };

    return (
        <ModalPortal onClose={onClose}>
            <h2 style={{ margin: "0 0 1.5rem 0", color: "#002b5c" }}>
                {parliamentarian ? "Edytuj parlamentarzystę" : "Dodaj nowego parlamentarzystę"}
            </h2>

            <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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

                {/* Wybór klubu / koła */}
                <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
                        Klub / Koło
                    </label>
                    <select
                        value={form.clubId || ""}
                        onChange={(e) => setForm({ ...form, clubId: e.target.value ? Number(e.target.value) : null })}
                        style={{ width: "100%", padding: "12px 16px" }}
                    >
                        <option value="">— Niezrzeszony —</option>
                        {clubs.map(club => (
                            <option key={club.id} value={club.id}>
                                {club.name} ({club.type})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Funkcje */}
                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
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
                        <button type="button" onClick={addFunction}>Dodaj</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {form.functions.map((func, i) => (
                            <span key={i} style={{
                                background: "#e0f2fe",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                fontSize: "0.9rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                {func}
                                <button type="button" onClick={() => removeFunction(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>×</button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Komisje */}
                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
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
                        <button type="button" onClick={addCommission}>Dodaj</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {form.commissions.map((comm, i) => (
                            <span key={i} style={{
                                background: "#f3e8ff",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                fontSize: "0.9rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                {comm}
                                <button type="button" onClick={() => removeCommission(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={onClose}>Anuluj</button>
                    <button type="submit">Zapisz parlamentarzystę</button>
                </div>
            </form>
        </ModalPortal>
    );
}