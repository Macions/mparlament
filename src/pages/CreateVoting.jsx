import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateVoting.css";

// Mock danych - w produkcji z API
const mockGroups = [
    { id: "all", name: "Wszyscy parlamentarzyści", type: "group" },
    { id: "committee-1", name: "Komisja Finansów Publicznych", type: "group" },
    { id: "committee-2", name: "Komisja Oświaty i Nauki", type: "group" },
    { id: "committee-3", name: "Komisja Ochrony Środowiska", type: "group" },
    { id: "committee-4", name: "Komisja Zdrowia", type: "group" },
    { id: "committee-5", name: "Komisja Spraw Zagranicznych", type: "group" },
    { id: "committee-6", name: "Komisja Infrastruktury", type: "group" },
];

const mockMembers = [
    { id: "m1", name: "Anna Kowalska", group: "Komisja Finansów Publicznych", avatar: null },
    { id: "m2", name: "Piotr Nowak", group: "Komisja Finansów Publicznych", avatar: null },
    { id: "m3", name: "Maria Wiśniewska", group: "Komisja Oświaty i Nauki", avatar: null },
    { id: "m4", name: "Jan Zieliński", group: "Komisja Oświaty i Nauki", avatar: null },
    { id: "m5", name: "Katarzyna Lewandowska", group: "Komisja Ochrony Środowiska", avatar: null },
    { id: "m6", name: "Tomasz Kamiński", group: "Komisja Ochrony Środowiska", avatar: null },
    { id: "m7", name: "Agnieszka Dąbrowska", group: "Komisja Zdrowia", avatar: null },
    { id: "m8", name: "Michał Kozłowski", group: "Komisja Zdrowia", avatar: null },
    { id: "m9", name: "Ewa Jankowska", group: "Komisja Spraw Zagranicznych", avatar: null },
    { id: "m10", name: "Adam Wojciechowski", group: "Komisja Spraw Zagranicznych", avatar: null },
    { id: "m11", name: "Magdalena Kwiatkowska", group: "Komisja Infrastruktury", avatar: null },
    { id: "m12", name: "Rafał Szymański", group: "Komisja Infrastruktury", avatar: null },
];

const mockResolutions = [
    { id: "res-1", title: "Uchwała nr 1/2026 w sprawie zwiększenia finansowania oświaty", type: "resolution" },
    { id: "res-2", title: "Uchwała nr 2/2026 w sprawie ochrony środowiska", type: "resolution" },
    { id: "res-3", title: "Uchwała nr 3/2026 w sprawie budowy drogi S-19", type: "resolution" },
];

const mockAmendments = [
    { id: "am-1", title: "Poprawka nr 1 do uchwały o oświacie - zwiększenie budżetu o 15%", type: "amendment" },
    { id: "am-2", title: "Poprawka nr 2 do uchwały środowiskowej - nowe normy emisji", type: "amendment" },
    { id: "am-3", title: "Poprawka nr 3 do ustawy infrastrukturalnej - zmiana przebiegu", type: "amendment" },
];

