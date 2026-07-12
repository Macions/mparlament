export const sessions = [
	{
		id: 1,
		name: "III POSIEDZENIE PARLAMENTU MŁODYCH RP",
		date: "19.09.2026",
		city: "Warszawa"
	},
	{
		id: 2,
		name: "Posiedzenie Komisji Stałej",
		date: "20.09.2026",
		city: "Warszawa"
	},
	{
		id: 3,
		name: "Posiedzenie Komisji Etyki Parlamentarnej",
		date: "25.09.2026",
		city: "Warszawa"
	},
	{
		id: 4,
		name: "IV POSIEDZENIE PARLAMENTU MŁODYCH RP",
		date: "15.10.2026",
		city: "Warszawa"
	}
];

export const currentSession = {
	id: 1,
	title: "III POSIEDZENIE PARLAMENTU MŁODYCH RP",
	start: "19.09.2026",
	startTime: "8:00",
	end: "19.09.2026",
	endTime: "18:00",
	active: true,
	currentSpeaker: {
		name: "Jan Kowalski",
		club: "Klub Parlamentarny Czas Młodych",
		role: "Parlamentarzysta",
		time: "12:45",
	},
	currentPoint: {
		number: "2",
		title: "Debata nad ustawą o cyfryzacji administracji",
		type: "Dyskusja",
	},
	schedule: [
		{ time: "10:00", title: "Otwarcie posiedzenia", status: "done" },
		{ time: "10:30", title: "Sprawozdanie komisji", status: "done" },
		{ time: "12:00", title: "Debata nad ustawą o cyfryzacji administracji", status: "active" },
		{ time: "14:00", title: "Głosowania", status: "waiting" },
	],
};