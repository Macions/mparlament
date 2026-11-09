import { useEffect, useState } from "react";
import styles from "./Coordination.module.css";

const API = "/newapp/api";

async function apiFetch(path, options = {}) {
	const token = localStorage.getItem("token");
	const res = await fetch(`${API}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers ?? {}),
		},
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.message || `Błąd ${res.status}`);
	return data;
}

const TABS = [
	{ key: "sessions", label: "Posiedzenia" },
	{ key: "members", label: "Członkowie" },
	{ key: "assign", label: "Przypisanie" },
];

export default function Coordination() {
	const [tab, setTab] = useState("sessions");

	return (
		<div className={styles.page}>
			<header className={styles.topbar}>
				<h1 className={styles.title}>Koordynacja</h1>
				<p className={styles.subtitle}>
					Zarządzanie posiedzeniami, członkami i przypisaniem parlamentarzystów.
				</p>
			</header>

			<nav className={styles.tabs} role="tablist">
				{TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						role="tab"
						aria-selected={tab === t.key}
						className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
					</button>
				))}
			</nav>

			{tab === "sessions" && <SessionsPanel />}
			{tab === "members" && <MembersPanel />}
			{tab === "assign" && <AssignPanel />}
		</div>
	);
}

/* ─────────────────────────────────────────────
   Panel: Posiedzenia
   ───────────────────────────────────────────── */

function SessionsPanel() {
	const [sessions, setSessions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [form, setForm] = useState({
		name: "",
		date: "",
		city: "",
		number: "",
	});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const data = await apiFetch("/coordination/sessions");
			setSessions(Array.isArray(data) ? data : []);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const handleCreate = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setMessage("");
		try {
			await apiFetch("/coordination/sessions", {
				method: "POST",
				body: JSON.stringify({
					name: form.name,
					date: form.date || null,
					city: form.city || null,
					number: form.number || null,
				}),
			});
			setForm({ name: "", date: "", city: "", number: "" });
			setMessage("Posiedzenie dodane.");
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id) => {
		if (!confirm("Usunąć to posiedzenie?")) return;
		try {
			await apiFetch(`/coordination/sessions/${id}`, { method: "DELETE" });
			await load();
		} catch (e) {
			setError(e.message);
		}
	};

	const handleActivate = async (id) => {
		if (!confirm("Ustawić to posiedzenie jako aktywne?")) return;
		try {
			await apiFetch(`/coordination/sessions/${id}/activate`, {
				method: "POST",
			});
			setMessage("Posiedzenie aktywowane.");
		} catch (e) {
			setError(e.message);
		}
	};

	return (
		<section className={styles.panel}>
			<div className={styles.panelGrid}>
				<div className={styles.panelMain}>
					<h2 className={styles.sectionTitle}>Lista posiedzeń</h2>

					{loading && <p className={styles.muted}>Ładowanie…</p>}
					{error && <div className={styles.error}>{error}</div>}
					{message && <div className={styles.success}>{message}</div>}

					{!loading && sessions.length === 0 && (
						<p className={styles.muted}>Brak posiedzeń.</p>
					)}

					{!loading && sessions.length > 0 && (
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={styles.th}>ID</th>
									<th className={styles.th}>Nazwa</th>
									<th className={styles.th}>Data</th>
									<th className={styles.th}>Miasto</th>
									<th className={styles.th}>Posłów</th>
									<th className={styles.th}>Akcje</th>
								</tr>
							</thead>
							<tbody>
								{sessions.map((s) => (
									<tr key={s.id} className={styles.tr}>
										<td className={styles.td}>{s.id}</td>
										<td className={styles.td}>{s.name}</td>
										<td className={styles.td}>{s.date ?? "—"}</td>
										<td className={styles.td}>{s.city ?? "—"}</td>
										<td className={styles.td}>
											{s.parliamentariansCount ?? 0}
										</td>
										<td className={styles.td}>
											<div className={styles.actions}>
												<button
													type="button"
													className={styles.btnGhost}
													onClick={() => handleActivate(s.id)}
												>
													Aktywuj
												</button>
												<button
													type="button"
													className={styles.btnDanger}
													onClick={() => handleDelete(s.id)}
												>
													Usuń
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<aside className={styles.panelSide}>
					<h2 className={styles.sectionTitle}>Dodaj posiedzenie</h2>
					<form className={styles.form} onSubmit={handleCreate}>
						<label className={styles.field}>
							<span className={styles.label}>Nazwa *</span>
							<input
								className={styles.input}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								required
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Data</span>
							<input
								className={styles.input}
								value={form.date}
								onChange={(e) => setForm({ ...form, date: e.target.value })}
								placeholder="19.09.2026"
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Miasto</span>
							<input
								className={styles.input}
								value={form.city}
								onChange={(e) => setForm({ ...form, city: e.target.value })}
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Numer</span>
							<input
								className={styles.input}
								value={form.number}
								onChange={(e) => setForm({ ...form, number: e.target.value })}
							/>
						</label>
						<button
							type="submit"
							className={styles.btnPrimary}
							disabled={saving}
						>
							{saving ? "Zapisywanie…" : "Dodaj posiedzenie"}
						</button>
					</form>
				</aside>
			</div>
		</section>
	);
}

/* ─────────────────────────────────────────────
   Panel: Członkowie
   ───────────────────────────────────────────── */

function MembersPanel() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [form, setForm] = useState({
		username: "",
		name: "",
		role: "member",
		club: "",
		group: "",
	});
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const data = await apiFetch("/users");
			setUsers(Array.isArray(data) ? data : []);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const handleCreate = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setMessage("");
		try {
			await apiFetch("/users", {
				method: "POST",
				body: JSON.stringify({
					username: form.username,
					name: form.name,
					role: form.role,
					club: form.club || null,
					group: form.group || null,
				}),
			});
			setForm({
				username: "",
				name: "",
				role: "member",
				club: "",
				group: "",
			});
			setMessage("Członek dodany (hasło startowe: haslo123).");
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const handleRoleChange = async (id, role) => {
		try {
			await apiFetch(`/users/${id}`, {
				method: "PATCH",
				body: JSON.stringify({ role }),
			});
			await load();
		} catch (e) {
			setError(e.message);
		}
	};

	return (
		<section className={styles.panel}>
			<div className={styles.panelGrid}>
				<div className={styles.panelMain}>
					<h2 className={styles.sectionTitle}>Lista członków</h2>

					{loading && <p className={styles.muted}>Ładowanie…</p>}
					{error && <div className={styles.error}>{error}</div>}
					{message && <div className={styles.success}>{message}</div>}

					{!loading && users.length === 0 && (
						<p className={styles.muted}>Brak członków.</p>
					)}

					{!loading && users.length > 0 && (
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={styles.th}>ID</th>
									<th className={styles.th}>Nazwa</th>
									<th className={styles.th}>Username</th>
									<th className={styles.th}>Klub</th>
									<th className={styles.th}>Rola</th>
								</tr>
							</thead>
							<tbody>
								{users.map((u) => (
									<tr key={u.id} className={styles.tr}>
										<td className={styles.td}>{u.id}</td>
										<td className={styles.td}>{u.name}</td>
										<td className={styles.td}>{u.username}</td>
										<td className={styles.td}>{u.club ?? "—"}</td>
										<td className={styles.td}>
											<select
												className={styles.select}
												value={u.role}
												onChange={(e) => handleRoleChange(u.id, e.target.value)}
											>
												<option value="member">Członek</option>
												<option value="admin">Administrator</option>
												<option value="marshal">Marszałek</option>
											</select>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<aside className={styles.panelSide}>
					<h2 className={styles.sectionTitle}>Dodaj członka</h2>
					<form className={styles.form} onSubmit={handleCreate}>
						<label className={styles.field}>
							<span className={styles.label}>Username *</span>
							<input
								className={styles.input}
								value={form.username}
								onChange={(e) => setForm({ ...form, username: e.target.value })}
								required
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Imię i nazwisko *</span>
							<input
								className={styles.input}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								required
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Rola</span>
							<select
								className={styles.select}
								value={form.role}
								onChange={(e) => setForm({ ...form, role: e.target.value })}
							>
								<option value="member">Członek</option>
								<option value="admin">Administrator</option>
								<option value="marshal">Marszałek</option>
							</select>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Klub</span>
							<input
								className={styles.input}
								value={form.club}
								onChange={(e) => setForm({ ...form, club: e.target.value })}
							/>
						</label>
						<label className={styles.field}>
							<span className={styles.label}>Grupa</span>
							<input
								className={styles.input}
								value={form.group}
								onChange={(e) => setForm({ ...form, group: e.target.value })}
							/>
						</label>
						<button
							type="submit"
							className={styles.btnPrimary}
							disabled={saving}
						>
							{saving ? "Zapisywanie…" : "Dodaj członka"}
						</button>
					</form>
				</aside>
			</div>
		</section>
	);
}

/* ─────────────────────────────────────────────
   Panel: Przypisanie parlamentarzystów
   ───────────────────────────────────────────── */

function AssignPanel() {
	const [sessions, setSessions] = useState([]);
	const [selectedSessionId, setSelectedSessionId] = useState("");
	const [parliamentarians, setParliamentarians] = useState([]);
	const [assigned, setAssigned] = useState([]);
	const [selectedIds, setSelectedIds] = useState(new Set());
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	useEffect(() => {
		(async () => {
			try {
				const data = await apiFetch("/coordination/sessions");
				const list = Array.isArray(data) ? data : [];
				setSessions(list);
				if (list.length > 0) setSelectedSessionId(String(list[0].id));
			} catch (e) {
				setError(e.message);
			}
		})();
	}, []);

	useEffect(() => {
		if (!selectedSessionId) return;
		(async () => {
			setLoading(true);
			setError("");
			try {
				const [parlRes, assignedRes] = await Promise.all([
					apiFetch("/parliamentarians"),
					apiFetch(
						`/coordination/sessions/${selectedSessionId}/parliamentarians`,
					),
				]);
				const all = [
					...(parlRes.parliamentarians ?? []),
					...(parlRes.unaffiliated ?? []),
				];
				setParliamentarians(all);
				setAssigned(Array.isArray(assignedRes) ? assignedRes : []);
				setSelectedIds(new Set(assignedRes.map((a) => a.parliamentarianId)));
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		})();
	}, [selectedSessionId]);

	const toggle = (id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSave = async () => {
		if (!selectedSessionId) return;
		setSaving(true);
		setError("");
		setMessage("");
		try {
			await apiFetch(
				`/coordination/sessions/${selectedSessionId}/parliamentarians`,
				{
					method: "POST",
					body: JSON.stringify({
						parliamentarianIds: Array.from(selectedIds),
					}),
				},
			);
			setMessage("Przypisanie zapisane.");
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const presentMap = new Map(
		assigned.map((a) => [a.parliamentarianId, a.present]),
	);

	const togglePresent = async (pid, present) => {
		try {
			await apiFetch(
				`/coordination/sessions/${selectedSessionId}/parliamentarians/${pid}`,
				{
					method: "PATCH",
					body: JSON.stringify({ present }),
				},
			);
			setAssigned((prev) =>
				prev.map((a) => (a.parliamentarianId === pid ? { ...a, present } : a)),
			);
		} catch (e) {
			setError(e.message);
		}
	};

	return (
		<section className={styles.panel}>
			<div className={styles.fieldRow}>
				<label className={styles.field}>
					<span className={styles.label}>Posiedzenie</span>
					<select
						className={styles.select}
						value={selectedSessionId}
						onChange={(e) => setSelectedSessionId(e.target.value)}
					>
						<option value="">— wybierz —</option>
						{sessions.map((s) => (
							<option key={s.id} value={s.id}>
								#{s.id} — {s.name} ({s.date ?? "brak daty"})
							</option>
						))}
					</select>
				</label>
			</div>

			{error && <div className={styles.error}>{error}</div>}
			{message && <div className={styles.success}>{message}</div>}

			{loading && <p className={styles.muted}>Ładowanie…</p>}

			{!loading && selectedSessionId && (
				<>
					<div className={styles.assignHeader}>
						<p className={styles.muted}>
							Wybrano {selectedIds.size} z {parliamentarians.length}{" "}
							parlamentarzystów.
						</p>
						<button
							type="button"
							className={styles.btnPrimary}
							onClick={handleSave}
							disabled={saving}
						>
							{saving ? "Zapisywanie…" : "Zapisz przypisanie"}
						</button>
					</div>

					<table className={styles.table}>
						<thead>
							<tr>
								<th className={styles.th}>#</th>
								<th className={styles.th}>Imię i nazwisko</th>
								<th className={styles.th}>Klub</th>
								<th className={styles.th}>Przypisany</th>
								<th className={styles.th}>Obecny</th>
							</tr>
						</thead>
						<tbody>
							{parliamentarians.map((p) => {
								const isAssigned = selectedIds.has(p.id);
								const isPresent = presentMap.get(p.id) ?? false;
								return (
									<tr key={p.id} className={styles.tr}>
										<td className={styles.td}>{p.id}</td>
										<td className={styles.td}>
											{p.firstName} {p.lastName}
										</td>
										<td className={styles.td}>{p.club?.name ?? "—"}</td>
										<td className={styles.td}>
											<input
												type="checkbox"
												checked={isAssigned}
												onChange={() => toggle(p.id)}
											/>
										</td>
										<td className={styles.td}>
											<input
												type="checkbox"
												checked={isPresent}
												disabled={!isAssigned}
												onChange={(e) => togglePresent(p.id, e.target.checked)}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</>
			)}
		</section>
	);
}
