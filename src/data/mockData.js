


export const clubs = [

	{
		id: 1,
		name: "Klub Czas Młodych",
		type: "klub",
		color: "#141644",
		members: [
			{
				id: 1,
				firstName: "Jan",
				lastName: "Kowalski",
				functions: ["Marszałek"],
				commissions: ["Komisja Etyki"],
			},
			{
				id: 2,
				firstName: "Anna",
				lastName: "Nowak",
				functions: [],
				commissions: ["Komisja Stała"],
			},
			{
				id: 3,
				firstName: "Piotr",
				lastName: "Wiśniewski",
				functions: ["Wicemarszałek"],
				commissions: [],
			},
		],
	},
	{
		id: 2,
		name: "Klub Solidarni",
		type: "klub",
		color: "#2563eb",
		members: [
			{
				id: 4,
				firstName: "Maria",
				lastName: "Lewandowska",
				functions: [],
				commissions: ["Komisja Finansów"],
			},
			{
				id: 5,
				firstName: "Tomasz",
				lastName: "Zieliński",
				functions: ["Przewodniczący Komisji"],
				commissions: ["Komisja Finansów", "Komisja Etyki"],
			},
		],
	},
	{
		id: 3,
		name: "Klub Unia Liberalna",
		type: "klub",
		color: "#16a34a",
		members: [
			{
				id: 6,
				firstName: "Ewa",
				lastName: "Krawczyk",
				functions: [],
				commissions: [],
			},
			{
				id: 7,
				firstName: "Marek",
				lastName: "Nowicki",
				functions: [],
				commissions: ["Komisja Stała"],
			},
		],
	},
	{
		id: 4,
		name: "Klub Konserwatystów i Liberałów",
		type: "klub",
		color: "#8b5cf6",
		members: [
			{
				id: 8,
				firstName: "Katarzyna",
				lastName: "Wójcik",
				functions: [],
				commissions: ["Komisja Etyki"],
			},
			{
				id: 9,
				firstName: "Paweł",
				lastName: "Kamiński",
				functions: [],
				commissions: [],
			},
		],
	},

	{
		id: 5,
		name: "Koło Alternatywa Centrum",
		type: "koło",
		color: "#f59e0b",
		members: [
			{
				id: 10,
				firstName: "Agnieszka",
				lastName: "Dąbrowska",
				functions: [],
				commissions: ["Komisja Finansów"],
			},
			{
				id: 11,
				firstName: "Michał",
				lastName: "Lewandowski",
				functions: [],
				commissions: [],
			},
		],
	},
	{
		id: 6,
		name: "Koło Kooperatywy Społecznej",
		type: "koło",
		color: "#ec4899",
		members: [
			{
				id: 12,
				firstName: "Monika",
				lastName: "Zając",
				functions: [],
				commissions: ["Komisja Stała"],
			},
		],
	},

	{
		id: 7,
		name: "Komitet Narodowy Polski",
		type: "komitet",
		color: "#dc2626",
		members: [
			{
				id: 13,
				firstName: "Andrzej",
				lastName: "Mazurek",
				functions: ["Przewodniczący"],
				commissions: [],
			},
			{
				id: 14,
				firstName: "Barbara",
				lastName: "Sikora",
				functions: [],
				commissions: ["Komisja Etyki"],
			},
		],
	},
];


export const parliamentarians = clubs.flatMap((club) =>
	club.members.map((member) => ({
		...member,
		clubId: club.id,
		clubName: club.name,
		clubType: club.type,
		clubColor: club.color,
	})),
);


export const unaffiliated = [
	{
		id: 15,
		firstName: "Adam",
		lastName: "Malinowski",
		functions: [],
		commissions: [],
		clubId: null,
	},
	{
		id: 16,
		firstName: "Beata",
		lastName: "Szymańska",
		functions: [],
		commissions: ["Komisja Finansów"],
		clubId: null,
	},
	{
		id: 17,
		firstName: "Robert",
		lastName: "Jabłoński",
		functions: [],
		commissions: [],
		clubId: null,
	},
];

export const allParliamentarians = [...parliamentarians, ...unaffiliated];


export const getClubById = (id) => clubs.find((c) => c.id === id);
export const getParliamentariansByClub = (clubId) => {
	if (clubId === null) return unaffiliated;
	const club = getClubById(clubId);
	return club ? club.members : [];
};


export const getClubsByType = (type) => clubs.filter((c) => c.type === type);
export const getTotalSeats = () => allParliamentarians.length;
export const getClubSeats = (clubId) => {
	const club = getClubById(clubId);
	return club ? club.members.length : 0;
};
