import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateVoting.css";
const getStatusLabel = (status) => {
	const statusMap = {
		pending: 'Oczekująca',
		accepted: 'Przyjęta',
		rejected: 'Odrzucona',
		withdrawn: 'Wycofana',
		active: 'Aktywna',
		inactive: 'Nieaktywna',
		archived: 'Zarchiwizowana'
	};
	return statusMap[status] || status || 'Nieznany';
};

const getStatusColor = (status) => {
	const colorMap = {
		pending: { bg: '#fff3cd', color: '#856404' },
		accepted: { bg: '#d4edda', color: '#155724' },
		rejected: { bg: '#f8d7da', color: '#721c24' },
		withdrawn: { bg: '#e2e3e5', color: '#383d41' },
		active: { bg: '#cce5ff', color: '#004085' },
		inactive: { bg: '#e2e3e5', color: '#383d41' },
		archived: { bg: '#d6d8db', color: '#383d41' }
	};
	return colorMap[status] || { bg: '#e9ecef', color: '#495057' };
};
export default function CreateVoting() {
	const navigate = useNavigate();
	const fileInputRef = useRef(null);
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		category: "",
		recipientsType: "all",
		selectedGroups: [],
		selectedMembers: [],
		startDateTime: "",
		endDateTime: "",
		durationType: "datetime",
		durationDays: 0,
		durationHours: 0,
		durationMinutes: 0,
		linkedItemType: "none",
		linkedItemId: "",
		attachments: [],
		applicant: "",
		managers: [],
	});


	const [groups, setGroups] = useState([]);
	const [members, setMembers] = useState([]);
	const [resolutions, setResolutions] = useState([]);
	const [amendments, setAmendments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [users, setUsers] = useState([]);
	const [error, setError] = useState("");
	const [searchQueryManagers, setSearchQueryManagers] = useState("");

	const [errors, setErrors] = useState({});
	const [searchQuery, setSearchQuery] = useState("");
	const [searchQueryMembers, setSearchQueryMembers] = useState("");

	const token = localStorage.getItem("token");

	const [selectedResolution, setSelectedResolution] = useState("");
	const [selectedAmendment, setSelectedAmendment] = useState("");


	const getAmendmentsForResolution = (resolutionId) => {
		if (!resolutionId) return [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];

		return amendmentsArray.filter(a => {
			const matchesResolution = String(a.resolutionId) === String(resolutionId);
			const isPending = a.status === 'pending';
			return matchesResolution && isPending;
		});
	};
	const getAllAmendmentsForResolution = (resolutionId) => {
		if (!resolutionId) return [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];
		return amendmentsArray.filter(a => String(a.resolutionId) === String(resolutionId));
	};

	const getFilteredManagers = () => {
		if (!searchQueryManagers.trim()) return users;
		return users.filter((user) =>
			user.name?.toLowerCase().includes(searchQueryManagers.toLowerCase()) ||
			user.role?.toLowerCase().includes(searchQueryManagers.toLowerCase()) ||
			user.group?.toLowerCase().includes(searchQueryManagers.toLowerCase())
		);
	};


	const handleManagerToggle = (memberId) => {
		setFormData((prev) => {
			const newManagers = prev.managers?.includes(memberId)
				? prev.managers.filter((id) => id !== memberId)
				: [...(prev.managers || []), memberId];
			return { ...prev, managers: newManagers };
		});
	};

	const handleLinkedItemTypeChange = (type) => {
		setFormData(prev => ({
			...prev,
			linkedItemType: type,
			linkedItemId: ""
		}));
		setSelectedResolution("");
		setSelectedAmendment("");
	};


	const handleResolutionSelect = (resolutionId) => {
		setSelectedResolution(String(resolutionId));
		setSelectedAmendment("");


		if (formData.linkedItemType === "amendment") {

			setSelectedResolution(String(resolutionId));
		} else {

			setFormData(prev => ({
				...prev,
				linkedItemType: "resolution",
				linkedItemId: String(resolutionId)
			}));
		}
	};



	const handleAmendmentSelect = (amendmentId) => {
		setSelectedAmendment(String(amendmentId));
		setFormData(prev => ({
			...prev,
			linkedItemType: "amendment",
			linkedItemId: String(amendmentId)
		}));
	};



	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);


				const groupsRes = await fetch("/api/groups", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!groupsRes.ok) throw new Error("Nie udało się pobrać grup");
				const groupsData = await groupsRes.json();
				setGroups(groupsData.data || groupsData || []);


				const membersRes = await fetch("/api/members", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!membersRes.ok) throw new Error("Nie udało się pobrać członków");
				const membersData = await membersRes.json();
				setMembers(membersData.data || membersData || []);
				const usersRes = await fetch("/api/users", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (usersRes.ok) {
					const usersData = await usersRes.json();

					setUsers(usersData.data || usersData || []);
				}


				const resolutionsRes = await fetch("/api/resolutions", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (resolutionsRes.ok) {
					const resolutionsData = await resolutionsRes.json();
					console.log("RAW resolutions data:", resolutionsData);
					console.log("Type of resolutions data:", typeof resolutionsData);
					console.log("Is array?", Array.isArray(resolutionsData));


					let resolutionsArray = resolutionsData;
					if (resolutionsData && typeof resolutionsData === 'object') {
						if (Array.isArray(resolutionsData)) {
							resolutionsArray = resolutionsData;
						} else if (resolutionsData.data && Array.isArray(resolutionsData.data)) {
							resolutionsArray = resolutionsData.data;
						} else if (resolutionsData.items && Array.isArray(resolutionsData.items)) {
							resolutionsArray = resolutionsData.items;
						} else if (resolutionsData.resolutions && Array.isArray(resolutionsData.resolutions)) {
							resolutionsArray = resolutionsData.resolutions;
						} else {

							const values = Object.values(resolutionsData);
							if (values.some(v => Array.isArray(v))) {
								const arrayKey = Object.keys(resolutionsData).find(key => Array.isArray(resolutionsData[key]));
								resolutionsArray = resolutionsData[arrayKey] || [];
							} else {
								resolutionsArray = [];
							}
						}
					} else {
						resolutionsArray = [];
					}

					console.log("Final resolutions array:", resolutionsArray);
					setResolutions(Array.isArray(resolutionsArray) ? resolutionsArray : []);
				} else {
					console.error("Błąd pobierania uchwał:", await resolutionsRes.text());
					setResolutions([]);
				}


				const amendmentsRes = await fetch("/api/amendments", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (amendmentsRes.ok) {
					const amendmentsData = await amendmentsRes.json();
					console.log("RAW amendments data:", amendmentsData);

					let amendmentsArray = amendmentsData;
					if (amendmentsData && typeof amendmentsData === 'object') {
						if (Array.isArray(amendmentsData)) {
							amendmentsArray = amendmentsData;
						} else if (amendmentsData.data && Array.isArray(amendmentsData.data)) {
							amendmentsArray = amendmentsData.data;
						} else if (amendmentsData.items && Array.isArray(amendmentsData.items)) {
							amendmentsArray = amendmentsData.items;
						} else if (amendmentsData.amendments && Array.isArray(amendmentsData.amendments)) {
							amendmentsArray = amendmentsData.amendments;
						} else {
							const values = Object.values(amendmentsData);
							if (values.some(v => Array.isArray(v))) {
								const arrayKey = Object.keys(amendmentsData).find(key => Array.isArray(amendmentsData[key]));
								amendmentsArray = amendmentsData[arrayKey] || [];
							} else {
								amendmentsArray = [];
							}
						}
					} else {
						amendmentsArray = [];
					}

					console.log("Final amendments array:", amendmentsArray);
					setAmendments(Array.isArray(amendmentsArray) ? amendmentsArray : []);
				} else {
					console.error("Błąd pobierania poprawek:", await amendmentsRes.text());
					setAmendments([]);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [token]);

	const validateStep = (step) => {
		const newErrors = {};

		if (step === 1) {
			if (!formData.title.trim()) newErrors.title = "Tytuł jest wymagany";
			if (!formData.category) newErrors.category = "Wybierz kategorię";
		}

		if (step === 2) {
			if (
				formData.recipientsType === "groups" &&
				formData.selectedGroups.length === 0
			) {
				newErrors.recipients = "Wybierz co najmniej jedną grupę";
			}
			if (
				formData.recipientsType === "individual" &&
				formData.selectedMembers.length === 0
			) {
				newErrors.recipients = "Wybierz co najmniej jedną osobę";
			}
		}

		if (step === 3) {
			if (!formData.startDateTime)
				newErrors.startDateTime = "Data rozpoczęcia jest wymagana";
			if (formData.durationType === "datetime" && !formData.endDateTime) {
				newErrors.endDateTime = "Data zakończenia jest wymagana";
			}
			if (
				formData.durationType === "duration" &&
				formData.durationDays === 0 &&
				formData.durationHours === 0 &&
				formData.durationMinutes === 0
			) {
				newErrors.duration = "Określ czas trwania głosowania";
			}
		}


		if (step === 4) {

			if (formData.linkedItemType === "resolution" && !formData.linkedItemId) {
				newErrors.linkedItem = "Wybierz uchwałę";
			}
			if (formData.linkedItemType === "amendment" && !formData.linkedItemId) {
				newErrors.linkedItem = "Wybierz poprawkę";
			}

			if (formData.linkedItemType === "amendment" && !selectedResolution) {
				newErrors.linkedItem = "Najpierw wybierz uchwałę, a następnie poprawkę";
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleNextStep = () => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, 5));
		}
	};

	const handlePrevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	const handleRecipientsChange = (type) => {
		setFormData((prev) => ({
			...prev,
			recipientsType: type,
			selectedGroups: [],
			selectedMembers: [],
		}));
		setErrors({});
	};

	const getFilteredGroups = () => {
		if (!searchQuery.trim()) return groups;
		return groups.filter((group) =>
			group.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	};

	const getFilteredMembers = () => {
		if (!searchQueryMembers.trim()) return members;
		return members.filter(
			(member) =>
				member.name.toLowerCase().includes(searchQueryMembers.toLowerCase()) ||
				member.group?.toLowerCase().includes(searchQueryMembers.toLowerCase()),
		);
	};

	const handleGroupToggle = (groupId) => {
		setFormData((prev) => {
			if (groupId === "all") {
				return {
					...prev,
					selectedGroups: prev.selectedGroups.includes("all") ? [] : ["all"],
				};
			}
			const newGroups = prev.selectedGroups.includes(groupId)
				? prev.selectedGroups.filter((id) => id !== groupId && id !== "all")
				: [...prev.selectedGroups.filter((id) => id !== "all"), groupId];
			return { ...prev, selectedGroups: newGroups };
		});
		setErrors({});
	};

	const handleMemberToggle = (memberId) => {
		setFormData((prev) => ({
			...prev,
			selectedMembers: prev.selectedMembers.includes(memberId)
				? prev.selectedMembers.filter((id) => id !== memberId)
				: [...prev.selectedMembers, memberId],
		}));
		setErrors({});
	};

	const renderStep1 = () => (
		<div className="step-content">
			<h2>Podstawowe informacje</h2>

			<div className="form-group">
				<label>Tytuł głosowania *</label>
				<input
					type="text"
					value={formData.title}
					onChange={(e) => setFormData({ ...formData, title: e.target.value })}
					placeholder="Wprowadź tytuł głosowania"
					className={errors.title ? "error" : ""}
				/>
				{errors.title && <span className="error-text">{errors.title}</span>}
			</div>

			<div className="form-group">
				<label>Opis głosowania</label>
				<textarea
					value={formData.description}
					onChange={(e) => setFormData({ ...formData, description: e.target.value })}
					placeholder="Wprowadź opis głosowania"
					rows={4}
				/>
			</div>

			<div className="form-group">
				<label>Kategoria *</label>
				<select
					value={formData.category}
					onChange={(e) => setFormData({ ...formData, category: e.target.value })}
					className={errors.category ? "error" : ""}
				>
					<option value="">Wybierz kategorię</option>
					<option value="resolution">Uchwała</option>
					<option value="amendment">Poprawka</option>
					<option value="law">Ustawa</option>
					<option value="budget">Budżet</option>
					<option value="committee">Komisja</option>
					<option value="other">Inne</option>
				</select>
				{errors.category && <span className="error-text">{errors.category}</span>}
			</div>
		</div>
	);
	const renderStep2 = () => (
		<div className="step-content">
			<h2>Odbiorcy głosowania</h2>

			<div className="form-group">
				<label>Kto może głosować? *</label>
				<div className="recipients-options">
					<button
						type="button"
						className={`recipient-option ${formData.recipientsType === "all" ? "active" : ""}`}
						onClick={() => handleRecipientsChange("all")}
					>
						Wszyscy parlamentarzyści
					</button>
					<button
						type="button"
						className={`recipient-option ${formData.recipientsType === "groups" ? "active" : ""}`}
						onClick={() => handleRecipientsChange("groups")}
					>
						Wybrane grupy/komisje
					</button>
					<button
						type="button"
						className={`recipient-option ${formData.recipientsType === "individual" ? "active" : ""}`}
						onClick={() => handleRecipientsChange("individual")}
					>
						Wybrane osoby
					</button>
				</div>
				{errors.recipients && <span className="error-text">{errors.recipients}</span>}
			</div>

			{formData.recipientsType === "groups" && (
				<div className="form-group">
					<label>Wybierz grupy/komisje</label>
					<input
						type="text"
						placeholder="Szukaj grupy..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="search-input"
					/>
					<div className="groups-list">
						{getFilteredGroups().map(group => (
							<div
								key={group.id}
								className={`group-item ${formData.selectedGroups.includes(group.id) ? "selected" : ""}`}
								onClick={() => handleGroupToggle(group.id)}
							>
								<input
									type="checkbox"
									checked={formData.selectedGroups.includes(group.id)}
									onChange={() => { }}
								/>
								<span>{group.name}</span>
								<span className="member-count">({group.memberCount || 0} członków)</span>
							</div>
						))}
					</div>
				</div>
			)}

			{formData.recipientsType === "individual" && (
				<div className="form-group">
					<label>Wybierz osoby</label>
					<input
						type="text"
						placeholder="Szukaj osoby..."
						value={searchQueryMembers}
						onChange={(e) => setSearchQueryMembers(e.target.value)}
						className="search-input"
					/>
					<div className="members-list">
						{getFilteredMembers().map(member => (
							<div
								key={member.id}
								className={`member-item ${formData.selectedMembers.includes(member.id) ? "selected" : ""}`}
								onClick={() => handleMemberToggle(member.id)}
							>
								<input
									type="checkbox"
									checked={formData.selectedMembers.includes(member.id)}
									onChange={() => { }}
								/>
								<span>{member.name}</span>
								<span className="member-group">{member.group}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
	const renderStep3 = () => (
		<div className="step-content">
			<h2>Czas i data głosowania</h2>

			<div className="form-group">
				<label>Data rozpoczęcia *</label>
				<input
					type="datetime-local"
					value={formData.startDateTime}
					onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
					className={errors.startDateTime ? "error" : ""}
				/>
				{errors.startDateTime && <span className="error-text">{errors.startDateTime}</span>}
			</div>

			<div className="form-group">
				<label>Sposób określenia czasu trwania</label>
				<div className="duration-type-options">
					<button
						type="button"
						className={`duration-type ${formData.durationType === "datetime" ? "active" : ""}`}
						onClick={() => setFormData({ ...formData, durationType: "datetime" })}
					>
						Konkretna data
					</button>
					<button
						type="button"
						className={`duration-type ${formData.durationType === "duration" ? "active" : ""}`}
						onClick={() => setFormData({ ...formData, durationType: "duration" })}
					>
						Czas trwania
					</button>
				</div>
			</div>

			{formData.durationType === "datetime" && (
				<div className="form-group">
					<label>Data zakończenia *</label>
					<input
						type="datetime-local"
						value={formData.endDateTime}
						onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
						className={errors.endDateTime ? "error" : ""}
					/>
					{errors.endDateTime && <span className="error-text">{errors.endDateTime}</span>}
				</div>
			)}

			{formData.durationType === "duration" && (
				<div className="form-group">
					<label>Czas trwania</label>
					<div className="duration-inputs">
						<div className="duration-input">
							<label>Dni</label>
							<input
								type="number"
								min="0"
								value={formData.durationDays}
								onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
							/>
						</div>
						<div className="duration-input">
							<label>Godziny</label>
							<input
								type="number"
								min="0"
								max="23"
								value={formData.durationHours}
								onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) || 0 })}
							/>
						</div>
						<div className="duration-input">
							<label>Minuty</label>
							<input
								type="number"
								min="0"
								max="59"
								value={formData.durationMinutes}
								onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
							/>
						</div>
					</div>
					{errors.duration && <span className="error-text">{errors.duration}</span>}

					{formData.startDateTime && formData.durationType === "duration" && (
						<div className="end-date-preview">
							Data zakończenia: <strong>{getEndDate()?.toLocaleString()}</strong>
						</div>
					)}
				</div>
			)}
		</div>
	);
	const renderStep5 = () => (
		<div className="step-content">
			<h2>Podsumowanie</h2>

			<div className="summary-grid">
				<div className="summary-section">
					<h3>Podstawowe informacje</h3>
					<div className="summary-item">
						<span className="summary-label">Tytuł:</span>
						<span className="summary-value">{formData.title || "Brak"}</span>
					</div>
					<div className="summary-item">
						<span className="summary-label">Kategoria:</span>
						<span className="summary-value">{getCategoryLabel(formData.category)}</span>
					</div>
					<div className="summary-item">
						<span className="summary-label">Opis:</span>
						<span className="summary-value">{formData.description || "Brak"}</span>
					</div>
				</div>

				<div className="summary-section">
					<h3>Odbiorcy</h3>
					<div className="summary-item">
						<span className="summary-label">Typ:</span>
						<span className="summary-value">{getRecipientsLabel()}</span>
					</div>
					{formData.recipientsType === "groups" && (
						<div className="summary-item">
							<span className="summary-label">Grupy:</span>
							<span className="summary-value">{getSelectedGroupsNames().join(", ") || "Brak"}</span>
						</div>
					)}
					{formData.recipientsType === "individual" && (
						<div className="summary-item">
							<span className="summary-label">Osoby:</span>
							<span className="summary-value">{getSelectedMembersNames().join(", ") || "Brak"}</span>
						</div>
					)}
				</div>

				<div className="summary-section">
					<h3>Czas</h3>
					<div className="summary-item">
						<span className="summary-label">Rozpoczęcie:</span>
						<span className="summary-value">{formData.startDateTime ? new Date(formData.startDateTime).toLocaleString() : "Brak"}</span>
					</div>
					<div className="summary-item">
						<span className="summary-label">Zakończenie:</span>
						<span className="summary-value">
							{formData.durationType === "datetime"
								? (formData.endDateTime ? new Date(formData.endDateTime).toLocaleString() : "Brak")
								: (getEndDate()?.toLocaleString() || "Brak")
							}
						</span>
					</div>
				</div>

				<div className="summary-section">
					<h3>Powiązania</h3>
					<div className="summary-item">
						<span className="summary-label">Powiązanie:</span>
						<span className="summary-value">{getLinkedItemLabel()}</span>
					</div>

					{formData.linkedItemType === "amendment" && (
						<>
							<div className="summary-item">
								<span className="summary-label">Typ:</span>
								<span className="summary-value">Poprawka</span>
							</div>
							{(() => {
								const am = amendments.find(a => String(a.id) === String(formData.linkedItemId));
								if (am) {
									return (
										<>
											<div className="summary-item">
												<span className="summary-label">Autor:</span>
												<span className="summary-value">{am.author}</span>
											</div>
											<div className="summary-item">
												<span className="summary-label">Status:</span>
												<span className="summary-value">{getStatusLabel(am.status)}</span>
											</div>
											<div className="summary-item">
												<span className="summary-label">Do uchwały:</span>
												<span className="summary-value">
													{resolutions.find(r => String(r.id) === String(am.resolutionId))?.title || 'Nieznana'}
												</span>
											</div>
										</>
									);
								}
								return null;
							})()}
						</>
					)}

					{formData.linkedItemType === "resolution" && (
						<>
							<div className="summary-item">
								<span className="summary-label">Typ:</span>
								<span className="summary-value">Uchwała</span>
							</div>
							{(() => {
								const res = resolutions.find(r => String(r.id) === String(formData.linkedItemId));
								if (res) {
									return (
										<>
											<div className="summary-item">
												<span className="summary-label">Autor:</span>
												<span className="summary-value">{res.author}</span>
											</div>
											<div className="summary-item">
												<span className="summary-label">Status:</span>
												<span className="summary-value">{getStatusLabel(res.status)}</span>
											</div>
										</>
									);
								}
								return null;
							})()}
						</>
					)}
				</div>

				<div className="summary-section">
					<h3>Załączniki</h3>
					<div className="summary-item">
						<span className="summary-label">Załączniki:</span>
						<span className="summary-value">{formData.attachments.length > 0 ? `${formData.attachments.length} plików` : "Brak"}</span>
					</div>
					{formData.attachments.length > 0 && (
						<div className="attachments-preview">
							{formData.attachments.map(att => (
								<div key={att.id} className="attachment-preview">
									{att.name} ({formatFileSize(att.size)})
								</div>
							))}
						</div>
					)}
				</div>

				{formData.applicant && (
					<div className="summary-section">
						<h3>Wnioskodawca</h3>
						<div className="summary-item">
							<span className="summary-label">Wnioskodawca:</span>
							<span className="summary-value">{getApplicantLabel(formData.applicant)}</span>
						</div>
					</div>
				)}

				
				{formData.managers && formData.managers.length > 0 && (
					<div className="summary-section">
						<h3>Zarządzający</h3>
						<div className="summary-item">
							<span className="summary-label">Osoby zarządzające:</span>
							<span className="summary-value">
								{formData.managers.map(id => {
									const user = users.find(u => u.id === id);
									return user ? user.name : null;
								}).filter(Boolean).join(", ")}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
	const renderStep4 = () => {

		const resolutionsArray = Array.isArray(resolutions) ? resolutions : [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];

		const amendmentsForResolution = getAmendmentsForResolution(selectedResolution);
		const selectedResolutionObj = resolutionsArray.find(r => String(r.id) === String(selectedResolution));

		return (
			<div className="step-content">
				<h2>Ustawienia zaawansowane</h2>

				
				<div className="form-section">
					<h3>Powiązanie z uchwałą/poprawką</h3>
					<p className="form-hint">
						Wybierz uchwałę, poprawkę lub utwórz niezależne głosowanie
					</p>

					
					<div className="linked-item-selector">
						<button
							type="button"
							className={`link-option ${formData.linkedItemType === "none" ? "active" : ""}`}
							onClick={() => handleLinkedItemTypeChange("none")}
						>
							<div>
								<strong>Brak powiązania</strong>
								<small>Samodzielne głosowanie</small>
							</div>
						</button>

						<button
							type="button"
							className={`link-option ${formData.linkedItemType === "resolution" ? "active" : ""}`}
							onClick={() => handleLinkedItemTypeChange("resolution")}
						>
							<div>
								<strong>Uchwała</strong>
								<small>Głosowanie nad uchwałą</small>
							</div>
						</button>

						<button
							type="button"
							className={`link-option ${formData.linkedItemType === "amendment" ? "active" : ""}`}
							onClick={() => handleLinkedItemTypeChange("amendment")}
						>
							<div>
								<strong>Poprawka</strong>
								<small>Głosowanie nad poprawką</small>
							</div>
						</button>
					</div>

					
					{(formData.linkedItemType === "resolution" || formData.linkedItemType === "amendment") && (
						<div className="linked-selection">
							<div className="form-group">
								<label>
									{formData.linkedItemType === "amendment"
										? "Wybierz uchwałę, do której chcesz dodać poprawkę *"
										: "Wybierz uchwałę *"}
								</label>
								<div className="items-list">
									{resolutionsArray.length === 0 ? (
										<p className="no-items">Brak dostępnych uchwał</p>
									) : (
										resolutionsArray.map(res => {
											const statusColors = getStatusColor(res.status);
											const isSelected = String(selectedResolution) === String(res.id);
											return (
												<div
													key={res.id}
													className={`item-card ${isSelected ? "selected" : ""}`}
													onClick={() => {

														setSelectedResolution(String(res.id));
														setSelectedAmendment("");


														if (formData.linkedItemType !== "amendment") {
															setFormData(prev => ({
																...prev,
																linkedItemType: "resolution",
																linkedItemId: String(res.id)
															}));
														}
													}}
												>
													<div className="item-header">
														<span
															className="item-status"
															style={{
																background: statusColors.bg,
																color: statusColors.color,
																padding: '2px 10px',
																borderRadius: '12px',
																fontSize: '11px',
																fontWeight: '500',
																display: 'inline-block'
															}}
														>
															{getStatusLabel(res.status)}
														</span>
														<span className="item-date">{res.createdAt || "Brak daty"}</span>
													</div>
													<div className="item-title">{res.title || "Brak tytułu"}</div>
													<div className="item-meta">
														<span>Autor: {res.author || "Nieznany"}</span>
														<span className="amendments-count">
															Poprawek: {getAmendmentsForResolution(res.id).length}
														</span>
													</div>
													
													{formData.linkedItemType === "amendment" && isSelected && (
														<div style={{
															marginTop: '6px',
															fontSize: '12px',
															color: '#007bff',
															fontWeight: '500'
														}}>
															✓ Wybrano uchwałę dla poprawki
														</div>
													)}
												</div>
											);
										})
									)}
								</div>
							</div>
						</div>
					)}

					
					{formData.linkedItemType === "amendment" && selectedResolution && (
						<div className="linked-selection amendment-selection">
							<div className="form-group">
								<label>
									Wybierz poprawkę do "{selectedResolutionObj?.title || 'wybranej uchwały'}"
								</label>

								{amendmentsForResolution.length === 0 ? (
									<div className="no-amendments">
										<p>Brak poprawek do tej uchwały</p>
										<button
											type="button"
											className="btn-secondary"
											onClick={() => {
												navigate(`/resolutions/${selectedResolution}/amendments/create`);
											}}
										>
											Utwórz poprawkę
										</button>
									</div>
								) : (
									<div className="amendments-list">
										<p className="amendments-count-info">
											Znaleziono {amendmentsForResolution.length} poprawek
										</p>
										{amendmentsForResolution.map(am => {
											const statusColors = getStatusColor(am.status);
											const isSelected = String(selectedAmendment) === String(am.id);
											return (
												<div
													key={am.id}
													className={`amendment-card ${isSelected ? "selected" : ""}`}
													onClick={() => {
														setSelectedAmendment(String(am.id));
														setFormData(prev => ({
															...prev,
															linkedItemType: "amendment",
															linkedItemId: String(am.id)
														}));
													}}
												>
													<div className="amendment-header">
														<span
															className="amendment-status"
															style={{
																background: statusColors.bg,
																color: statusColors.color,
																padding: '2px 10px',
																borderRadius: '12px',
																fontSize: '11px',
																fontWeight: '500',
																display: 'inline-block'
															}}
														>
															{getStatusLabel(am.status)}
														</span>
														<span className="amendment-date">
															{am.createdAt || 'Brak daty'}
														</span>
													</div>
													<div className="amendment-title">
														Poprawka #{am.id} - {am.author}
													</div>
													<div className="amendment-content">
														{am.content && am.content.length > 100
															? am.content.substring(0, 100) + '...'
															: am.content}
													</div>
													{am.changes && am.changes.length > 0 && (
														<div className="amendment-changes">
															<small>
																{am.changes.length} zmian
																{am.changes.length === 1 ? '' : 'y'}
															</small>
														</div>
													)}
													{am.withdrawnReason && (
														<div className="amendment-withdrawn">
															<small>Powód wycofania: {am.withdrawnReason}</small>
														</div>
													)}
													{isSelected && (
														<div style={{
															marginTop: '6px',
															fontSize: '12px',
															color: '#28a745',
															fontWeight: '500'
														}}>
															✓ Wybrano tę poprawkę
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					)}

					
					{formData.linkedItemId && (
						<div className="linked-preview">
							<h4>Wybrano:</h4>
							{formData.linkedItemType === "resolution" && selectedResolutionObj && (
								<div className="preview-card resolution-preview">
									<div className="preview-badge" style={{
										background: '#d4edda',
										color: '#155724',
										padding: '2px 12px',
										borderRadius: '12px',
										fontSize: '11px',
										fontWeight: 'bold',
										display: 'inline-block',
										marginBottom: '8px'
									}}>
										UCHWAŁA
									</div>
									<h3>{selectedResolutionObj.title}</h3>
									<p>{selectedResolutionObj.preamble || selectedResolutionObj.description || ''}</p>
									<div className="preview-details">
										<span>Status: {getStatusLabel(selectedResolutionObj.status)}</span>
										<span>Data: {selectedResolutionObj.createdAt}</span>
										<span>Autor: {selectedResolutionObj.author}</span>
									</div>
								</div>
							)}

							{formData.linkedItemType === "amendment" && (
								<div className="preview-card amendment-preview">
									<div className="preview-badge" style={{
										background: '#fff3cd',
										color: '#856404',
										padding: '2px 12px',
										borderRadius: '12px',
										fontSize: '11px',
										fontWeight: 'bold',
										display: 'inline-block',
										marginBottom: '8px'
									}}>
										POPRAWKA
									</div>
									{(() => {
										const selectedAm = amendmentsArray.find(a => String(a.id) === String(formData.linkedItemId));
										if (!selectedAm) return <p>Nie znaleziono poprawki</p>;

										return (
											<>
												<h3>Poprawka #{selectedAm.id}</h3>
												<p><strong>Autor:</strong> {selectedAm.author}</p>
												<p><strong>Status:</strong> {getStatusLabel(selectedAm.status)}</p>
												<p><strong>Treść:</strong> {selectedAm.content}</p>
												{selectedAm.changes && selectedAm.changes.length > 0 && (
													<div className="preview-changes">
														<h4>Zmiany:</h4>
														{selectedAm.changes.map((change, idx) => (
															<div key={idx} className="change-item">
																<p><strong>Przed:</strong> {change.before || 'Brak'}</p>
																<p><strong>Po:</strong> {change.after || 'Brak'}</p>
															</div>
														))}
													</div>
												)}
												{selectedAm.withdrawnReason && (
													<p><strong>Powód wycofania:</strong> {selectedAm.withdrawnReason}</p>
												)}
												<div className="preview-details">
													<span>Data: {selectedAm.createdAt}</span>
													<span>Do uchwały: {selectedResolutionObj?.title || 'Nieznana'}</span>
												</div>
											</>
										);
									})()}
								</div>
							)}

							<button
								type="button"
								className="btn-clear"
								onClick={() => {
									setFormData(prev => ({
										...prev,
										linkedItemType: "none",
										linkedItemId: ""
									}));
									setSelectedResolution("");
									setSelectedAmendment("");
								}}
							>
								Usuń powiązanie
							</button>
						</div>
					)}

					
					{errors.linkedItem && (
						<div className="error-text" style={{ marginTop: "10px" }}>
							{errors.linkedItem}
						</div>
					)}
				</div>

				
				<div className="form-section">
					<h3>Pozostałe ustawienia</h3>

					<div className="form-group">
						<label>Wnioskodawca</label>
						<select
							value={formData.applicant}
							onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
						>
							<option value="">Wybierz wnioskodawcę</option>
							<option value="marshal">Marszałek Parlamentu</option>
							<option value="presidium">Prezydium Parlamentu</option>
							<option value="group_15">Grupa 15 posłów</option>
							{groups.map(g => (
								<option key={g.id} value={String(g.id)}>{g.name}</option>
							))}
						</select>
						{formData.applicant && (
							<div style={{ marginTop: '6px', fontSize: '13px', color: '#28a745' }}>
								✓ Wybrano: {getApplicantLabel(formData.applicant)}
							</div>
						)}
					</div>
					
					<div className="form-group">
						<label>Kto może zarządzać głosowaniem?</label>
						<p className="field-hint" style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
							Wybrane osoby będą mogły: edytować głosowanie, aktywować je lub opóźnić jego start,
							sprawdzić wyniki na żywo.
						</p>
						<div className="info-box admin-info" style={{
							padding: '10px 12px',
							background: '#e7f0ff',
							borderRadius: '6px',
							borderLeft: '3px solid #007bff',
							marginBottom: '12px',
							fontSize: '13px',
							color: '#004085'
						}}>
							<p style={{ margin: 0 }}>
								<strong>Administrator:</strong> Jako admin korzystasz z tych samych praw -
								nikt nie może Ci ich odebrać. Administratorzy nie są wyświetlani na liście,
								ponieważ mają pełne uprawnienia do wszystkich głosowań.
							</p>
						</div>

						<input
							type="text"
							placeholder="Szukaj osoby..."
							value={searchQueryManagers}
							onChange={(e) => setSearchQueryManagers(e.target.value)}
							className="search-input"
							style={{
								width: '100%',
								padding: '8px 12px',
								border: '1px solid #ddd',
								borderRadius: '6px',
								marginBottom: '8px'
							}}
						/>
						<div className="checkbox-grid" style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
							gap: '8px',
							maxHeight: '200px',
							overflowY: 'auto',
							padding: '4px',
							border: '1px solid #eee',
							borderRadius: '6px'
						}}>
							{getFilteredManagers()
								.filter(user => user.role !== "admin") // Pomiń adminów
								.map((user) => (
									<label key={user.id} className="checkbox-item" style={{
										display: 'flex',
										alignItems: 'center',
										gap: '8px',
										padding: '4px 8px',
										cursor: 'pointer',
										borderRadius: '4px',
										transition: 'background 0.2s'
									}}>
										<input
											type="checkbox"
											checked={formData.managers?.includes(user.id) || false}
											onChange={() => handleManagerToggle(user.id)}
										/>
										<span style={{ fontSize: '13px' }}>{user.name}</span>
										{user.group && (
											<span style={{ fontSize: '11px', color: '#6c757d' }}>({user.group})</span>
										)}
										
									</label>
								))}
						</div>
						{formData.managers && formData.managers.length > 0 && (
							<div className="selected-info" style={{ marginTop: '12px' }}>
								<p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
									Wybrano {formData.managers.length} osób do zarządzania:
								</p>
								<div className="selected-tags" style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '6px'
								}}>
									{formData.managers.map(id => {
										const user = users.find(u => u.id === id); // UŻYWA USERS
										return user ? (
											<span key={id} className="manager-tag" style={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: '6px',
												padding: '4px 10px',
												background: '#e9ecef',
												borderRadius: '20px',
												fontSize: '12px'
											}}>
												{user.name}
												<button
													type="button"
													onClick={() => handleManagerToggle(id)}
													className="tag-remove"
													style={{
														background: 'none',
														border: 'none',
														color: '#dc3545',
														cursor: 'pointer',
														fontSize: '14px',
														padding: '0 2px'
													}}
												>
													×
												</button>
											</span>
										) : null;
									})}
								</div>
							</div>
						)}
					</div>

					<div className="form-group">
						<label>Załączniki</label>
						<div className="file-upload">
							<input
								type="file"
								ref={fileInputRef}
								onChange={handleFileUpload}
								multiple
								style={{ display: "none" }}
							/>
							<button
								type="button"
								className="btn-upload"
								onClick={() => fileInputRef.current?.click()}
							>
								Wybierz pliki
							</button>
							<p className="upload-hint">Maksymalny rozmiar: 10MB</p>
						</div>
						<div className="attachments-list">
							{formData.attachments.map(att => (
								<div key={att.id} className="attachment-item">
									<span>{att.name}</span>
									<span className="file-size">{formatFileSize(att.size)}</span>
									<button onClick={() => handleRemoveAttachment(att.id)}>×</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	};
	const handleFileUpload = async (e) => {
		const files = Array.from(e.target.files);
		const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);



		const newAttachments = validFiles.map((file) => ({
			id: Date.now() + Math.random(),
			name: file.name,
			size: file.size,
			type: file.type,
			file: file,
			uploadDate: new Date().toISOString(),
		}));

		setFormData((prev) => ({
			...prev,
			attachments: [...prev.attachments, ...newAttachments],
		}));
	};

	const handleRemoveAttachment = (attachmentId) => {
		setFormData((prev) => ({
			...prev,
			attachments: prev.attachments.filter((a) => a.id !== attachmentId),
		}));
	};

	const formatFileSize = (bytes) => {
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return ((bytes / 1024) * 1024).toFixed(1) + " MB";
	};

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) return;

		setIsSubmitting(true);
		setSubmitError("");

		try {

			const votingData = {
				title: formData.title,
				description: formData.description,
				category: formData.category,
				startTime: formData.startDateTime,
				endTime:
					formData.durationType === "datetime"
						? formData.endDateTime
						: getEndDate()?.toISOString(),
				recipientsType: formData.recipientsType,
				selectedGroups: formData.selectedGroups,
				selectedMembers: formData.selectedMembers,
				linkedItemType: formData.linkedItemType,
				linkedItemId: formData.linkedItemId,
				applicant: formData.applicant,
				managers: formData.managers || [],
				quorumRequired: 50,
				majorityType: "simple",
				allowAbstain: true,
				isAnonymous: false,
				requireComment: false,
				canChangeVote: false,
				showResultsDuringVoting: false,
				notifyEmail: false,
				notifyPush: false,
			};

			const response = await fetch("/api/votings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(votingData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Nie udało się utworzyć głosowania");
			}


			if (formData.attachments.length > 0) {
				const formDataWithFiles = new FormData();
				formData.attachments.forEach((att, index) => {
					if (att.file) {
						formDataWithFiles.append(`attachment_${index}`, att.file);
					}
				});

				await fetch(`/api/votings/${data.id}/attachments`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
					body: formDataWithFiles,
				});
			}

			navigate("/glosowania");
		} catch (err) {
			setSubmitError(err.message);
			console.error("Błąd tworzenia głosowania:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getEndDate = () => {
		if (!formData.startDateTime) return null;
		const end = new Date(formData.startDateTime);
		end.setTime(
			end.getTime() +
			formData.durationDays * 86400000 +
			formData.durationHours * 3600000 +
			formData.durationMinutes * 60000,
		);
		return end;
	};

	const getCategoryLabel = (category) => {
		const labels = {
			amendment: "Poprawka",
			committee: "Komisja",
			resolution: "Uchwała",
			law: "Ustawa",
			budget: "Budżet",
			other: "Inne",
		};
		return labels[category] || category;
	};

	const getRecipientsLabel = () => {
		const types = {
			all: "Wszyscy parlamentarzyści",
			groups: "Wybrane grupy/komisje",
			individual: "Wybrane osoby",
		};
		return types[formData.recipientsType] || formData.recipientsType;
	};

	const getSelectedGroupsNames = () => {
		return groups
			.filter((g) => formData.selectedGroups.includes(g.id))
			.map((g) => g.name);
	};

	const getSelectedMembersNames = () => {
		return members
			.filter((m) => formData.selectedMembers.includes(m.id))
			.map((m) => m.name);
	};

	const getApplicantLabel = (applicant) => {
		const found = groups.find((g) => g.id === applicant);
		if (found) return found.name;

		const labels = {
			marshal: "Marszałek Parlamentu",
			presidium: "Prezydium Parlamentu",
			group_15: "Grupa 15 posłów",
			individual: "Pojedynczy poseł",
		};
		return labels[applicant] || applicant || "Nie wybrano";
	};

	const getLinkedItemLabel = () => {
		if (!formData.linkedItemType || formData.linkedItemType === "none") {
			return "Brak powiązania";
		}

		const resolutionsArray = Array.isArray(resolutions) ? resolutions : [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];

		if (formData.linkedItemType === "resolution") {
			const item = resolutionsArray.find((r) => String(r.id) === String(formData.linkedItemId));
			return item ? `Uchwała: ${item.title}` : "Nie wybrano";
		}

		if (formData.linkedItemType === "amendment") {
			const item = amendmentsArray.find((a) => String(a.id) === String(formData.linkedItemId));
			return item ? `Poprawka: ${item.title || `#${item.id}`}` : "Nie wybrano";
		}

		return "Nie wybrano";
	};

	if (loading) {
		return (
			<div className="create-voting-page">
				<h2>Ładowanie danych...</h2>
			</div>
		);
	}

	if (error) {
		return (
			<div className="create-voting-page">
				<h2>Błąd: {error}</h2>
				<button onClick={() => window.location.reload()}>
					Spróbuj ponownie
				</button>
			</div>
		);
	}

	const renderStepIndicator = () => (
		<div className="step-indicator">
			{[
				{ num: 1, label: "Podstawowe informacje" },
				{ num: 2, label: "Odbiorcy głosowania" },
				{ num: 3, label: "Czas i data" },
				{ num: 4, label: "Ustawienia zaawansowane" },
				{ num: 5, label: "Podsumowanie" },
			].map((step) => (
				<div
					key={step.num}
					className={`step ${currentStep === step.num ? "active" : ""} ${currentStep > step.num ? "completed" : ""}`}
					onClick={() => currentStep > step.num && setCurrentStep(step.num)}
				>
					<div className="step-number">
						{currentStep > step.num ? "✓" : step.num}
					</div>
					<span className="step-label">{step.label}</span>
				</div>
			))}
		</div>
	);




	return (
		<div className="create-voting-page">
			<div className="create-voting-header">
				<div>
					<h1>Utwórz nowe głosowanie</h1>
					<p>Skonfiguruj parametry głosowania zgodnie ze statutem</p>
				</div>
				<button
					type="button"
					className="btn-cancel"
					onClick={() => navigate("/glosowania")}
				>
					Anuluj
				</button>
			</div>

			{submitError && <div className="submit-error">{submitError}</div>}

			{renderStepIndicator()}

			<div className="form-container">
				{currentStep === 1 && renderStep1()}
				{currentStep === 2 && renderStep2()}
				{currentStep === 3 && renderStep3()}
				{currentStep === 4 && renderStep4()}
				{currentStep === 5 && renderStep5()}
			</div>

			<div className="form-actions">
				{currentStep > 1 && (
					<button
						type="button"
						className="btn-secondary"
						onClick={handlePrevStep}
						disabled={isSubmitting}
					>
						Wstecz
					</button>
				)}
				{currentStep < 5 ? (
					<button
						type="button"
						className="btn-primary"
						onClick={handleNextStep}
						disabled={isSubmitting}
					>
						Dalej
					</button>
				) : (
					<button
						type="button"
						className="btn-primary btn-submit"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting ? "Tworzenie..." : "Utwórz głosowanie"}
					</button>
				)}
			</div>
		</div>
	);
}
