export const bills = [
	{
		id: "bill_1",
		slug: "ustawa-o-edukacji",
		title: "Ustawa o edukacji",
		shortName: "Ustawa edukacyjna",
		articles: [
			{ id: "b1_a1", content: "Art. 1: Szkoła jest obowiązkowa." },
			{ id: "b1_a2", content: "Art. 2: Nauka trwa 12 lat." },
			{
				id: "b1_a3",
				content: "Art. 3: Oceny są jawne dla uczniów i rodziców.",
			},
			{
				id: "b1_a4",
				content: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny.",
			},
		],
	},
	{
		id: "bill_2",
		slug: "ustawa-o-rolnictwie",
		title: "Ustawa o rolnictwie i rozwoju wsi",
		shortName: "Ustawa rolna",
		articles: [
			{ id: "b2_a1", content: "Art. 1: Państwo wspiera rolnictwo." },
			{ id: "b2_a2", content: "Art. 2: Dopłaty bezpośrednie dla rolników." },
			{ id: "b2_a4", content: "Art. 4: Rolnictwo jest strategiczne." },
			{ id: "b2_a5", content: "Art. 5: Ochrona gruntów rolnych." },
		],
	},
	{
		id: "bill_3",
		slug: "ustawa-o-ochronie-zdrowia",
		title: "Ustawa o ochronie zdrowia",
		shortName: "Ustawa zdrowotna",
		articles: [
			{ id: "b3_a1", content: "Art. 1: Każdy ma prawo do opieki zdrowotnej." },
			{ id: "b3_a2", content: "Art. 2: Czas oczekiwania na świadczenia." },
			{
				id: "b3_a5",
				content: "Art. 5: Szpitale są finansowane z budżetu państwa.",
			},
			{ id: "b3_a7", content: "Art. 7: Pacjent ma prawo do informacji." },
		],
	},
	{
		id: "bill_4",
		slug: "ustawa-o-gornictwie",
		title: "Ustawa o wydobyciu surowców energetycznych",
		shortName: "Ustawa górnicza",
		articles: [
			{
				id: "b4_a1",
				content: "Art. 1: Wydobycie złota i innych surowców jest regulowane.",
			},
			{ id: "b4_a2", content: "Art. 2: Koncesje wydawane są na 25 lat." },
			{ id: "b4_a3", content: "Art. 3: Ochrona środowiska przy wydobyciu." },
		],
	},
];

