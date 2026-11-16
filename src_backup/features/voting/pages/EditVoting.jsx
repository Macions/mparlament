import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateVoting.css";
import {
	Eye,
	Lock,
	Plus,
	Check,
	Trash2,
	GripVertical,
} from "lucide-react";

const getStatusLabel = (status) => {
	const statusMap = {
		pending: "Oczekująca",
		accepted: "Przyjęta",
		rejected: "Odrzucona",
		withdrawn: "Wycofana",
		active: "Aktywna",
		inactive: "Nieaktywna",
		archived: "Zarchiwizowana",
	};
	return statusMap[status] || status || "Nieznany";
};

const getStatusColor = (status) => {
	const colorMap = {
		pending: { bg: "#fff3cd", color: "#856404" },
		accepted: { bg: "#d4edda", color: "#155724" },
		rejected: { bg: "#f8d7da", color: "#721c24" },
		withdrawn: { bg: "#e2e3e5", color: "#383d41" },
		active: { bg: "#cce5ff", color: "#004085" },
		inactive: { bg: "#e2e3e5", color: "#383d41" },
		archived: { bg: "#d6d8db", color: "#383d41" },
	};
	return colorMap[status] || { bg: "#e9ecef", color: "#495057" };
};

export default function EditVoting() {
	const { id } = useParams();
	const navigate = useNavigate();
	const fileInputRef = useRef(null);

	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState("");
	const [searchQueryManagers, setSearchQueryManagers] = useState("");

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		category: "",
		votingMode: "single",
		questions: [],
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
		isAnonymous: false,
	});

	const [groups, setGroups] = useState([]);
	const [members, setMembers] = useState([]);
	const [resolutions, setResolutions] = useState([]);
	const [amendments, setAmendments] = useState([]);
	const [users, setUsers] = useState([]);
	const [selectedResolution, setSelectedResolution] = useState("");
	const [selectedAmendment, setSelectedAmendment] = useState("");
	const [errors, setErrors] = useState({});
	const [searchQuery, setSearchQuery] = useState("");
	const [searchQueryManagersLocal, setSearchQueryManagersLocal] = useState("");

	// ---- Pole tekstowe na maile (zamiast checkboxów) ----
	const [memberEmailsInput, setMemberEmailsInput] = useState("");
	const [unmatchedEmails, setUnmatchedEmails] = useState([]);

	// ---- Nowe stany dla trybu zbiorczego ----
	const [editingQuestionId, setEditingQuestionId] = useState(null);
	const [questionDraft, setQuestionDraft] = useState({
		text: "",
		linkedItemType: "none",
		linkedItemId: "",
		resolutionId: "",
	});
	const [questionErrors, setQuestionErrors] = useState({});

	const token = localStorage.getItem("token");

	const newQuestionId = () =>
		`q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

	// ============================================================
	// Pomocnicze
	// ============================================================

	const getAmendmentsForResolution = (resolutionId) => {
		if (!resolutionId) return [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];
		return amendmentsArray.filter((a) => {
			const matchesResolution = String(a.resolutionId) === String(resolutionId);
			const isPending = a.status === "pending";
			return matchesResolution && isPending;
		});
	};

	const getFilteredGroups = () => {
		if (!searchQuery.trim()) return groups;
		return groups.filter((group) =>
			group.name?.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	};

	const getFilteredManagers = () => {
		const q = searchQueryManagersLocal || searchQueryManagers;
		if (!q.trim()) return users;
		return users.filter(
			(user) =>
				user.name?.toLowerCase().includes(q.toLowerCase()) ||
				user.role?.toLowerCase().includes(q.toLowerCase()) ||
				user.group?.toLowerCase().includes(q.toLowerCase()),
		);
	};

	const getUserDisplay = (id) => {
		const u = users.find((x) => x.id === id);
		if (!u) return `#${id}`;
		return u.name || u.username || u.email || `#${id}`;
	};

	const normalizeEmail = (s) => String(s || "").trim().toLowerCase();

	const parseEmails = (raw) =>
		String(raw || "")
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

	const findUserByEmail = (email) => {
		const norm = normalizeEmail(email);
		return users.find((u) => {
			const candidates = [u.email, u.username, u.mail]
				.filter(Boolean)
				.map((v) => normalizeEmail(v));
			return candidates.includes(norm);
		});
	};

	// ============================================================
	// Handlery
	// ============================================================

	const handleManagerToggle = (memberId) => {
		setFormData((prev) => {
			const newManagers = prev.managers?.includes(memberId)
				? prev.managers.filter((id) => id !== memberId)
				: [...(prev.managers || []), memberId];
			return { ...prev, managers: newManagers };
		});
	};

	const handleLinkedItemTypeChange = (type) => {
		setFormData((prev) => ({
			...prev,
			linkedItemType: type,
			linkedItemId: "",
		}));
		setSelectedResolution("");
		setSelectedAmendment("");
	};

	const handleRecipientsChange = (type) => {
		setFormData((prev) => ({
			...prev,
			recipientsType: type,
			selectedGroups: [],
			selectedMembers: [],
		}));
		setMemberEmailsInput("");
		setUnmatchedEmails([]);
		setErrors({});
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

	const handleAddMembersFromEmails = () => {
		const emails = parseEmails(memberEmailsInput);
		if (emails.length === 0) return;

		const foundIds = [];
		const notFound = [];

		for (const email of emails) {
			const user = findUserByEmail(email);
			if (user) {
				foundIds.push(user.id);
			} else {
				notFound.push(email);
			}
		}

		setFormData((prev) => {
			const merged = [...new Set([...prev.selectedMembers, ...foundIds])];
			return { ...prev, selectedMembers: merged };
		});

		setUnmatchedEmails(notFound);
		setMemberEmailsInput("");
		setErrors({});
	};

	const handleRemoveMember = (memberId) => {
		setFormData((prev) => ({
			...prev,
			selectedMembers: prev.selectedMembers.filter((id) => id !== memberId),
		}));
	};

	// ============================================================
	// Ładowanie danych
	// ============================================================

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);

				// Głosowanie
				const votingRes = await fetch(`/newapp/api/votings/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!votingRes.ok) {
					throw new Error("Nie udało się pobrać danych głosowania");
				}
				const votingData = await votingRes.json();

				// Grupy
				try {
					const groupsRes = await fetch("/newapp/api/groups", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (groupsRes.ok) {
						const g = await groupsRes.json();
						setGroups(g.data || g || []);
					}
				} catch { }

				// Członkowie (members)
				try {
					const membersRes = await fetch("/newapp/api/members", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (membersRes.ok) {
						const m = await membersRes.json();
						setMembers(m.data || m || []);
					}
				} catch { }

				// Users (do maili i managers)
				try {
					const usersRes = await fetch("/newapp/api/users", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (usersRes.ok) {
						const u = await usersRes.json();
						setUsers(u.data || u || []);
					}
				} catch { }

				// Uchwały
				let resolutionsArray = [];
				try {
					const resolutionsRes = await fetch("/newapp/api/resolutions", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (resolutionsRes.ok) {
						const rawData = await resolutionsRes.json();
						if (Array.isArray(rawData)) resolutionsArray = rawData;
						else if (Array.isArray(rawData.resolutions))
							resolutionsArray = rawData.resolutions;
						else if (Array.isArray(rawData.data))
							resolutionsArray = rawData.data;
						else {
							for (const key of Object.keys(rawData)) {
								if (Array.isArray(rawData[key])) {
									resolutionsArray = rawData[key];
									break;
								}
							}
						}
					}
				} catch { }
				setResolutions(resolutionsArray);

				// Poprawki
				let amendmentsArray = [];
				try {
					const amendmentsRes = await fetch("/newapp/api/amendments", {
						headers: { Authorization: `Bearer ${token}` },
					});
					if (amendmentsRes.ok) {
						const raw = await amendmentsRes.json();
						if (Array.isArray(raw)) amendmentsArray = raw;
						else if (Array.isArray(raw.amendments))
							amendmentsArray = raw.amendments;
						else if (Array.isArray(raw.data)) amendmentsArray = raw.data;
					}
				} catch { }
				setAmendments(amendmentsArray);

				// Wypełnienie formularza
				setFormData((prev) => ({
					...prev,
					title: votingData.title || "",
					description: votingData.description || "",
					category: votingData.category || "",
					votingMode: votingData.votingMode || "single",
					questions: Array.isArray(votingData.questions)
						? votingData.questions
						: [],
					recipientsType: votingData.recipientsType || "all",
					selectedGroups: votingData.selectedGroups || [],
					selectedMembers: votingData.selectedMembers || [],
					startDateTime: votingData.startTime
						? votingData.startTime.slice(0, 16)
						: "",
					endDateTime: votingData.endTime
						? votingData.endTime.slice(0, 16)
						: "",
					durationType: "datetime",
					linkedItemType: votingData.linkedItemType || "none",
					linkedItemId: votingData.linkedItemId || "",
					attachments: votingData.attachments || [],
					applicant: votingData.applicant || "",
					managers: votingData.managers || [],
					isAnonymous: votingData.isAnonymous ?? false,
				}));

				// Powiązanie z uchwałą/poprawką
				if (
					votingData.linkedItemType === "amendment" &&
					votingData.linkedItemId
				) {
					const amendment = amendmentsArray.find(
						(a) => String(a.id) === String(votingData.linkedItemId),
					);
					if (amendment) {
						setSelectedResolution(String(amendment.resolutionId));
						setSelectedAmendment(String(votingData.linkedItemId));
					}
				} else if (
					votingData.linkedItemType === "resolution" &&
					votingData.linkedItemId
				) {
					setSelectedResolution(String(votingData.linkedItemId));
				}
			} catch (err) {
				setFetchError(err.message);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [id, token]);

	// ============================================================
	// Walidacja
	// ============================================================

	const validateStep = (step) => {
		const newErrors = {};

		if (step === 1) {
			if (!formData.title.trim()) newErrors.title = "Tytuł jest wymagany";
			if (!formData.category) newErrors.category = "Wybierz kategorię";
			if (!formData.votingMode)
				newErrors.votingMode = "Wybierz tryb głosowania";
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
				newErrors.recipients = "Dodaj co najmniej jednego użytkownika (e-mail)";
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
			if (formData.votingMode === "single") {
				if (
					formData.linkedItemType === "resolution" &&
					!formData.linkedItemId
				) {
					newErrors.linkedItem = "Wybierz uchwałę";
				}
				if (formData.linkedItemType === "amendment" && !formData.linkedItemId) {
					newErrors.linkedItem = "Wybierz poprawkę";
				}
				if (formData.linkedItemType === "amendment" && !selectedResolution) {
					newErrors.linkedItem =
						"Najpierw wybierz uchwałę, a następnie poprawkę";
				}
			} else {
				if (!formData.questions || formData.questions.length === 0) {
					newErrors.questions = "Dodaj co najmniej jedno pytanie";
				} else if (formData.questions.some((q) => !q.text.trim())) {
					newErrors.questions = "Każde pytanie musi mieć treść";
				}
			}

			if (formData.isAnonymous === undefined || formData.isAnonymous === null) {
				newErrors.isAnonymous = "Wybierz typ głosowania";
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

	// ============================================================
	// Tryb zbiorczy – operacje na pytaniach
	// ============================================================

	const resetQuestionDraft = () => {
		setEditingQuestionId(null);
		setQuestionDraft({
			text: "",
			linkedItemType: "none",
			linkedItemId: "",
			resolutionId: "",
		});
		setQuestionErrors({});
	};

	const validateQuestionDraft = () => {
		const errs = {};
		if (!questionDraft.text.trim()) {
			errs.text = "Treść pytania jest wymagana";
		}
		if (
			questionDraft.linkedItemType === "resolution" &&
			!questionDraft.linkedItemId
		) {
			errs.linkedItem = "Wybierz uchwałę";
		}
		if (questionDraft.linkedItemType === "amendment") {
			if (!questionDraft.resolutionId) {
				errs.linkedItem = "Najpierw wybierz uchwałę";
			} else if (!questionDraft.linkedItemId) {
				errs.linkedItem = "Wybierz poprawkę";
			}
		}
		setQuestionErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleSaveQuestion = () => {
		if (!validateQuestionDraft()) return;

		const q = {
			id: editingQuestionId || newQuestionId(),
			text: questionDraft.text.trim(),
			linkedItemType: questionDraft.linkedItemType,
			linkedItemId: questionDraft.linkedItemId || "",
			resolutionId:
				questionDraft.linkedItemType === "amendment"
					? questionDraft.resolutionId
					: "",
		};

		setFormData((prev) => {
			if (editingQuestionId) {
				return {
					...prev,
					questions: prev.questions.map((item) =>
						item.id === editingQuestionId ? q : item,
					),
				};
			}
			return { ...prev, questions: [...prev.questions, q] };
		});

		resetQuestionDraft();
		setErrors((prev) => ({ ...prev, questions: undefined }));
	};

	const handleEditQuestion = (question) => {
		setEditingQuestionId(question.id);
		setQuestionDraft({
			text: question.text,
			linkedItemType: question.linkedItemType,
			linkedItemId: question.linkedItemId,
			resolutionId: question.resolutionId || "",
		});
		setQuestionErrors({});
	};

	const handleDeleteQuestion = (questionId) => {
		setFormData((prev) => ({
			...prev,
			questions: prev.questions.filter((q) => q.id !== questionId),
		}));
		if (editingQuestionId === questionId) {
			resetQuestionDraft();
		}
	};

	const handleMoveQuestion = (questionId, direction) => {
		setFormData((prev) => {
			const idx = prev.questions.findIndex((q) => q.id === questionId);
			if (idx === -1) return prev;
			const newIdx = direction === "up" ? idx - 1 : idx + 1;
			if (newIdx < 0 || newIdx >= prev.questions.length) return prev;
			const arr = [...prev.questions];
			[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
			return { ...prev, questions: arr };
		});
	};

	// ============================================================
	// Załączniki
	// ============================================================

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
		return (bytes / (1024 * 1024)).toFixed(1) + " MB";
	};

	// ============================================================
	// Submit
	// ============================================================

	const handleSubmit = async () => {
		if (!validateStep(currentStep)) return;

		setIsSubmitting(true);
		setSubmitError("");

		try {
			const votingData = {
				title: formData.title,
				description: formData.description,
				category: formData.category,
				votingMode: formData.votingMode,
				questions:
					formData.votingMode === "batch"
						? formData.questions.map((q) => ({
							id: q.id,
							text: q.text,
							linkedItemType: q.linkedItemType,
							linkedItemId: q.linkedItemId || null,
							resolutionId: q.resolutionId || null,
						}))
						: [],
				startTime: formData.startDateTime
					? new Date(formData.startDateTime).toISOString()
					: null,
				endTime:
					formData.durationType === "datetime"
						? formData.endDateTime
							? new Date(formData.endDateTime).toISOString()
							: null
						: getEndDate()?.toISOString() || null,
				recipientsType: formData.recipientsType,
				selectedGroups: formData.selectedGroups,
				selectedMembers: formData.selectedMembers,
				linkedItemType:
					formData.votingMode === "single" ? formData.linkedItemType : "none",
				linkedItemId:
					formData.votingMode === "single" ? formData.linkedItemId : "",
				applicant: formData.applicant,
				managers: formData.managers || [],
				quorumRequired: 50,
				majorityType: "simple",
				allowAbstain: true,
				isAnonymous: formData.isAnonymous,
				requireComment: false,
				canChangeVote: false,
				showResultsDuringVoting: false,
				notifyEmail: false,
				notifyPush: false,
			};

			const response = await fetch(`/newapp/api/votings/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(votingData),
			});

			const rawText = await response.text();
			let data = {};
			if (rawText) {
				try {
					data = JSON.parse(rawText);
				} catch {
					data = { message: rawText };
				}
			}

			if (!response.ok) {
				throw new Error(
					data.message ||
					data.error ||
					`Serwer zwrócił ${response.status} ${response.statusText}`,
				);
			}

			// Załączniki (tylko nowe)
			const newFiles = formData.attachments.filter((att) => att.file);
			if (newFiles.length > 0) {
				const fd = new FormData();
				newFiles.forEach((att, index) => {
					if (att.file) {
						fd.append(`attachment_${index}`, att.file);
					}
				});

				const attRes = await fetch(`/newapp/api/votings/${id}/attachments`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
					body: fd,
				});

				if (!attRes.ok) {
					const t = await attRes.text();
					console.warn("Nie udało się dodać załączników:", t);
				}
			}

			navigate("/glosowania");
		} catch (err) {
			setSubmitError(err.message);
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
			members: "Wybrane osoby",
		};
		return types[formData.recipientsType] || formData.recipientsType;
	};

	const getSelectedGroupsNames = () => {
		return groups
			.filter((g) => formData.selectedGroups.includes(g.id))
			.map((g) => g.name);
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
			const item = resolutionsArray.find(
				(r) => String(r.id) === String(formData.linkedItemId),
			);
			return item ? `Uchwała: ${item.title}` : "Nie wybrano";
		}

		if (formData.linkedItemType === "amendment") {
			const item = amendmentsArray.find(
				(a) => String(a.id) === String(formData.linkedItemId),
			);
			return item ? `Poprawka: ${item.title || `#${item.id}`}` : "Nie wybrano";
		}

		return "Nie wybrano";
	};

	// ============================================================
	// KROK 1
	// ============================================================

	const renderStep1 = () => (
		<div className="step-content">
			<h2>Podstawowe informacje</h2>

			<div className="form-group">
				<label>Tryb głosowania *</label>
				<div className="voting-mode-options">
					<button
						type="button"
						className={`voting-mode-option ${formData.votingMode === "single" ? "active" : ""}`}
						onClick={() =>
							setFormData((prev) => ({
								...prev,
								votingMode: "single",
								questions: [],
							}))
						}
					>
						<strong>Pojedyncze</strong>
						<small>Jedno pytanie / uchwała / poprawka</small>
					</button>
					<button
						type="button"
						className={`voting-mode-option ${formData.votingMode === "batch" ? "active" : ""}`}
						onClick={() =>
							setFormData((prev) => ({ ...prev, votingMode: "batch" }))
						}
					>
						<strong>Zbiorcze</strong>
						<small>Kilka pytań głosowanych razem</small>
					</button>
				</div>
				{errors.votingMode && (
					<span className="error-text">{errors.votingMode}</span>
				)}
			</div>

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
					onChange={(e) =>
						setFormData({ ...formData, description: e.target.value })
					}
					placeholder="Wprowadź opis głosowania"
					rows={4}
				/>
			</div>

			<div className="form-group">
				<label>Kategoria *</label>
				<select
					value={formData.category}
					onChange={(e) =>
						setFormData({ ...formData, category: e.target.value })
					}
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
				{errors.category && (
					<span className="error-text">{errors.category}</span>
				)}
			</div>
		</div>
	);

	// ============================================================
	// KROK 2
	// ============================================================

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
						Wybrane osoby (e-mail)
					</button>
				</div>
				{errors.recipients && (
					<span className="error-text">{errors.recipients}</span>
				)}
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
						{getFilteredGroups().map((group) => {
							const isSelected = formData.selectedGroups.includes(group.id);
							const groupMembers = members.filter(
								(m) => m.group === group.name,
							);
							return (
								<div
									key={group.id}
									className={`group-item ${isSelected ? "selected" : ""}`}
									onClick={() => handleGroupToggle(group.id)}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={() => { }}
										/>
										<span>{group.name}</span>
										<span className="member-count">
											({group.memberCount || groupMembers.length || 0} członków)
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{formData.recipientsType === "individual" && (
				<div className="form-group">
					<label>Dodaj uprawnionych przez e-mail</label>
					<p
						className="field-hint"
						style={{
							fontSize: "13px",
							color: "#6c757d",
							marginBottom: "8px",
						}}
					>
						Wpisz adresy e-mail (możesz oddzielić spacją, przecinkiem lub
						nową linią). Zostaną dopasowane do istniejących użytkowników.
					</p>

					<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
						<textarea
							rows={3}
							placeholder="np. jan.kowalski@parlamentmlodych.eu anna.nowak@parlamentmlodych.eu"
							value={memberEmailsInput}
							onChange={(e) => setMemberEmailsInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
									e.preventDefault();
									handleAddMembersFromEmails();
								}
							}}
							style={{
								flex: 1,
								padding: "8px 12px",
								border: "1px solid #ddd",
								borderRadius: "6px",
								fontFamily: "inherit",
								fontSize: "13px",
								resize: "vertical",
							}}
						/>
						<button
							type="button"
							className="btn-primary"
							onClick={handleAddMembersFromEmails}
							disabled={!memberEmailsInput.trim()}
							style={{
								padding: "8px 16px",
								alignSelf: "flex-start",
								whiteSpace: "nowrap",
							}}
						>
							<Plus size={16} /> Dodaj
						</button>
					</div>

					{unmatchedEmails.length > 0 && (
						<div
							className="error-text"
							style={{
								marginBottom: "8px",
								fontSize: "12px",
								lineHeight: 1.5,
							}}
						>
							<strong>Nie znaleziono użytkownika dla:</strong>{" "}
							{unmatchedEmails.join(", ")}
						</div>
					)}

					{formData.selectedMembers.length > 0 ? (
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								padding: "8px",
								border: "1px solid #e9ecef",
								borderRadius: "6px",
								background: "#f8f9fa",
							}}
						>
							{formData.selectedMembers.map((memberId) => (
								<span
									key={memberId}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "4px 10px",
										background: "#e7f0ff",
										borderRadius: "20px",
										fontSize: "12px",
										color: "#004085",
									}}
								>
									{getUserDisplay(memberId)}
									<button
										type="button"
										onClick={() => handleRemoveMember(memberId)}
										style={{
											background: "none",
											border: "none",
											color: "#dc3545",
											cursor: "pointer",
											fontSize: "14px",
											padding: "0 2px",
										}}
									>
										×
									</button>
								</span>
							))}
						</div>
					) : (
						<p
							style={{
								fontSize: "13px",
								color: "#6c757d",
								fontStyle: "italic",
							}}
						>
							Nie dodano jeszcze żadnych osób.
						</p>
					)}
				</div>
			)}
		</div>
	);

	// ============================================================
	// KROK 3
	// ============================================================

	const renderStep3 = () => (
		<div className="step-content">
			<h2>Czas i data głosowania</h2>

			<div className="form-group">
				<label>Data rozpoczęcia *</label>
				<input
					type="datetime-local"
					value={formData.startDateTime}
					onChange={(e) =>
						setFormData({ ...formData, startDateTime: e.target.value })
					}
					className={errors.startDateTime ? "error" : ""}
				/>
				{errors.startDateTime && (
					<span className="error-text">{errors.startDateTime}</span>
				)}
			</div>

			<div className="form-group">
				<label>Sposób określenia czasu trwania</label>
				<div className="duration-type-options">
					<button
						type="button"
						className={`duration-type ${formData.durationType === "datetime" ? "active" : ""}`}
						onClick={() =>
							setFormData({ ...formData, durationType: "datetime" })
						}
					>
						Konkretna data
					</button>
					<button
						type="button"
						className={`duration-type ${formData.durationType === "duration" ? "active" : ""}`}
						onClick={() =>
							setFormData({ ...formData, durationType: "duration" })
						}
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
						onChange={(e) =>
							setFormData({ ...formData, endDateTime: e.target.value })
						}
						className={errors.endDateTime ? "error" : ""}
					/>
					{errors.endDateTime && (
						<span className="error-text">{errors.endDateTime}</span>
					)}
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
								onChange={(e) =>
									setFormData({
										...formData,
										durationDays: parseInt(e.target.value) || 0,
									})
								}
							/>
						</div>
						<div className="duration-input">
							<label>Godziny</label>
							<input
								type="number"
								min="0"
								max="23"
								value={formData.durationHours}
								onChange={(e) =>
									setFormData({
										...formData,
										durationHours: parseInt(e.target.value) || 0,
									})
								}
							/>
						</div>
						<div className="duration-input">
							<label>Minuty</label>
							<input
								type="number"
								min="0"
								max="59"
								value={formData.durationMinutes}
								onChange={(e) =>
									setFormData({
										...formData,
										durationMinutes: parseInt(e.target.value) || 0,
									})
								}
							/>
						</div>
					</div>
					{errors.duration && (
						<span className="error-text">{errors.duration}</span>
					)}
					{formData.startDateTime && (
						<div className="end-date-preview">
							Data zakończenia:{" "}
							<strong>{getEndDate()?.toLocaleString()}</strong>
						</div>
					)}
				</div>
			)}
		</div>
	);

	// ============================================================
	// KROK 4 – SINGLE
	// ============================================================

	const renderSingleLinkSection = () => {
		const resolutionsArray = Array.isArray(resolutions) ? resolutions : [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];

		const amendmentsForResolution =
			getAmendmentsForResolution(selectedResolution);
		const selectedResolutionObj = resolutionsArray.find(
			(r) => String(r.id) === String(selectedResolution),
		);

		return (
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

				{(formData.linkedItemType === "resolution" ||
					formData.linkedItemType === "amendment") && (
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
										resolutionsArray.map((res) => {
											const statusColors = getStatusColor(res.status);
											const isSelected =
												String(selectedResolution) === String(res.id);
											return (
												<div
													key={res.id}
													className={`item-card ${isSelected ? "selected" : ""}`}
													onClick={() => {
														setSelectedResolution(String(res.id));
														setSelectedAmendment("");
														if (formData.linkedItemType !== "amendment") {
															setFormData((prev) => ({
																...prev,
																linkedItemType: "resolution",
																linkedItemId: String(res.id),
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
																padding: "2px 10px",
																borderRadius: "12px",
																fontSize: "11px",
																fontWeight: "500",
																display: "inline-block",
															}}
														>
															{getStatusLabel(res.status)}
														</span>
														<span className="item-date">
															{res.createdAt || "Brak daty"}
														</span>
													</div>
													<div className="item-title">
														{res.title || "Brak tytułu"}
													</div>
													<div className="item-meta">
														<span>Autor: {res.author || "Nieznany"}</span>
													</div>
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
								Wybierz poprawkę do "
								{selectedResolutionObj?.title || "wybranej uchwały"}"
							</label>

							{amendmentsForResolution.length === 0 ? (
								<div className="no-amendments">
									<p>Brak poprawek do tej uchwały</p>
									<button
										type="button"
										className="btn-secondary"
										onClick={() =>
											navigate(
												`/resolutions/${selectedResolution}/amendments/create`,
											)
										}
									>
										Utwórz poprawkę
									</button>
								</div>
							) : (
								<div className="amendments-list">
									<p className="amendments-count-info">
										Znaleziono {amendmentsForResolution.length} poprawek
									</p>
									{amendmentsForResolution.map((am) => {
										const statusColors = getStatusColor(am.status);
										const isSelected =
											String(selectedAmendment) === String(am.id);
										return (
											<div
												key={am.id}
												className={`amendment-card ${isSelected ? "selected" : ""}`}
												onClick={() => {
													setSelectedAmendment(String(am.id));
													setFormData((prev) => ({
														...prev,
														linkedItemType: "amendment",
														linkedItemId: String(am.id),
													}));
												}}
											>
												<div className="amendment-header">
													<span
														className="amendment-status"
														style={{
															background: statusColors.bg,
															color: statusColors.color,
															padding: "2px 10px",
															borderRadius: "12px",
															fontSize: "11px",
															fontWeight: "500",
															display: "inline-block",
														}}
													>
														{getStatusLabel(am.status)}
													</span>
													<span className="amendment-date">
														{am.createdAt || "Brak daty"}
													</span>
												</div>
												<div className="amendment-title">
													Poprawka #{am.id} - {am.author}
												</div>
												<div className="amendment-content">
													{am.content && am.content.length > 100
														? am.content.substring(0, 100) + "..."
														: am.content}
												</div>
												{isSelected && (
													<div
														style={{
															marginTop: "6px",
															fontSize: "12px",
															color: "#28a745",
															fontWeight: "500",
														}}
													>
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
						{formData.linkedItemType === "resolution" &&
							selectedResolutionObj && (
								<div className="preview-card resolution-preview">
									<div
										className="preview-badge"
										style={{
											background: "#d4edda",
											color: "#155724",
											padding: "2px 12px",
											borderRadius: "12px",
											fontSize: "11px",
											fontWeight: "bold",
											display: "inline-block",
											marginBottom: "8px",
										}}
									>
										UCHWAŁA
									</div>
									<h3>{selectedResolutionObj.title}</h3>
									<div className="preview-details">
										<span>
											Status: {getStatusLabel(selectedResolutionObj.status)}
										</span>
										<span>Autor: {selectedResolutionObj.author}</span>
									</div>
								</div>
							)}

						{formData.linkedItemType === "amendment" && (
							<div className="preview-card amendment-preview">
								<div
									className="preview-badge"
									style={{
										background: "#fff3cd",
										color: "#856404",
										padding: "2px 12px",
										borderRadius: "12px",
										fontSize: "11px",
										fontWeight: "bold",
										display: "inline-block",
										marginBottom: "8px",
									}}
								>
									POPRAWKA
								</div>
								{(() => {
									const selectedAm = amendmentsArray.find(
										(a) => String(a.id) === String(formData.linkedItemId),
									);
									if (!selectedAm) return <p>Nie znaleziono poprawki</p>;
									return (
										<>
											<h3>Poprawka #{selectedAm.id}</h3>
											<p>
												<strong>Autor:</strong> {selectedAm.author}
											</p>
											<p>
												<strong>Treść:</strong> {selectedAm.content}
											</p>
										</>
									);
								})()}
							</div>
						)}

						<button
							type="button"
							className="btn-clear"
							onClick={() => {
								setFormData((prev) => ({
									...prev,
									linkedItemType: "none",
									linkedItemId: "",
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
		);
	};

	// ============================================================
	// KROK 4 – BATCH
	// ============================================================

	const renderBatchQuestions = () => {
		const resolutionsArray = Array.isArray(resolutions) ? resolutions : [];

		return (
			<div className="form-section">
				<h3>Pytania w głosowaniu zbiorczym</h3>
				<p className="form-hint">
					Zdefiniuj pytania, które pojawią się na jednej karcie do głosowania.
				</p>

				{formData.questions.length > 0 && (
					<div className="batch-questions-list">
						{formData.questions.map((q, idx) => (
							<div
								key={q.id}
								className={`batch-question-item ${editingQuestionId === q.id ? "editing" : ""}`}
							>
								<div className="batch-question-order">
									<GripVertical size={16} color="#adb5bd" />
									<span className="batch-question-number">{idx + 1}</span>
								</div>
								<div className="batch-question-body">
									<div className="batch-question-text">{q.text}</div>
									<div className="batch-question-meta">
										{q.linkedItemType === "none" && (
											<span className="badge badge-neutral">
												Brak powiązania
											</span>
										)}
										{q.linkedItemType === "resolution" && (
											<span className="badge badge-resolution">
												Uchwała:{" "}
												{resolutionsArray.find(
													(r) => String(r.id) === String(q.linkedItemId),
												)?.title || "Nieznana"}
											</span>
										)}
										{q.linkedItemType === "amendment" && (
											<span className="badge badge-amendment">
												Poprawka #{q.linkedItemId}
											</span>
										)}
									</div>
								</div>
								<div className="batch-question-actions">
									<button
										type="button"
										title="W górę"
										onClick={() => handleMoveQuestion(q.id, "up")}
										disabled={idx === 0}
									>
										↑
									</button>
									<button
										type="button"
										title="W dół"
										onClick={() => handleMoveQuestion(q.id, "down")}
										disabled={idx === formData.questions.length - 1}
									>
										↓
									</button>
									<button
										type="button"
										title="Edytuj"
										onClick={() => handleEditQuestion(q)}
									>
										✎
									</button>
									<button
										type="button"
										title="Usuń"
										onClick={() => handleDeleteQuestion(q.id)}
										className="danger"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				<div className="batch-question-editor">
					<h4>{editingQuestionId ? "Edytuj pytanie" : "Dodaj nowe pytanie"}</h4>

					<div className="form-group">
						<label>Treść pytania *</label>
						<input
							type="text"
							value={questionDraft.text}
							onChange={(e) =>
								setQuestionDraft((prev) => ({
									...prev,
									text: e.target.value,
								}))
							}
							placeholder='np. "Czy jesteś za przyjęciem poprawki nr 1?"'
							className={questionErrors.text ? "error" : ""}
						/>
						{questionErrors.text && (
							<span className="error-text">{questionErrors.text}</span>
						)}
					</div>

					<div className="form-group">
						<label>Powiązanie</label>
						<div className="linked-item-selector compact">
							<button
								type="button"
								className={`link-option ${questionDraft.linkedItemType === "none" ? "active" : ""}`}
								onClick={() =>
									setQuestionDraft((prev) => ({
										...prev,
										linkedItemType: "none",
										linkedItemId: "",
										resolutionId: "",
									}))
								}
							>
								<div>
									<strong>Brak</strong>
									<small>Samodzielne pytanie</small>
								</div>
							</button>
							<button
								type="button"
								className={`link-option ${questionDraft.linkedItemType === "resolution" ? "active" : ""}`}
								onClick={() =>
									setQuestionDraft((prev) => ({
										...prev,
										linkedItemType: "resolution",
										linkedItemId: "",
										resolutionId: "",
									}))
								}
							>
								<div>
									<strong>Uchwała</strong>
									<small>Głosowanie nad uchwałą</small>
								</div>
							</button>
							<button
								type="button"
								className={`link-option ${questionDraft.linkedItemType === "amendment" ? "active" : ""}`}
								onClick={() =>
									setQuestionDraft((prev) => ({
										...prev,
										linkedItemType: "amendment",
										linkedItemId: "",
										resolutionId: "",
									}))
								}
							>
								<div>
									<strong>Poprawka</strong>
									<small>Głosowanie nad poprawką</small>
								</div>
							</button>
						</div>
					</div>

					{(questionDraft.linkedItemType === "resolution" ||
						questionDraft.linkedItemType === "amendment") && (
							<div className="form-group">
								<label>
									{questionDraft.linkedItemType === "amendment"
										? "Wybierz uchwałę, do której należy poprawka *"
										: "Wybierz uchwałę *"}
								</label>
								<div className="items-list scrollable">
									{resolutionsArray.length === 0 ? (
										<p className="no-items">Brak dostępnych uchwał</p>
									) : (
										resolutionsArray.map((res) => {
											const isSelected =
												String(questionDraft.resolutionId) === String(res.id) ||
												(questionDraft.linkedItemType === "resolution" &&
													String(questionDraft.linkedItemId) === String(res.id));
											return (
												<div
													key={res.id}
													className={`item-card compact ${isSelected ? "selected" : ""}`}
													onClick={() => {
														if (questionDraft.linkedItemType === "resolution") {
															setQuestionDraft((prev) => ({
																...prev,
																linkedItemId: String(res.id),
																resolutionId: "",
															}));
														} else {
															setQuestionDraft((prev) => ({
																...prev,
																resolutionId: String(res.id),
																linkedItemId: "",
															}));
														}
													}}
												>
													<div className="item-title">
														{res.title || "Brak tytułu"}
													</div>
												</div>
											);
										})
									)}
								</div>
							</div>
						)}

					{questionDraft.linkedItemType === "amendment" &&
						questionDraft.resolutionId && (
							<div className="form-group">
								<label>Wybierz poprawkę *</label>
								{getAmendmentsForResolution(questionDraft.resolutionId)
									.length === 0 ? (
									<p className="no-items">Brak poprawek do tej uchwały</p>
								) : (
									<div className="amendments-list scrollable">
										{getAmendmentsForResolution(questionDraft.resolutionId).map(
											(am) => {
												const isSelected =
													String(questionDraft.linkedItemId) === String(am.id);
												return (
													<div
														key={am.id}
														className={`amendment-card compact ${isSelected ? "selected" : ""}`}
														onClick={() =>
															setQuestionDraft((prev) => ({
																...prev,
																linkedItemId: String(am.id),
															}))
														}
													>
														<div className="amendment-title">
															Poprawka #{am.id} - {am.author}
														</div>
													</div>
												);
											},
										)}
									</div>
								)}
							</div>
						)}

					{questionErrors.linkedItem && (
						<span className="error-text">{questionErrors.linkedItem}</span>
					)}

					<div className="batch-editor-actions">
						<button
							type="button"
							className="btn-primary"
							onClick={handleSaveQuestion}
						>
							{editingQuestionId ? (
								<>
									<Check size={16} /> Zapisz zmiany
								</>
							) : (
								<>
									<Plus size={16} /> Dodaj pytanie
								</>
							)}
						</button>
						{editingQuestionId && (
							<button
								type="button"
								className="btn-secondary"
								onClick={resetQuestionDraft}
							>
								Anuluj edycję
							</button>
						)}
					</div>
				</div>

				{errors.questions && (
					<div className="error-text" style={{ marginTop: "10px" }}>
						{errors.questions}
					</div>
				)}
			</div>
		);
	};

	const renderStep4 = () => (
		<div className="step-content">
			<h2>Ustawienia zaawansowane</h2>

			{formData.votingMode === "single"
				? renderSingleLinkSection()
				: renderBatchQuestions()}

			<div className="form-section">
				<h3>Pozostałe ustawienia</h3>

				<div className="form-group">
					<label>Typ głosowania *</label>
					<div className="voting-type-options">
						<button
							type="button"
							className={`voting-type-option ${formData.isAnonymous === false ? "active" : ""}`}
							onClick={() => setFormData({ ...formData, isAnonymous: false })}
						>
							<Eye size={24} className="voting-type-icon" />
							<div className="voting-type-info">
								<strong>Jawne</strong>
								<small>Widoczne kto jak głosował</small>
							</div>
						</button>
						<button
							type="button"
							className={`voting-type-option ${formData.isAnonymous === true ? "active" : ""}`}
							onClick={() => setFormData({ ...formData, isAnonymous: true })}
						>
							<Lock size={24} className="voting-type-icon" />
							<div className="voting-type-info">
								<strong>Niejawne</strong>
								<small>Ukryte głosy posłów</small>
							</div>
						</button>
					</div>
				</div>

				<div className="form-group">
					<label>Wnioskodawca</label>
					<select
						value={formData.applicant}
						onChange={(e) =>
							setFormData({ ...formData, applicant: e.target.value })
						}
					>
						<option value="">Wybierz wnioskodawcę</option>
						<option value="marshal">Marszałek Parlamentu</option>
						<option value="presidium">Prezydium Parlamentu</option>
						<option value="group_15">Grupa 15 posłów</option>
						{groups.map((g) => (
							<option key={g.id} value={String(g.id)}>
								{g.name}
							</option>
						))}
					</select>
				</div>

				<div className="form-group">
					<label>Kto może zarządzać głosowaniem?</label>
					<input
						type="text"
						placeholder="Szukaj osoby..."
						value={searchQueryManagersLocal}
						onChange={(e) => setSearchQueryManagersLocal(e.target.value)}
						className="search-input"
						style={{
							width: "100%",
							padding: "8px 12px",
							border: "1px solid #ddd",
							borderRadius: "6px",
							marginBottom: "8px",
						}}
					/>
					<div
						className="checkbox-grid"
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
							gap: "8px",
							maxHeight: "200px",
							overflowY: "auto",
							padding: "4px",
							border: "1px solid #eee",
							borderRadius: "6px",
						}}
					>
						{getFilteredManagers()
							.filter((user) => user.role !== "admin")
							.map((user) => (
								<label
									key={user.id}
									className="checkbox-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										padding: "4px 8px",
										cursor: "pointer",
										borderRadius: "4px",
									}}
								>
									<input
										type="checkbox"
										checked={formData.managers?.includes(user.id) || false}
										onChange={() => handleManagerToggle(user.id)}
									/>
									<span style={{ fontSize: "13px" }}>{user.name}</span>
									{user.group && (
										<span style={{ fontSize: "11px", color: "#6c757d" }}>
											({user.group})
										</span>
									)}
								</label>
							))}
					</div>
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
						{formData.attachments.map((att) => (
							<div key={att.id} className="attachment-item">
								<span>{att.name}</span>
								<span className="file-size">{formatFileSize(att.size)}</span>
								<button onClick={() => handleRemoveAttachment(att.id)}>
									×
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);

	// ============================================================
	// KROK 5 – podsumowanie
	// ============================================================

	const renderStep5 = () => {
		const resolutionsArray = Array.isArray(resolutions) ? resolutions : [];
		const amendmentsArray = Array.isArray(amendments) ? amendments : [];

		return (
			<div className="step-content">
				<h2>Podsumowanie</h2>

				<div className="summary-grid">
					<div className="summary-section">
						<h3>Podstawowe informacje</h3>
						<div className="summary-item">
							<span className="summary-label">Tryb:</span>
							<span className="summary-value">
								{formData.votingMode === "batch" ? "Zbiorcze" : "Pojedyncze"}
							</span>
						</div>
						<div className="summary-item">
							<span className="summary-label">Tytuł:</span>
							<span className="summary-value">{formData.title || "Brak"}</span>
						</div>
						<div className="summary-item">
							<span className="summary-label">Kategoria:</span>
							<span className="summary-value">
								{getCategoryLabel(formData.category)}
							</span>
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
								<span className="summary-value">
									{getSelectedGroupsNames().join(", ") || "Brak"}
								</span>
							</div>
						)}
						{formData.recipientsType === "individual" && (
							<div className="summary-item">
								<span className="summary-label">Osoby:</span>
								<span className="summary-value">
									{formData.selectedMembers
										.map((memberId) => getUserDisplay(memberId))
										.join(", ") || "Brak"}
								</span>
							</div>
						)}
					</div>

					<div className="summary-section">
						<h3>Czas</h3>
						<div className="summary-item">
							<span className="summary-label">Rozpoczęcie:</span>
							<span className="summary-value">
								{formData.startDateTime
									? new Date(formData.startDateTime).toLocaleString()
									: "Brak"}
							</span>
						</div>
						<div className="summary-item">
							<span className="summary-label">Zakończenie:</span>
							<span className="summary-value">
								{formData.durationType === "datetime"
									? formData.endDateTime
										? new Date(formData.endDateTime).toLocaleString()
										: "Brak"
									: getEndDate()?.toLocaleString() || "Brak"}
							</span>
						</div>
					</div>

					{formData.votingMode === "single" && (
						<div className="summary-section">
							<h3>Powiązania</h3>
							<div className="summary-item">
								<span className="summary-label">Powiązanie:</span>
								<span className="summary-value">{getLinkedItemLabel()}</span>
							</div>
							{formData.linkedItemType === "amendment" && (
								<div className="summary-item">
									<span className="summary-label">Do uchwały:</span>
									<span className="summary-value">
										{resolutionsArray.find(
											(r) =>
												String(r.id) ===
												String(
													amendmentsArray.find(
														(a) =>
															String(a.id) === String(formData.linkedItemId),
													)?.resolutionId,
												),
										)?.title || "Nieznana"}
									</span>
								</div>
							)}
						</div>
					)}

					{formData.votingMode === "batch" && (
						<div className="summary-section">
							<h3>Pytania ({formData.questions.length})</h3>
							<ol className="summary-questions-list">
								{formData.questions.map((q) => (
									<li key={q.id}>
										<div className="summary-question-text">{q.text}</div>
										{q.linkedItemType === "resolution" && (
											<div className="summary-question-link">
												Uchwała:{" "}
												{resolutionsArray.find(
													(r) => String(r.id) === String(q.linkedItemId),
												)?.title || "Nieznana"}
											</div>
										)}
										{q.linkedItemType === "amendment" && (
											<div className="summary-question-link">
												Poprawka #{q.linkedItemId} do uchwały:{" "}
												{resolutionsArray.find(
													(r) => String(r.id) === String(q.resolutionId),
												)?.title || "Nieznana"}
											</div>
										)}
									</li>
								))}
							</ol>
						</div>
					)}

					<div className="summary-section">
						<h3>Załączniki</h3>
						<div className="summary-item">
							<span className="summary-label">Załączniki:</span>
							<span className="summary-value">
								{formData.attachments.length > 0
									? `${formData.attachments.length} plików`
									: "Brak"}
							</span>
						</div>
					</div>

					{formData.applicant && (
						<div className="summary-section">
							<h3>Wnioskodawca</h3>
							<div className="summary-item">
								<span className="summary-label">Wnioskodawca:</span>
								<span className="summary-value">
									{getApplicantLabel(formData.applicant)}
								</span>
							</div>
						</div>
					)}

					<div className="summary-section">
						<h3>Ustawienia głosowania</h3>
						<div className="summary-item">
							<span className="summary-label">Typ głosowania:</span>
							<span className="summary-value">
								{formData.isAnonymous ? (
									<span
										style={{
											color: "#7c3aed",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<Lock size={16} /> Niejawne
									</span>
								) : (
									<span
										style={{
											color: "#2563eb",
											display: "flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<Eye size={16} /> Jawne
									</span>
								)}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// ============================================================
	// Render główny
	// ============================================================

	if (loading) {
		return (
			<div className="create-voting-page">
				<h2>Ładowanie danych głosowania...</h2>
			</div>
		);
	}

	if (fetchError) {
		return (
			<div className="create-voting-page">
				<h2>Błąd: {fetchError}</h2>
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
					<h1>Edytuj głosowanie</h1>
					<p>Zaktualizuj parametry głosowania</p>
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
						{isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
					</button>
				)}
			</div>
		</div>
	);
}