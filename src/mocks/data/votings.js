export let votings = [
	{
		id: 1,
		title: "Uchwała w sprawie zwiększenia finansowania oświaty",
		description:
			"Projekt uchwały dotyczący zwiększenia środków przeznaczonych na edukację.",
		category: "resolution",

		startTime: "2026-07-09T16:19:00",
		endTime: "2026-07-09T18:19:00",

		status: "active",

		recipientsType: "all",
		selectedGroups: [],
		selectedMembers: [],

		votesFor: 142,
		votesAgainst: 87,
		abstained: 12,

		hasVoted: false,
		myVote: null,

		createdBy: "Jan Kowalski",
	},

	{
		id: 2,
		title: "Zmiana w ustawie o ochronie środowiska",
		description: "Zmiana przepisów dotyczących emisji.",
		category: "committee",

		startTime: "2026-07-06T16:00:00",
		endTime: "2026-07-06T18:00:00",

		recipientsType: "groups",

		votesFor: 100,
		votesAgainst: 80,
		abstained: 10,

		hasVoted: true,
		myVote: "for",

		createdBy: "Marszałek Parlamentu",
	},
];
