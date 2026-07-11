import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateVoting.css";

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

    // Stan dla danych z backendu
    const [groups, setGroups] = useState([]);
    const [members, setMembers] = useState([]);
    const [resolutions, setResolutions] = useState([]);
    const [amendments, setAmendments] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState("");

    const [errors, setErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [searchQueryMembers, setSearchQueryMembers] = useState("");

    const token = localStorage.getItem("token");
    const handleManagerToggle = (memberId) => {
        setFormData((prev) => ({
            ...prev,
            managers: prev.managers.includes(memberId)
                ? prev.managers.filter((id) => id !== memberId)
                : [...prev.managers, memberId],
        }));
    };
    // Pobieranie danych głosowania i danych z backendu
    useEffect(() => {
        async function fetchData() {
            try {
                setLoadingData(true);

                // Pobierz dane głosowania
                const votingRes = await fetch(`/api/votings/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!votingRes.ok) {
                    throw new Error("Nie udało się pobrać danych głosowania");
                }

                const votingData = await votingRes.json();

                // Wypełnij formularz danymi
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
                console.log("📊 Otrzymane dane głosowania:", votingData);
                console.log("📊 recipientsType:", votingData.recipientsType);
                console.log("📊 selectedGroups:", votingData.selectedGroups);
                console.log("📊 selectedMembers:", votingData.selectedMembers);
                console.log("📊 managers:", votingData.managers);
                // Pobierz grupy/komisje
                const groupsRes = await fetch("/api/groups", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (groupsRes.ok) {
                    const groupsData = await groupsRes.json();
                    setGroups(groupsData);
                }

                // Pobierz członków
                const membersRes = await fetch("/api/users", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    setMembers(membersData);
                }

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
        if (!searchQueryManagers.trim()) return members;
        return members.filter(
            (member) =>
                member.name.toLowerCase().includes(searchQueryManagers.toLowerCase()) ||
                member.group?.toLowerCase().includes(searchQueryManagers.toLowerCase())
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

            // Jeśli są nowe załączniki, wyślij je
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
    // Funkcje pomocnicze dla podsumowania
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
        if (!applicant) return "Nie wybrano"; // ✅ ZMIEŃ TĘ LINIĘ

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
    // Funkcja formatująca listę odbiorców
    const formatRecipientsList = (items, maxDisplay = 5) => {
        if (!items || items.length === 0) return "Brak";
        if (items.length <= maxDisplay) {
            return items.join(", ");
        }
        const displayed = items.slice(0, maxDisplay);
        const remaining = items.length - maxDisplay;
        return `${displayed.join(", ")} + ${remaining} innych`;
    };
    // Funkcje renderujące kroki
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
                    {/* Przyciski wyboru - dodaj obsługę "members" */}
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

    const renderStep4 = () => (
        <div className="form-step">
            <h2>Ustawienia zaawansowane</h2>
            {/* NOWE POLE - Zarządzający */}
            <div className="form-group">
                <label>Kto może zarządzać głosowaniem?</label>
                <p className="field-hint">
                    Wybrane osoby będą mogły: edytować głosowanie, aktywować je lub opóźnić jego start,
                    sprawdzić wyniki na żywo.
                </p>
                <div className="info-box admin-info">
                    <p>
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
                />
                <div className="checkbox-grid">
                    {getFilteredManagers()
                        .filter(member => member.role !== "admin") // Pomiń adminów
                        .map((member) => (
                            <label key={member.id} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={formData.managers.includes(member.id)}
                                    onChange={() => handleManagerToggle(member.id)}
                                />
                                {member.name} {member.group && `(${member.group})`}
                                {member.role === "admin" && "    "}
                            </label>
                        ))}
                </div>
                {formData.managers.length > 0 && (
                    <div className="selected-info">
                        <p>Wybrano {formData.managers.length} osób do zarządzania:</p>
                        <div className="selected-tags">
                            {formData.managers.map(id => {
                                const member = members.find(m => m.id === id);
                                return member ? (
                                    <span key={id} className="manager-tag">
                                        {member.name}
                                        <button
                                            type="button"
                                            onClick={() => handleManagerToggle(id)}
                                            className="tag-remove"
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
                <div className="file-upload-area">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                    />
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Wybierz pliki
                    </button>
                    <p className="file-upload-hint">
                        Dozwolone formaty: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT (max 10MB)
                    </p>
                </div>

                {formData.attachments.length > 0 && (
                    <div className="attachments-list">
                        {formData.attachments.map((attachment) => (
                            <div key={attachment.id} className="attachment-item">
                                <span className="attachment-name">
                                    {attachment.name}
                                    <span className="attachment-size">
                                        ({formatFileSize(attachment.size)})
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(attachment.id)}
                                    className="attachment-remove"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="form-group">
                <label>Powiązany dokument</label>
                <select
                    value={formData.linkedItemType}
                    onChange={(e) => setFormData({
                        ...formData,
                        linkedItemType: e.target.value,
                        linkedItemId: ""
                    })}
                >
                    <option value="none">Brak powiązania</option>
                    <option value="resolution">Uchwała</option>
                    <option value="amendment">Poprawka</option>
                </select>
            </div>

            {formData.linkedItemType === "resolution" && (
                <div className="form-group">
                    <label>Wybierz uchwałę</label>
                    <select
                        value={formData.linkedItemId}
                        onChange={(e) => setFormData({ ...formData, linkedItemId: e.target.value })}
                    >
                        <option value="">Wybierz uchwałę</option>
                        {resolutions.map((resolution) => (
                            <option key={resolution.id} value={resolution.id}>
                                {resolution.title}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {formData.linkedItemType === "amendment" && (
                <div className="form-group">
                    <label>Wybierz poprawkę</label>
                    <select
                        value={formData.linkedItemId}
                        onChange={(e) => setFormData({ ...formData, linkedItemId: e.target.value })}
                    >
                        <option value="">Wybierz poprawkę</option>
                        {amendments.map((amendment) => (
                            <option key={amendment.id} value={amendment.id}>
                                {amendment.title || `Poprawka ${amendment.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );

    const renderStep5 = () => (
        <div className="form-step summary-step">
            <h2>Podsumowanie</h2>

            <div className="summary-section">
                <div className="summary-item">
                    <span className="summary-label">Tytuł</span>
                    <span className="summary-value">{formData.title || "Brak"}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Kategoria</span>
                    <span className="summary-value">{getCategoryLabel(formData.category)}</span>
                </div>
                {formData.applicant && (
                    <div className="summary-item">
                        <span className="summary-label">Wnioskodawca</span>
                        <span className="summary-value">{getApplicantLabel(formData.applicant)}</span>
                    </div>
                )}
                <div className="summary-item">
                    <span className="summary-label">Opis</span>
                    <span className="summary-value">{formData.description || "Brak"}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Odbiorcy</span>
                    <span className="summary-value">{getRecipientsLabel()}</span>
                </div>
                {formData.recipientsType === "groups" && formData.selectedGroups.length > 0 && (
                    <div className="summary-item">
                        <span className="summary-label">Wybrane grupy</span>
                        <span className="summary-value">
                            {formatRecipientsList(getSelectedGroupsNames())}
                        </span>
                    </div>
                )}
                {formData.recipientsType === "individual" && formData.selectedMembers.length > 0 && (
                    <div className="summary-item">
                        <span className="summary-label">Wybrane osoby</span>
                        <span className="summary-value">
                            {formatRecipientsList(getSelectedMembersNames())}
                        </span>
                    </div>
                )}
                <div className="summary-item">
                    <span className="summary-label">Start głosowania</span>
                    <span className="summary-value">
                        {formData.startDateTime ? new Date(formData.startDateTime).toLocaleString("pl-PL") : "Nie określono"}
                    </span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Koniec głosowania</span>
                    <span className="summary-value">
                        {formData.durationType === "datetime" && formData.endDateTime
                            ? new Date(formData.endDateTime).toLocaleString("pl-PL")
                            : formData.durationType === "duration" && getEndDate()
                                ? getEndDate().toLocaleString("pl-PL")
                                : "Nie określono"}
                    </span>
                </div>
                {formData.managers.length > 0 && (
                    <div className="summary-item">
                        <span className="summary-label">Zarządzający</span>
                        <span className="summary-value">
                            {formData.managers.map(id => {
                                const member = members.find(m => m.id === id);
                                return member ? member.name : null;
                            }).filter(Boolean).join(", ")}
                        </span>
                    </div>
                )}
                {formData.linkedItemType !== "none" && (
                    <div className="summary-item">
                        <span className="summary-label">Powiązany dokument</span>
                        <span className="summary-value">{getLinkedItemLabel()}</span>
                    </div>
                )}
                {formData.attachments.length > 0 && (
                    <div className="summary-item">
                        <span className="summary-label">Załączniki</span>
                        <span className="summary-value">{formData.attachments.length} plików</span>
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