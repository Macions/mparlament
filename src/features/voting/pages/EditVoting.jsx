import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
        recipientsType: "all",
        selectedGroups: [],
        selectedMembers: [],
        startDateTime: "",
        endDateTime: "",
        durationType: "datetime",
        durationDays: 0,
        durationHours: 0,
        durationMinutes: 10,
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
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState("");
    const [selectedResolution, setSelectedResolution] = useState("");
    const [selectedAmendment, setSelectedAmendment] = useState("");
    const [errors, setErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [searchQueryMembers, setSearchQueryMembers] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const token = localStorage.getItem("token");
    const [users, setUsers] = useState([]);
    const handleManagerToggle = (memberId) => {
        setFormData((prev) => ({
            ...prev,
            managers: prev.managers.includes(memberId)
                ? prev.managers.filter((id) => id !== memberId)
                : [...prev.managers, memberId],
        }));
    };

    const getAmendmentsForResolution = (resolutionId) => {
        if (!resolutionId) return [];
        const amendmentsArray = Array.isArray(amendments) ? amendments : [];
        return amendmentsArray.filter(a => {
            const matchesResolution = String(a.resolutionId) === String(resolutionId);
            const isPending = a.status === 'pending';
            return matchesResolution && isPending;
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
        if (formData.linkedItemType !== "amendment") {
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
        async function fetchUser() {
            try {
                const response = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const user = await response.json();
                    setIsAdmin(
                        user.role === "admin" || user.permissions?.includes("MANAGE_VOTINGS")
                    );
                }
            } catch (err) {
                console.error("Błąd pobierania użytkownika:", err);
            }
        }
        fetchUser();
    }, [token]);
    useEffect(() => {
        async function fetchData() {
            try {
                setLoadingData(true);


                const votingRes = await fetch(`/api/votings/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!votingRes.ok) {
                    throw new Error("Nie udało się pobrać danych głosowania");
                }

                const votingData = await votingRes.json();


                const groupsRes = await fetch("/api/groups", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let groupsData = [];
                if (groupsRes.ok) {
                    groupsData = await groupsRes.json();
                    setGroups(groupsData);
                }


                const usersRes = await fetch("/api/users", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let usersData = [];
                if (usersRes.ok) {
                    usersData = await usersRes.json();
                    setUsers(usersData);
                }


                const membersRes = await fetch("/api/users", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    setMembers(membersData);
                }


                const resolutionsRes = await fetch("/api/resolutions", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let resolutionsData = [];
                if (resolutionsRes.ok) {
                    const rawData = await resolutionsRes.json();
                    console.log("📄 Surowe dane uchwał:", rawData);


                    if (rawData && typeof rawData === 'object') {
                        if (Array.isArray(rawData)) {
                            resolutionsData = rawData;
                        } else if (rawData.resolutions && Array.isArray(rawData.resolutions)) {
                            resolutionsData = rawData.resolutions;
                        } else if (rawData.data && Array.isArray(rawData.data)) {
                            resolutionsData = rawData.data;
                        } else {

                            for (const key of Object.keys(rawData)) {
                                if (Array.isArray(rawData[key])) {
                                    resolutionsData = rawData[key];
                                    break;
                                }
                            }
                        }
                    }

                    console.log("📄 Przeparsowane uchwały:", resolutionsData);
                    setResolutions(resolutionsData);
                }


                const amendmentsRes = await fetch("/api/amendments", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let amendmentsData = [];
                if (amendmentsRes.ok) {
                    amendmentsData = await amendmentsRes.json();
                    console.log("✏️ Pobrane poprawki:", amendmentsData);
                    setAmendments(amendmentsData);
                }


                setFormData({
                    title: votingData.title || "",
                    description: votingData.description || "",
                    category: votingData.category || "",
                    recipientsType: votingData.recipientsType || "all",
                    selectedGroups: votingData.selectedGroups || [],
                    selectedMembers: votingData.selectedMembers || [],
                    startDateTime: votingData.startTime ? votingData.startTime.slice(0, 16) : "",
                    endDateTime: votingData.endTime ? votingData.endTime.slice(0, 16) : "",
                    durationType: "datetime",
                    durationDays: 0,
                    durationHours: 0,
                    durationMinutes: 10,
                    linkedItemType: votingData.linkedItemType || "none",
                    linkedItemId: votingData.linkedItemId || "",
                    attachments: votingData.attachments || [],
                    applicant: votingData.applicant || "",
                    managers: votingData.managers || [],
                });


                if (votingData.linkedItemType === "amendment" && votingData.linkedItemId) {
                    const amendment = amendmentsData.find(a => String(a.id) === String(votingData.linkedItemId));
                    if (amendment) {
                        setSelectedResolution(String(amendment.resolutionId));
                        setSelectedAmendment(String(votingData.linkedItemId));
                    }
                } else if (votingData.linkedItemType === "resolution" && votingData.linkedItemId) {
                    setSelectedResolution(String(votingData.linkedItemId));
                }

                console.log("Otrzymane dane głosowania:", votingData);
                console.log("recipientsType:", votingData.recipientsType);
                console.log("selectedGroups:", votingData.selectedGroups);
                console.log("selectedMembers:", votingData.selectedMembers);
                console.log("managers:", votingData.managers);

            } catch (err) {
                setFetchError(err.message);
            } finally {
                setLoadingData(false);
                setLoading(false);
            }
        }

        fetchData();
    }, [id, token]);
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
                (formData.recipientsType === "individual" || formData.recipientsType === "members") &&
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

    const getFilteredManagers = () => {
        if (!searchQueryManagers.trim()) return users;
        return users.filter(
            (user) =>
                user.name?.toLowerCase().includes(searchQueryManagers.toLowerCase()) ||
                user.group?.toLowerCase().includes(searchQueryManagers.toLowerCase())
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

            const response = await fetch(`/api/votings/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(votingData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Nie udało się zaktualizować głosowania");
            }


            const newFiles = formData.attachments.filter(att => att.file);
            if (newFiles.length > 0) {
                const formDataWithFiles = new FormData();
                newFiles.forEach((att, index) => {
                    if (att.file) {
                        formDataWithFiles.append(`attachment_${index}`, att.file);
                    }
                });

                await fetch(`/api/votings/${id}/attachments`, {
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
            console.error("Błąd aktualizacji głosowania:", err);
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
        return labels[category] || category || "Nie wybrano";
    };

    const getApplicantLabel = (applicant) => {
        if (!applicant) return "Nie wybrano"; // ZMIEŃ TĘ LINIĘ

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

    const getRecipientsLabel = () => {
        const types = {
            all: "Wszyscy parlamentarzyści",
            groups: "Wybrane grupy/komisje",
            individual: "Wybrane osoby",  // Zostało individual
            members: "Wybrane osoby",     // DODAJ OBSŁUGĘ TYPU "members"
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

    const formatRecipientsList = (items, maxDisplay = 5) => {
        if (!items || items.length === 0) return "Brak";
        if (items.length <= maxDisplay) {
            return items.join(", ");
        }
        const displayed = items.slice(0, maxDisplay);
        const remaining = items.length - maxDisplay;
        return `${displayed.join(", ")} + ${remaining} innych`;
    };

    const renderStep1 = () => (
        <div className="form-step">
            <h2>Podstawowe informacje</h2>

            <div className="form-group">
                <label htmlFor="title">
                    Tytuł głosowania <span className="required">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    className={errors.title ? "error" : ""}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Wprowadź tytuł głosowania"
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="description">Opis głosowania</label>
                <textarea
                    id="description"
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Wprowadź opis głosowania"
                />
            </div>

            <div className="form-group">
                <label htmlFor="category">
                    Kategoria <span className="required">*</span>
                </label>
                <select
                    id="category"
                    className={errors.category ? "error" : ""}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                    <option value="">Wybierz kategorię</option>
                    <option value="amendment">Poprawka</option>
                    <option value="committee">Komisja</option>
                    <option value="resolution">Uchwała</option>
                    <option value="law">Ustawa</option>
                    <option value="budget">Budżet</option>
                    <option value="other">Inne</option>
                </select>
                {errors.category && <span className="error-message">{errors.category}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="applicant">Wnioskodawca</label>
                <select
                    id="applicant"
                    value={formData.applicant}
                    onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
                >
                    <option value="">Wybierz wnioskodawcę</option>
                    <option value="marshal">Marszałek Parlamentu</option>
                    <option value="presidium">Prezydium Parlamentu</option>
                    {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="form-step">
            <h2>Odbiorcy głosowania</h2>

            <div className="form-group">
                <label>Kto może głosować?</label>
                <div className="recipients-options">
                    
                    <button
                        type="button"
                        className={`recipient-btn ${formData.recipientsType === "all" ? "active" : ""}`}
                        onClick={() => handleRecipientsChange("all")}
                    >
                        Wszyscy parlamentarzyści
                    </button>
                    <button
                        type="button"
                        className={`recipient-btn ${formData.recipientsType === "groups" ? "active" : ""}`}
                        onClick={() => handleRecipientsChange("groups")}
                    >
                        Wybrane grupy/komisje
                    </button>
                    <button
                        type="button"
                        className={`recipient-btn ${formData.recipientsType === "individual" || formData.recipientsType === "members" ? "active" : ""}`}
                        onClick={() => handleRecipientsChange("individual")}
                    >
                        Wybrane osoby
                    </button>
                </div>
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
                    <div className="checkbox-grid">
                        {getFilteredGroups().map((group) => (
                            <label key={group.id} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={formData.selectedGroups.includes(group.id)}
                                    onChange={() => handleGroupToggle(group.id)}
                                />
                                {group.name}
                            </label>
                        ))}
                    </div>
                    {errors.recipients && <span className="error-message">{errors.recipients}</span>}
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
                    <div className="checkbox-grid">
                        {getFilteredMembers().map((member) => (
                            <label key={member.id} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={formData.selectedMembers.includes(member.id)}
                                    onChange={() => handleMemberToggle(member.id)}
                                />
                                {member.name} {member.group && `(${member.group})`}
                            </label>
                        ))}
                    </div>
                    {errors.recipients && <span className="error-message">{errors.recipients}</span>}
                </div>
            )}

            {formData.recipientsType === "all" && (
                <div className="info-box">
                    <p>Wszyscy parlamentarzyści będą mogli wziąć udział w głosowaniu.</p>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="form-step">
            <h2>Czas i data</h2>

            <div className="form-group">
                <label htmlFor="startDateTime">
                    Data rozpoczęcia <span className="required">*</span>
                </label>
                <input
                    id="startDateTime"
                    type="datetime-local"
                    className={errors.startDateTime ? "error" : ""}
                    value={formData.startDateTime}
                    onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                />
                {errors.startDateTime && <span className="error-message">{errors.startDateTime}</span>}
            </div>

            <div className="form-group">
                <label>Tryb wyznaczania końca</label>
                <div className="duration-options">
                    <button
                        type="button"
                        className={`duration-btn ${formData.durationType === "datetime" ? "active" : ""}`}
                        onClick={() => setFormData({ ...formData, durationType: "datetime" })}
                    >
                        Konkretna data
                    </button>
                    <button
                        type="button"
                        className={`duration-btn ${formData.durationType === "duration" ? "active" : ""}`}
                        onClick={() => setFormData({ ...formData, durationType: "duration" })}
                    >
                        Czas trwania
                    </button>
                </div>
            </div>

            {formData.durationType === "datetime" && (
                <div className="form-group">
                    <label htmlFor="endDateTime">
                        Data zakończenia <span className="required">*</span>
                    </label>
                    <input
                        id="endDateTime"
                        type="datetime-local"
                        className={errors.endDateTime ? "error" : ""}
                        value={formData.endDateTime}
                        onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                    />
                    {errors.endDateTime && <span className="error-message">{errors.endDateTime}</span>}
                </div>
            )}

            {formData.durationType === "duration" && (
                <div className="form-group">
                    <label>Czas trwania</label>
                    <div className="duration-inputs">
                        <div>
                            <label>Dni</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.durationDays}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    durationDays: parseInt(e.target.value) || 0
                                })}
                            />
                        </div>
                        <div>
                            <label>Godziny</label>
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={formData.durationHours}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    durationHours: parseInt(e.target.value) || 0
                                })}
                            />
                        </div>
                        <div>
                            <label>Minuty</label>
                            <input
                                type="number"
                                min="0"
                                max="59"
                                step="5"
                                value={formData.durationMinutes}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    durationMinutes: parseInt(e.target.value) || 0
                                })}
                            />
                        </div>
                    </div>
                    {errors.duration && <span className="error-message">{errors.duration}</span>}
                    {formData.startDateTime && formData.durationType === "duration" && (
                        <div className="info-box">
                            <p>
                                <strong>Koniec głosowania:</strong>{" "}
                                {getEndDate()?.toLocaleString("pl-PL") || "Obliczanie..."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderStep4 = () => {
        console.log("🔍 renderStep4 - resolutions:", resolutions);
        console.log("🔍 renderStep4 - amendments:", amendments);
        console.log("🔍 renderStep4 - resolutionsArray:", Array.isArray(resolutions) ? resolutions : []);
        console.log("🔍 renderStep4 - amendmentsArray:", Array.isArray(amendments) ? amendments : []);


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
                                            console.log("📌 Uchwała:", res);

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
                    
                    {isAdmin && (
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
                    )}

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