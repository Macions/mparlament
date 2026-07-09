import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateVoting.css";

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
		durationMinutes: 10,
		tags: [],
		linkedItemType: "none",
		linkedItemId: "",
		attachments: [],
		applicant: "",
	});

	// Stan dla danych z backendu
	const [groups, setGroups] = useState([]);
	const [members, setMembers] = useState([]);
	const [resolutions, setResolutions] = useState([]);
	const [amendments, setAmendments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [errors, setErrors] = useState({});
	const [tagInput, setTagInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchQueryMembers, setSearchQueryMembers] = useState("");

	const token = localStorage.getItem("token");

	// Pobieranie danych z backendu
	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);

				// Pobierz grupy/komisje
				const groupsRes = await fetch("/api/groups", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!groupsRes.ok) throw new Error("Nie udało się pobrać grup");
				const groupsData = await groupsRes.json();
				setGroups(groupsData);

				// Pobierz członków
				const membersRes = await fetch("/api/members", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!membersRes.ok) throw new Error("Nie udało się pobrać członków");
				const membersData = await membersRes.json();
				setMembers(membersData);

				// Pobierz uchwały
				const resolutionsRes = await fetch("/api/resolutions", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (resolutionsRes.ok) {
					const resolutionsData = await resolutionsRes.json();
					setResolutions(resolutionsData);
				}

				// Pobierz poprawki
				const amendmentsRes = await fetch("/api/amendments", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (amendmentsRes.ok) {
					const amendmentsData = await amendmentsRes.json();
					setAmendments(amendmentsData);
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

	const handleAddTag = (e) => {
		if (e.key === "Enter" && tagInput.trim()) {
			e.preventDefault();
			if (!formData.tags.includes(tagInput.trim())) {
				setFormData((prev) => ({
					...prev,
					tags: [...prev.tags, tagInput.trim()],
				}));
			}
			setTagInput("");
		}
	};

	const handleRemoveTag = (tagToRemove) => {
		setFormData((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	};

	const handleFileUpload = async (e) => {
		const files = Array.from(e.target.files);
		const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);

		// Tutaj możesz dodać upload plików na serwer
		// Na razie przechowujemy lokalnie
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
			// Przygotuj dane do wysłania
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
				tags: formData.tags,
				linkedItemType: formData.linkedItemType,
				linkedItemId: formData.linkedItemId,
				applicant: formData.applicant,
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

			// Jeśli są załączniki, wyślij je osobno
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

		if (formData.linkedItemType === "resolution") {
			const item = resolutions.find((r) => r.id === formData.linkedItemId);
			return item ? `Uchwała: ${item.title}` : "Nie wybrano";
		}

		if (formData.linkedItemType === "amendment") {
			const item = amendments.find((a) => a.id === formData.linkedItemId);
			return item ? `Poprawka: ${item.title}` : "Nie wybrano";
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

	// Reszta funkcji renderujących pozostaje taka sama, ale używają danych z backendu
	// ...

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