export const amendments = [
	// ========== BILL 1 – Ustawa o edukacji ==========
	{
		id: "am_101",
		billId: "bill_1",
		author: "Klub Postępu",
		status: "pending",
		changes: [
			{
				id: "am_101_1",
				articleId: "b1_a1",
				from: "Art. 1: Szkoła jest obowiązkowa.",
				to: "Art. 1: Szkoła jest obowiązkowa i w pełni darmowa.",
			},
			{
				id: "am_101_2",
				articleId: "b1_a2",
				from: "Art. 2: Nauka trwa 12 lat.",
				to: "Art. 2: Nauka trwa 12 lat z możliwością skrócenia dla uczniów wybitnych.",
			},
		],
	},
	{
		id: "am_102",
		billId: "bill_1",
		author: "Klub Postępu",
		status: "accepted",
		changes: [
			{
				id: "am_102_1",
				articleId: "b1_a3",
				from: "Art. 3: Oceny są jawne dla uczniów i rodziców.",
				to: "Art. 3: Oceny są jawne i publikowane w dzienniku elektronicznym.",
			},
			{
				id: "am_102_2",
				articleId: "b1_a4",
				from: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny.",
				to: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny za innowacyjne metody nauczania.",
			},
		],
	},
	{
		id: "am_103",
		billId: "bill_1",
		author: "Klub Postępu",
		status: "rejected",
		changes: [
			{
				id: "am_103_1",
				articleId: "b1_a1",
				from: "",
				to: "Art. 1a: Wprowadza się obowiązkową naukę programowania od klasy 4.",
			},
		],
	},
	{
		id: "am_104",
		billId: "bill_1",
		author: "Klub Tradycja",
		status: "pending",
		changes: [
			{
				id: "am_104_1",
				articleId: "b1_a3",
				from: "Art. 3: Oceny są jawne dla uczniów i rodziców.",
				to: "Art. 3: Oceny są jawne wyłącznie dla rodziców do 18 roku życia ucznia.",
			},
			{
				id: "am_104_2",
				articleId: "b1_a4",
				from: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny.",
				to: "Art. 4: Nauczyciele otrzymują dodatek motywacyjny uzależniony od wyników egzaminów.",
			},
			{
				id: "am_104_3",
				articleId: "b1_a1",
				from: "",
				to: "Art. 1a: Przywraca się obowiązek noszenia mundurków szkolnych.",
			},
		],
	},
	{
		id: "am_105",
		billId: "bill_1",
		author: "Klub Równość",
		status: "pending",
		changes: [
			{
				id: "am_105_1",
				articleId: "b1_a1",
				from: "Art. 1: Szkoła jest obowiązkowa.",
				to: "Art. 1: Szkoła jest obowiązkowa i zapewnia darmowe posiłki dla wszystkich uczniów.",
			},
			{
				id: "am_105_2",
				articleId: "b1_a2",
				from: "Art. 2: Nauka trwa 12 lat.",
				to: "Art. 2: Nauka trwa 13 lat – dodaje się obowiązkowy rok przedszkolny.",
			},
		],
	},

	// ========== BILL 2 – Ustawa o rolnictwie ==========
	{
		id: "am_201",
		billId: "bill_2",
		author: "Klub Rolników",
		status: "pending",
		changes: [
			{
				id: "am_201_1",
				articleId: "b2_a4",
				from: "Art. 4: Rolnictwo jest strategiczne.",
				to: "Art. 4: Rolnictwo jest kluczowe dla bezpieczeństwa żywnościowego państwa.",
			},
			{
				id: "am_201_2",
				articleId: "b2_a1",
				from: "Art. 1: Państwo wspiera rolnictwo.",
				to: "Art. 1: Państwo gwarantuje minimalne ceny skupu dla rolników.",
			},
		],
	},
	{
		id: "am_202",
		billId: "bill_2",
		author: "Klub Rolników",
		status: "accepted",
		changes: [
			{
				id: "am_202_1",
				articleId: "b2_a2",
				from: "Art. 2: Dopłaty bezpośrednie dla rolników.",
				to: "Art. 2: Dopłaty bezpośrednie powiązane z areałem i rodzajem upraw.",
			},
			{
				id: "am_202_2",
				articleId: "b2_a5",
				from: "Art. 5: Ochrona gruntów rolnych.",
				to: "Art. 5: Ochrona gruntów rolnych i zakaz ich przeznaczania na cele nierolnicze.",
			},
		],
	},
	{
		id: "am_203",
		billId: "bill_2",
		author: "Klub Rolników",
		status: "rejected",
		changes: [
			{
				id: "am_203_1",
				articleId: "b2_a4",
				from: "",
				to: "Art. 4a: Wprowadza się urlop żniwny dla rolników.",
			},
		],
	},
	{
		id: "am_204",
		billId: "bill_2",
		author: "Klub Zielonych",
		status: "pending",
		changes: [
			{
				id: "am_204_1",
				articleId: "b2_a5",
				from: "Art. 5: Ochrona gruntów rolnych.",
				to: "Art. 5: Wprowadza się całkowity zakaz zabudowy gruntów rolnych klas I-III.",
			},
			{
				id: "am_204_2",
				articleId: "b2_a2",
				from: "Art. 2: Dopłaty bezpośrednie dla rolników.",
				to: "Art. 2: Dopłaty bezpośrednie wyłącznie dla gospodarstw ekologicznych.",
			},
			{
				id: "am_204_3",
				articleId: "b2_a4",
				from: "",
				to: "Art. 4a: Obowiązkowe szkolenia z rolnictwa zrównoważonego.",
			},
		],
	},
	{
		id: "am_205",
		billId: "bill_2",
		author: "Klub Liberalny",
		status: "pending",
		changes: [
			{
				id: "am_205_1",
				articleId: "b2_a1",
				from: "Art. 1: Państwo wspiera rolnictwo.",
				to: "Art. 1: Znosi się subwencje – rolnictwo w oparciu o wolny rynek.",
			},
			{
				id: "am_205_2",
				articleId: "b2_a2",
				from: "Art. 2: Dopłaty bezpośrednie dla rolników.",
				to: "",
			},
		],
	},

	// ========== BILL 3 – Ustawa o ochronie zdrowia ==========
	{
		id: "am_301",
		billId: "bill_3",
		author: "Klub Zdrowie Publiczne",
		status: "pending",
		changes: [
			{
				id: "am_301_1",
				articleId: "b3_a7",
				from: "Art. 7: Pacjent ma prawo do informacji.",
				to: "Art. 7: Pacjent ma prawo do pełnej, zrozumiałej i aktualnej informacji o swoim stanie zdrowia.",
			},
			{
				id: "am_301_2",
				articleId: "b3_a2",
				from: "Art. 2: Czas oczekiwania na świadczenia.",
				to: "Art. 2: Maksymalny czas oczekiwania na wizytę u specjalisty – 60 dni.",
			},
		],
	},
	{
		id: "am_302",
		billId: "bill_3",
		author: "Klub Zdrowie Publiczne",
		status: "accepted",
		changes: [
			{
				id: "am_302_1",
				articleId: "b3_a1",
				from: "Art. 1: Każdy ma prawo do opieki zdrowotnej.",
				to: "Art. 1: Każdy ma prawo do bezpłatnej profilaktyki zdrowotnej raz w roku.",
			},
		],
	},
	{
		id: "am_303",
		billId: "bill_3",
		author: "Klub Zdrowie Publiczne",
		status: "rejected",
		changes: [
			{
				id: "am_303_1",
				articleId: "b3_a5",
				from: "",
				to: "Art. 5a: Darmowe leki dla osób powyżej 70. roku życia.",
			},
		],
	},
	{
		id: "am_304",
		billId: "bill_3",
		author: "Klub Prywatyzacja",
		status: "pending",
		changes: [
			{
				id: "am_304_1",
				articleId: "b3_a5",
				from: "Art. 5: Szpitale są finansowane z budżetu państwa.",
				to: "Art. 5: Szpitale działają na zasadach komercyjnych z pakietem gwarantowanym przez państwo.",
			},
			{
				id: "am_304_2",
				articleId: "b3_a1",
				from: "Art. 1: Każdy ma prawo do opieki zdrowotnej.",
				to: "Art. 1: Każdy ma prawo do wyboru prywatnego ubezpieczyciela zdrowotnego.",
			},
			{
				id: "am_304_3",
				articleId: "b3_a7",
				from: "",
				to: "Art. 7a: Wprowadza się opłaty za nadużywanie świadczeń.",
			},
		],
	},
	{
		id: "am_305",
		billId: "bill_3",
		author: "Klub Senior",
		status: "pending",
		changes: [
			{
				id: "am_305_1",
				articleId: "b3_a1",
				from: "Art. 1: Każdy ma prawo do opieki zdrowotnej.",
				to: "Art. 1: Osoby po 65. roku życia mają pierwszeństwo w dostępie do świadczeń.",
			},
			{
				id: "am_305_2",
				articleId: "b3_a5",
				from: "Art. 5: Szpitale są finansowane z budżetu państwa.",
				to: "Art. 5: Dodatkowe finansowanie oddziałów geriatrycznych.",
			},
		],
	},

	// ========== BILL 4 – Ustawa o górnictwie ==========
	{
		id: "am_401",
		billId: "bill_4",
		author: "Klub Ekologia",
		status: "pending",
		changes: [
			{
				id: "am_401_1",
				articleId: "b4_a3",
				from: "Art. 3: Ochrona środowiska przy wydobyciu.",
				to: "Art. 3: Zakazuje się wydobycia surowców w parkach narodowych i rezerwatach.",
			},
			{
				id: "am_401_2",
				articleId: "b4_a1",
				from: "Art. 1: Wydobycie złota i innych surowców jest regulowane.",
				to: "Art. 1: Wydobycie złota jest zakazane ze względu na użycie cyjanku.",
			},
		],
	},
	{
		id: "am_402",
		billId: "bill_4",
		author: "Klub Ekologia",
		status: "accepted",
		changes: [
			{
				id: "am_402_1",
				articleId: "b4_a2",
				from: "Art. 2: Koncesje wydawane są na 25 lat.",
				to: "Art. 2: Koncesje skraca się do 10 lat z obowiązkowym audytem środowiskowym.",
			},
			{
				id: "am_402_2",
				articleId: "b4_a3",
				from: "",
				to: "Art. 3a: Obowiązek rekultywacji terenów pogórniczych w ciągu 5 lat.",
			},
		],
	},
	{
		id: "am_403",
		billId: "bill_4",
		author: "Klub Ekologia",
		status: "rejected",
		changes: [
			{
				id: "am_403_1",
				articleId: "b4_a1",
				from: "",
				to: "Art. 1a: Całkowity zakaz wydobycia odkrywkowego.",
			},
		],
	},
	{
		id: "am_404",
		billId: "bill_4",
		author: "Klub Przemysł",
		status: "pending",
		changes: [
			{
				id: "am_404_1",
				articleId: "b4_a2",
				from: "Art. 2: Koncesje wydawane są na 25 lat.",
				to: "Art. 2: Koncesje wydłuża się do 50 lat dla strategicznych złóż.",
			},
			{
				id: "am_404_2",
				articleId: "b4_a3",
				from: "Art. 3: Ochrona środowiska przy wydobyciu.",
				to: "Art. 3: Uproszczenie ocen środowiskowych dla kluczowych inwestycji.",
			},
			{
				id: "am_404_3",
				articleId: "b4_a1",
				from: "",
				to: "Art. 1a: Ulgi podatkowe dla firm wydobywczych inwestujących w regionie.",
			},
		],
	},
	{
		id: "am_405",
		billId: "bill_4",
		author: "Klub Pracowników",
		status: "pending",
		changes: [
			{
				id: "am_405_1",
				articleId: "b4_a1",
				from: "Art. 1: Wydobycie złota i innych surowców jest regulowane.",
				to: "Art. 1: Obowiązkowe odprawy dla górników w razie zamknięcia kopalni.",
			},
			{
				id: "am_405_2",
				articleId: "b4_a2",
				from: "Art. 2: Koncesje wydawane są na 25 lat.",
				to: "Art. 2: Minimum 30% zysku z wydobycia trafia do społeczności lokalnych.",
			},
		],
	},
];

export const resolutions = [
	{
		id: "res_1",
		billId: "bill_4",
		slug: "uchwala-o-zlocie",
		title: "Uchwała dotycząca złota",
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
		id: "res_2",
		billId: null,
		slug: "uchwala-kalafiory",
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
		id: "res_3",
		billId: "bill_2",
		slug: "wsparcie-rolnictwa-ekologicznego",
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
		id: "res_4",
		billId: "bill_3",
		slug: "reforma-ochrony-zdrowia",
		title: "Uchwała w sprawie reformy ochrony zdrowia",
		date: "20.05.2026",
		fileName: "uchwała zdrowie.docx",
		author: "Jan Wiśniewski",
		party: "UNIA LIBERALNA",
		meeting: "Posiedzenie: Warszawa 20.05",
		signatures: 2,
		content: "Reforma systemu ochrony zdrowia...",
		submittedBy: "Jan Wiśniewski",
	},
];
