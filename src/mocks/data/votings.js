export let votings = [
	{
		id: 1,
		title: "Uchwała w sprawie zwiększenia finansowania oświaty",
		description:
			"Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
		category: "Uchwała",

		startTime: "2026-07-10T16:19:00",
		endTime: "2026-07-10T22:00:00",

		status: "active", // ✅ Dodane pole status

		recipientsType: "all",
		selectedGroups: [],
		selectedMembers: [],

		votesFor: 142,
		votesAgainst: 87,
		abstained: 12,

		hasVoted: true,
		myVote: "for",

		createdBy: "Jan Kowalski",
	},

	{
		id: 2,
		title: "Zmiana w ustawie o ochronie środowiska",
		description: "Zmiana przepisów dotyczących emisji.",
		category: "Komisja",

		startTime: "2026-07-06T16:00:00",
		endTime: "2026-07-06T18:00:00",

		status: "finished", // ✅ Dodane pole status - zakończone

		recipientsType: "groups",

		votesFor: 100,
		votesAgainst: 80,
		abstained: 10,

		hasVoted: true,
		myVote: "for",

		createdBy: "Marszałek Parlamentu",
	},

	// ✅ Dodaj przykład zarchiwizowanego głosowania
	{
		id: 3,
		title: "Uchwała w sprawie budżetu na 2026 rok",
		description: "Głosowanie nad budżetem na rok 2026.",
		category: "Uchwała",

		startTime: "2026-06-20T10:00:00",
		endTime: "2026-06-20T14:00:00",

		status: "archived", // ✅ Zarchiwizowane

		recipientsType: "all",
		selectedGroups: [],
		selectedMembers: [],

		votesFor: 200,
		votesAgainst: 45,
		abstained: 15,

		hasVoted: true,
		myVote: "for",

		createdBy: "Anna Nowak",
	},
];