export default function CreateVoting() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(1);
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
        linkedItemType: "",
        linkedItemId: "",
        attachments: [],
        applicant: "",
    });

    const [errors, setErrors] = useState({});
    const [tagInput, setTagInput] = useState("");

    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.title.trim()) newErrors.title = "Tytuł jest wymagany";
            if (!formData.category) newErrors.category = "Wybierz kategorię";
        }

        if (step === 2) {
            if (formData.recipientsType === "groups" && formData.selectedGroups.length === 0) {
                newErrors.recipients = "Wybierz co najmniej jedną grupę";
            }
            if (formData.recipientsType === "individual" && formData.selectedMembers.length === 0) {
                newErrors.recipients = "Wybierz co najmniej jedną osobę";
            }
        }

        if (step === 3) {
            if (!formData.startDateTime) newErrors.startDateTime = "Data rozpoczęcia jest wymagana";
            if (formData.durationType === "datetime" && !formData.endDateTime) {
                newErrors.endDateTime = "Data zakończenia jest wymagana";
            }
            if (formData.durationType === "duration" &&
                formData.durationDays === 0 &&
                formData.durationHours === 0 &&
                formData.durationMinutes === 0) {
                newErrors.duration = "Określ czas trwania głosowania";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleRecipientsChange = (type) => {
        setFormData(prev => ({
            ...prev,
            recipientsType: type,
            selectedGroups: [],
            selectedMembers: [],
        }));
        setErrors({});
    };

    const handleGroupToggle = (groupId) => {
        setFormData(prev => {
            if (groupId === "all") {
                return {
                    ...prev,
                    selectedGroups: prev.selectedGroups.includes("all")
                        ? []
                        : ["all"],
                };
            }
            const newGroups = prev.selectedGroups.includes(groupId)
                ? prev.selectedGroups.filter(id => id !== groupId && id !== "all")
                : [...prev.selectedGroups.filter(id => id !== "all"), groupId];
            return { ...prev, selectedGroups: newGroups };
        });
        setErrors({});
    };

    const handleMemberToggle = (memberId) => {
        setFormData(prev => ({
            ...prev,
            selectedMembers: prev.selectedMembers.includes(memberId)
                ? prev.selectedMembers.filter(id => id !== memberId)
                : [...prev.selectedMembers, memberId],
        }));
        setErrors({});
    };

    const handleAddTag = (e) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tagInput.trim()],
                }));
            }
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploadDate: new Date().toISOString(),
        }));

        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...newAttachments],
        }));
    };

    const handleRemoveAttachment = (attachmentId) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter(a => a.id !== attachmentId),
        }));
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleSubmit = () => {
        if (validateStep(currentStep)) {
            const votingData = {
                ...formData,
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

            console.log("Form submitted:", votingData);
            navigate("/glosowania");
        }
    };

    const renderStepIndicator = () => (
        <div className="step-indicator">
            {[
                { num: 1, label: "Podstawowe informacje" },
                { num: 2, label: "Odbiorcy głosowania" },
                { num: 3, label: "Czas i data" },
                { num: 4, label: "Ustawienia zaawansowane" },
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

    const renderStep1 = () => (
        <div className="form-step">
            <h2>Podstawowe informacje</h2>

            <div className="form-group">
                <label htmlFor="title">
                    Tytuł głosowania <span className="required">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="np. Uchwała w sprawie zwiększenia finansowania oświaty"
                    className={errors.title ? "error" : ""}
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="category">
                    Kategoria <span className="required">*</span>
                </label>
                <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={errors.category ? "error" : ""}
                >
                    <option value="">Wybierz kategorię...</option>
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
                <label htmlFor="description">Opis głosowania</label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Szczegółowy opis przedmiotu głosowania, kontekst, uzasadnienie..."
                    rows={6}
                />
                <span className="char-count">{formData.description.length}/2000 znaków</span>
            </div>

            <div className="form-group">
                <label>Tagi</label>
                <div className="tags-input-container">
                    <div className="tags-list">
                        {formData.tags.map((tag, index) => (
                            <span key={index} className="tag">
                                {tag}
                                <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Dodaj tag i naciśnij Enter..."
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="form-step">
            <h2>Odbiorcy głosowania</h2>

            <div className="recipients-type-selector">
                <button
                    className={`type-btn ${formData.recipientsType === "all" ? "active" : ""}`}
                    onClick={() => handleRecipientsChange("all")}
                >
                    <div className="type-icon">👥</div>
                    <div className="type-label">Wszyscy parlamentarzyści</div>
                    <div className="type-desc">Głosowanie dostępne dla wszystkich 100 posłów</div>
                </button>

                <button
                    className={`type-btn ${formData.recipientsType === "groups" ? "active" : ""}`}
                    onClick={() => handleRecipientsChange("groups")}
                >
                    <div className="type-icon">📋</div>
                    <div className="type-label">Wybrane grupy/komisje</div>
                    <div className="type-desc">Wybierz konkretne komisje lub grupy parlamentarne</div>
                </button>

                <button
                    className={`type-btn ${formData.recipientsType === "individual" ? "active" : ""}`}
                    onClick={() => handleRecipientsChange("individual")}
                >
                    <div className="type-icon">👤</div>
                    <div className="type-label">Wybrane osoby</div>
                    <div className="type-desc">Ręcznie wybierz poszczególnych parlamentarzystów</div>
                </button>
            </div>

            {formData.recipientsType === "groups" && (
                <div className="recipients-selection">
                    <div className="selection-header">
                        <h3>Wybierz grupy</h3>
                        <span className="selected-count">
                            Wybrano: {formData.selectedGroups.length} grup
                        </span>
                    </div>
                    <div className="checkbox-grid">
                        {mockGroups.map(group => (
                            <label key={group.id} className="checkbox-card">
                                <input
                                    type="checkbox"
                                    checked={formData.selectedGroups.includes(group.id)}
                                    onChange={() => handleGroupToggle(group.id)}
                                />
                                <div className="checkbox-content">
                                    <div className="checkbox-title">{group.name}</div>
                                    {group.id === "all" && (
                                        <div className="checkbox-subtitle">Wszyscy 100 parlamentarzyści</div>
                                    )}
                                    {group.id !== "all" && (
                                        <div className="checkbox-subtitle">
                                            {mockMembers.filter(m => m.group === group.name).length} członków
                                        </div>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {formData.recipientsType === "individual" && (
                <div className="recipients-selection">
                    <div className="selection-header">
                        <h3>Wybierz osoby</h3>
                        <div className="selection-actions">
                            <span className="selected-count">
                                Wybrano: {formData.selectedMembers.length} osób
                            </span>
                            <button
                                type="button"
                                className="btn-select-all"
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    selectedMembers: prev.selectedMembers.length === mockMembers.length
                                        ? []
                                        : mockMembers.map(m => m.id)
                                }))}
                            >
                                {formData.selectedMembers.length === mockMembers.length
                                    ? "Odznacz wszystkich"
                                    : "Zaznacz wszystkich"}
                            </button>
                        </div>
                    </div>
                    <div className="checkbox-grid members-grid">
                        {mockMembers.map(member => (
                            <label key={member.id} className="checkbox-card member-card">
                                <input
                                    type="checkbox"
                                    checked={formData.selectedMembers.includes(member.id)}
                                    onChange={() => handleMemberToggle(member.id)}
                                />
                                <div className="checkbox-content">
                                    <div className="member-avatar">
                                        {member.avatar
                                            ? <img src={member.avatar} alt={member.name} />
                                            : member.name.charAt(0)
                                        }
                                    </div>
                                    <div>
                                        <div className="checkbox-title">{member.name}</div>
                                        <div className="checkbox-subtitle">{member.group}</div>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {errors.recipients && <span className="error-message">{errors.recipients}</span>}
        </div>
    );

    const renderStep3 = () => (
        <div className="form-step">
            <h2>Czas i data głosowania</h2>

            <div className="form-group">
                <label htmlFor="startDateTime">
                    Data i godzina rozpoczęcia <span className="required">*</span>
                </label>
                <input
                    type="datetime-local"
                    id="startDateTime"
                    value={formData.startDateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                    className={errors.startDateTime ? "error" : ""}
                />
                {errors.startDateTime && <span className="error-message">{errors.startDateTime}</span>}
            </div>

            <div className="duration-type-selector">
                <label>Określenie czasu trwania</label>
                <div className="radio-group">
                    <label className="radio-card">
                        <input
                            type="radio"
                            name="durationType"
                            value="datetime"
                            checked={formData.durationType === "datetime"}
                            onChange={() => setFormData(prev => ({ ...prev, durationType: "datetime" }))}
                        />
                        <div className="radio-content">
                            <strong>Konkretna data zakończenia</strong>
                            <span>Ustaw dokładną datę i godzinę końca głosowania</span>
                        </div>
                    </label>
                    <label className="radio-card">
                        <input
                            type="radio"
                            name="durationType"
                            value="duration"
                            checked={formData.durationType === "duration"}
                            onChange={() => setFormData(prev => ({ ...prev, durationType: "duration" }))}
                        />
                        <div className="radio-content">
                            <strong>Czas trwania</strong>
                            <span>Określ jak długo ma trwać głosowanie</span>
                        </div>
                    </label>
                </div>
            </div>

            {formData.durationType === "datetime" && (
                <div className="form-group">
                    <label htmlFor="endDateTime">
                        Data i godzina zakończenia <span className="required">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        id="endDateTime"
                        value={formData.endDateTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                        className={errors.endDateTime ? "error" : ""}
                    />
                    {errors.endDateTime && <span className="error-message">{errors.endDateTime}</span>}
                </div>
            )}

            {formData.durationType === "duration" && (
                <div className="duration-inputs">
                    <div className="form-group">
                        <label>Dni</label>
                        <input
                            type="number"
                            min="0"
                            max="30"
                            value={formData.durationDays}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Godziny</label>
                        <input
                            type="number"
                            min="0"
                            max="23"
                            value={formData.durationHours}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationHours: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Minuty</label>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={formData.durationMinutes}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                    {errors.duration && <span className="error-message">{errors.duration}</span>}
                </div>
            )}

            {formData.startDateTime && (formData.durationType === "datetime" ? formData.endDateTime : true) && (
                <div className="time-preview">
                    <h4>Podsumowanie czasu głosowania</h4>
                    <div className="preview-content">
                        <div className="preview-item">
                            <span>Rozpoczęcie:</span>
                            <strong>
                                {formData.startDateTime
                                    ? new Date(formData.startDateTime).toLocaleString("pl-PL", {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : "Nie wybrano"}
                            </strong>
                        </div>
                        <div className="preview-item">
                            <span>Zakończenie:</span>
                            <strong>
                                {formData.durationType === "datetime" && formData.endDateTime
                                    ? new Date(formData.endDateTime).toLocaleString("pl-PL", {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : formData.durationType === "duration"
                                        ? `${formData.durationDays}d ${formData.durationHours}h ${formData.durationMinutes}m`
                                        : "Nie określono"
                                }
                            </strong>
                        </div>
                    </div>
                </div>
            )}

            <div className="statutory-rules">
                <h4>Zasady głosowania (wg statutu)</h4>
                <div className="rules-grid">
                    <div className="rule-item">
                        <span className="rule-icon">👥</span>
                        <div className="rule-text">
                            <strong>Kworum: 50 parlamentarzystów</strong>
                            <span>Połowa składu (100 osób)</span>
                        </div>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">✅</span>
                        <div className="rule-text">
                            <strong>Zwykła większość</strong>
                            <span>Więcej głosów ZA niż PRZECIW</span>
                        </div>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">🤚</span>
                        <div className="rule-text">
                            <strong>Możliwość wstrzymania się</strong>
                            <span>Każdy parlamentarzysta może się wstrzymać</span>
                        </div>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">🔒</span>
                        <div className="rule-text">
                            <strong>Brak zmiany głosu</strong>
                            <span>Po oddaniu głosu nie można go zmienić</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="form-step">
            <h2>Ustawienia zaawansowane</h2>
            <p className="step-description">Opcjonalne – możesz pominąć i przejść do tworzenia głosowania</p>

            <div className="form-group">
                <label>Powiąż z istniejącą uchwałą lub poprawką</label>
                <div className="linked-item-selector">
                    <div className="radio-group horizontal">
                        <label className="radio-card small">
                            <input
                                type="radio"
                                name="linkedItemType"
                                value="none"
                                checked={formData.linkedItemType === "none"}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    linkedItemType: "none",
                                    linkedItemId: "",
                                }))}
                            />
                            <div className="radio-content">
                                <strong>Brak powiązania</strong>
                            </div>
                        </label>
                        <label className="radio-card small">
                            <input
                                type="radio"
                                name="linkedItemType"
                                value="resolution"
                                checked={formData.linkedItemType === "resolution"}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    linkedItemType: "resolution",
                                    linkedItemId: "",
                                }))}
                            />
                            <div className="radio-content">
                                <strong>Uchwała</strong>
                            </div>
                        </label>
                        <label className="radio-card small">
                            <input
                                type="radio"
                                name="linkedItemType"
                                value="amendment"
                                checked={formData.linkedItemType === "amendment"}
                                onChange={() => setFormData(prev => ({
                                    ...prev,
                                    linkedItemType: "amendment",
                                    linkedItemId: "",
                                }))}
                            />
                            <div className="radio-content">
                                <strong>Poprawka</strong>
                            </div>
                        </label>
                    </div>

                    {formData.linkedItemType === "resolution" && (
                        <select
                            value={formData.linkedItemId}
                            onChange={(e) => setFormData(prev => ({ ...prev, linkedItemId: e.target.value }))}
                            className="linked-select"
                        >
                            <option value="">Wybierz uchwałę...</option>
                            {mockResolutions.map(res => (
                                <option key={res.id} value={res.id}>{res.title}</option>
                            ))}
                        </select>
                    )}

                    {formData.linkedItemType === "amendment" && (
                        <select
                            value={formData.linkedItemId}
                            onChange={(e) => setFormData(prev => ({ ...prev, linkedItemId: e.target.value }))}
                            className="linked-select"
                        >
                            <option value="">Wybierz poprawkę...</option>
                            {mockAmendments.map(am => (
                                <option key={am.id} value={am.id}>{am.title}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="applicant">Wnioskodawca</label>
                <select
                    id="applicant"
                    value={formData.applicant}
                    onChange={(e) => setFormData(prev => ({ ...prev, applicant: e.target.value }))}
                >
                    <option value="">Wybierz wnioskodawcę (opcjonalnie)...</option>
                    <option value="marshal">Marszałek Parlamentu</option>
                    <option value="presidium">Prezydium Parlamentu</option>
                    <option value="committee-1">Komisja Finansów Publicznych</option>
                    <option value="committee-2">Komisja Oświaty i Nauki</option>
                    <option value="committee-3">Komisja Ochrony Środowiska</option>
                    <option value="committee-4">Komisja Zdrowia</option>
                    <option value="committee-5">Komisja Spraw Zagranicznych</option>
                    <option value="committee-6">Komisja Infrastruktury</option>
                    <option value="group-15">Grupa 15 posłów</option>
                    <option value="individual">Pojedynczy poseł</option>
                </select>
            </div>

            <div className="form-group">
                <label>Załączniki</label>
                <div className="attachments-area">
                    <div className="attachments-list">
                        {formData.attachments.length === 0 ? (
                            <div className="no-attachments">
                                <p>Brak załączników</p>
                                <span>Dodaj pliki PDF, DOC, JPG lub PNG (max 10MB każdy)</span>
                            </div>
                        ) : (
                            formData.attachments.map(attachment => (
                                <div key={attachment.id} className="attachment-item">
                                    <div className="attachment-icon">
                                        {attachment.type.includes("pdf") ? "📄" :
                                            attachment.type.includes("word") || attachment.type.includes("doc") ? "📝" :
                                                attachment.type.includes("image") ? "🖼️" : "📎"}
                                    </div>
                                    <div className="attachment-info">
                                        <div className="attachment-name">{attachment.name}</div>
                                        <div className="attachment-meta">
                                            {formatFileSize(attachment.size)} •
                                            {new Date(attachment.uploadDate).toLocaleDateString("pl-PL")}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="attachment-remove"
                                        onClick={() => handleRemoveAttachment(attachment.id)}
                                        title="Usuń załącznik"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn-add-attachment"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="btn-icon">+</span>
                        Dodaj załącznik
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                    />
                    <div className="attachment-hints">
                        <span>Dozwolone formaty: PDF, DOC, DOCX, JPG, PNG</span>
                        <span>Maksymalny rozmiar pliku: 10 MB</span>
                    </div>
                </div>
            </div>
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

            {renderStepIndicator()}

            <div className="form-container">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>

            <div className="form-actions">
                {currentStep > 1 && (
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handlePrevStep}
                    >
                        ← Wstecz
                    </button>
                )}
                {currentStep < 4 ? (
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleNextStep}
                    >
                        Dalej →
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-primary btn-submit"
                        onClick={handleSubmit}
                    >
                        Utwórz głosowanie
                    </button>
                )}
            </div>
        </div>
    );
}