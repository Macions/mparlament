// mockData.js
export const clubs = [
    {
        id: 1,
        name: "Klub Parlamentarny Czas Młodych",
        type: "klub",
        color: "#141644",
        members: [
            { id: 1, firstName: "Jan", lastName: "Kowalski", functions: ["Marszałek"], commissions: ["Komisja Etyki"] },
            { id: 2, firstName: "Anna", lastName: "Nowak", functions: [], commissions: ["Komisja Stała"] },
            { id: 3, firstName: "Piotr", lastName: "Wiśniewski", functions: ["Wicemarszałek"], commissions: [] },
        ],
    },
    {
        id: 2,
        name: "Klub Obywatelski",
        type: "klub",
        color: "#2563eb",
        members: [
            { id: 4, firstName: "Maria", lastName: "Lewandowska", functions: [], commissions: ["Komisja Finansów"] },
            { id: 5, firstName: "Tomasz", lastName: "Zieliński", functions: ["Przewodniczący Komisji"], commissions: ["Komisja Finansów", "Komisja Etyki"] },
        ],
    },
    {
        id: 3,
        name: "Koło Niezależnych",
        type: "koło",
        color: "#8b5cf6",
        members: [
            { id: 6, firstName: "Ewa", lastName: "Krawczyk", functions: [], commissions: [] },
            { id: 7, firstName: "Marek", lastName: "Nowicki", functions: [], commissions: ["Komisja Stała"] },
        ],
    },
    {
        id: 4,
        name: "Klub Lewicy",
        type: "klub",
        color: "#dc2626",
        members: [
            { id: 8, firstName: "Katarzyna", lastName: "Wójcik", functions: [], commissions: ["Komisja Etyki"] },
        ],
    },
];

// Zbieramy wszystkich parlamentarzystów z klubów
export const parliamentarians = clubs.flatMap((club) =>
    club.members.map((member) => ({
        ...member,
        clubId: club.id,
        clubName: club.name,
        clubType: club.type,
        clubColor: club.color,
    }))
);

// Dodajemy niezrzeszonych (bez klubu)
export const unaffiliated = [
    { id: 9, firstName: "Adam", lastName: "Malinowski", functions: [], commissions: [], clubId: null },
    { id: 10, firstName: "Beata", lastName: "Szymańska", functions: [], commissions: ["Komisja Finansów"], clubId: null },
];

export const allParliamentarians = [...parliamentarians, ...unaffiliated];

// Funkcje pomocnicze
export const getClubById = (id) => clubs.find((c) => c.id === id);
export const getParliamentariansByClub = (clubId) => {
    if (clubId === null) return unaffiliated;
    const club = getClubById(clubId);
    return club ? club.members : [];
};