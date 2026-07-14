export const amendments = [
	{
		id: 1,
		resolutionId: 1,
		author: "Anna Nowak",
		content:
			"Proponuję zmianę w artykule 2 dotyczącą zwiększenia budżetu na szkolenia z kompetencji cyfrowych z 500 tys. zł do 1 mln zł.",
		status: "pending",
		createdAt: "2026-07-10",
		withdrawnReason: null,
		changes: [
			{
				articleId: 1,
				before:
					"Przeznacza się kwotę 500 000 zł na szkolenia z kompetencji cyfrowych.",
				after:
					"Przeznacza się kwotę 1 000 000 zł na szkolenia z kompetencji cyfrowych.",
			},
		],
	},
	{
		id: 2,
		resolutionId: 1,
		author: "Piotr Wiśniewski",
		content:
			"Dodanie nowego artykułu dotyczącego obowiązkowych szkoleń dla nauczycieli.",
		status: "accepted",
		createdAt: "2026-07-09",
		withdrawnReason: null,
		changes: [
			{
				articleId: 3,
				before: null,
				after:
					"Nauczyciele są zobowiązani do odbycia szkolenia z kompetencji cyfrowych w ciągu 6 miesięcy od wejścia w życie uchwały.",
			},
		],
	},
	{
		id: 3,
		resolutionId: 2,
		author: "Maria Kowalska",
		content: "Zmiana terminu realizacji projektu z 2026 na 2027 rok.",
		status: "rejected",
		createdAt: "2026-07-08",
		withdrawnReason: null,
		changes: [
			{
				articleId: 5,
				before: "Projekt zostanie zrealizowany do 31 grudnia 2026 roku.",
				after: "Projekt zostanie zrealizowany do 31 grudnia 2027 roku.",
			},
		],
	},
	{
		id: 4,
		resolutionId: 1,
		author: "Jan Kowalski",
		content: "Wycofuję poprawkę ze względu na brak poparcia.",
		status: "withdrawn",
		createdAt: "2026-07-07",
		withdrawnReason: "Brak poparcia wśród członków komisji",
		changes: [],
	},
	{
		id: 5,
		resolutionId: 1,
		authorId: 1,
		author: "Jan Kowalski",
		content:
			"Proponuję zmianę w artykule 4 dotyczącą zwiększenia liczby godzin szkoleń z kompetencji cyfrowych dla uczestników programu.",
		status: "pending",
		createdAt: "2026-07-10",
		withdrawnReason: null,
		changes: [
			{
				articleId: 4,
				before:
					"Program obejmuje szkolenia z kompetencji cyfrowych w wymiarze 10 godzin.",
				after:
					"Program obejmuje szkolenia z kompetencji cyfrowych w wymiarze 20 godzin.",
			},
		],
	},
	// 👇 NOWE POPRAWKI - USUNIĘCIE I DODANIE
	{
		id: 6,
		resolutionId: 1,
		author: "Tomasz Zieliński",
		authorId: 3,
		content:
			"Proponuję usunięcie artykułu 5 dotyczącego terminu realizacji projektu.",
		status: "accepted",
		createdAt: "2026-07-11",
		withdrawnReason: null,
		changes: [
			{
				articleId: 5,
				before: "Projekt zostanie zrealizowany do 31 grudnia 2026 roku.",
				after: "(usunięty)",
			},
		],
	},
	{
		id: 7,
		resolutionId: 1,
		author: "Ewa Kwiatkowska",
		authorId: 4,
		content:
			"Dodanie nowego artykułu dotyczącego monitorowania postępów w kompetencjach cyfrowych.",
		status: "accepted",
		createdAt: "2026-07-11",
		withdrawnReason: null,
		changes: [
			{
				articleId: 4,
				before: null,
				after:
					"Minister właściwy do spraw cyfryzacji monitoruje postępy w realizacji programu i składa raport raz na rok.",
			},
		],
	},
];
