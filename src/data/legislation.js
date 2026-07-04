// =============================================
// DANE LEGISLACYJNE - CENTRALNE ŹRÓDŁO
// =============================================

export const bills = [
    {
        id: 1,
        title: "Ustawa o edukacji",
        shortName: "Ustawa edukacyjna",
        articles: [
            { id: 1, content: "Art. 1: Szkoła jest obowiązkowa." },
            { id: 2, content: "Art. 2: Nauka trwa 12 lat." },
            { id: 3, content: "Art. 3: Oceny są jawne dla uczniów i rodziców." },
            { id: 4, content: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny." },
        ],
    },
    {
        id: 2,
        title: "Ustawa o rolnictwie i rozwoju wsi",
        shortName: "Ustawa rolna",
        articles: [
            { id: 1, content: "Art. 1: Państwo wspiera rolnictwo." },
            { id: 2, content: "Art. 2: Dopłaty bezpośrednie dla rolników." },
            { id: 4, content: "Art. 4: Rolnictwo jest strategiczne." },
            { id: 5, content: "Art. 5: Ochrona gruntów rolnych." },
        ],
    },
    {
        id: 3,
        title: "Ustawa o ochronie zdrowia",
        shortName: "Ustawa zdrowotna",
        articles: [
            { id: 1, content: "Art. 1: Każdy ma prawo do opieki zdrowotnej." },
            { id: 2, content: "Art. 2: Czas oczekiwania na świadczenia." },
            { id: 5, content: "Art. 5: Szpitale są finansowane z budżetu państwa." },
            { id: 7, content: "Art. 7: Pacjent ma prawo do informacji." },
        ],
    },
    {
        id: 4,
        title: "Ustawa o wydobyciu surowców energetycznych",
        shortName: "Ustawa górnicza",
        articles: [
            { id: 1, content: "Art. 1: Wydobycie złota i innych surowców jest regulowane." },
            { id: 2, content: "Art. 2: Koncesje wydawane są na 25 lat." },
            { id: 3, content: "Art. 3: Ochrona środowiska przy wydobyciu." },
        ],
    },
];

export const amendments = [
    // === Poprawki do Ustawy o edukacji (id 1) ===
    {
        id: 101,
        billId: 1,
        title: "Zmiana art. 1 – darmowa szkoła",
        status: "pending",
        author: "Klub Edukacja",
        target: { article: 1 },
        from: "Art. 1: Szkoła jest obowiązkowa.",
        to: "Art. 1: Szkoła jest obowiązkowa i w pełni darmowa.",
    },
    {
        id: 102,
        billId: 1,
        title: "Dodanie art. 2a – edukacja zdalna",
        status: "accepted",
        author: "Klub ABC",
        target: { article: 2 },
        from: "",
        to: "Art. 2a: W sytuacjach nadzwyczajnych dopuszcza się nauczanie zdalne.",
    },

    // === Poprawki do Ustawy o rolnictwie (id 2) ===
    {
        id: 201,
        billId: 2,
        title: "Zmiana art. 4 – bezpieczeństwo żywnościowe",
        status: "pending",
        author: "Klub Rolników",
        target: { article: 4 },
        from: "Art. 4: Rolnictwo jest strategiczne.",
        to: "Art. 4: Rolnictwo jest kluczowe dla bezpieczeństwa żywnościowego państwa.",
    },
    {
        id: 202,
        billId: 2,
        title: "Usunięcie art. 1",
        status: "rejected",
        author: "Klub Opozycji",
        target: { article: 1 },
        from: "Art. 1: Państwo wspiera rolnictwo.",
        to: "",
    },

    // === Poprawki do Ustawy o ochronie zdrowia (id 3) ===
    {
        id: 301,
        billId: 3,
        title: "Rozszerzenie praw pacjenta",
        status: "pending",
        author: "Klub Zdrowie",
        target: { article: 7 },
        from: "Art. 7: Pacjent ma prawo do informacji.",
        to: "Art. 7: Pacjent ma prawo do pełnej, zrozumiałej i aktualnej informacji o swoim stanie zdrowia.",
    },

    // === Poprawki do Ustawy górniczej (id 4) ===
    {
        id: 401,
        billId: 4,
        title: "Ograniczenie wydobycia w parkach narodowych",
        status: "pending",
        author: "Klub Ekologia",
        target: { article: 3 },
        from: "Art. 3: Ochrona środowiska przy wydobyciu.",
        to: "Art. 3: Zakazuje się wydobycia surowców w granicach parków narodowych i rezerwatów przyrody.",
    },
];

export const resolutions = [
    {
        id: 1,
        title: "Uchwała dotycząca dsadsadda złota",
        date: "20.05.2026",
        fileName: "uchwała wydobycie złota.docx",
        author: "Piotr Nowak",
        party: "UNIA LIBERALNA",
        meeting: "Posiedzenie: Warszawa 20.05",
        signatures: 6,
        content: "Pełna treść uchwały o wydobyciu złota...",
        submittedBy: "Piotr Nowak",
    },
    {
        id: 2,
        title: "Uchwała w sprawie kalafiorów",
        date: "20.05.2026",
        fileName: "uchwała kalafiory.docx",
        author: "Anna Kowalska",
        party: "UNIA LIBERALNA",
        meeting: "Posiedzenie: Warszawa 20.05",
        signatures: 3,
        content: "Kalafiory są bardzo ważnym elementem gospodarki...",
        submittedBy: "Anna Kowalska",
    },
    {
        id: 3,
        title: "Uchwała w sprawie wsparcia rolnictwa ekologicznego",
        date: "20.05.2026",
        fileName: "uchwała rolnictwo.docx",
        author: "Jan Wiśniewski",
        party: "UNIA LIBERALNA",
        meeting: "Posiedzenie: Warszawa 20.05",
        signatures: 8,
        content: "Rolnictwo to fundament państwa...",
        submittedBy: "Jan Wiśniewski",
    },
    {
        id: 4,
        title: "Uchwała w sprawie reformy ochrony zdrowia",
        date: "20.05.2026",
        fileName: "uchwała rolnictwo 2.docx",
        author: "Jan Wiśniewski",
        party: "UNIA LIBERALNA",
        meeting: "Posiedzenie: Warszawa 20.05",
        signatures: 2,
        content: "Druga uchwała o rolnictwie...",
        submittedBy: "Jan Wiśniewski",
    },
];