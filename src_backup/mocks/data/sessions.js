// mocks/data/sessions.js

export const sessions = [
	{
		id: 1,
		name: "III POSIEDZENIE PARLAMENTU MŁODYCH RP",
		date: "19.09.2026",
		startISO: "2026-09-19T08:00:00.000Z",
		endISO: "2026-09-19T18:00:00.000Z",
		city: "Warszawa",
	},
	{
		id: 2,
		name: "Posiedzenie Komisji Stałej",
		date: "20.09.2026",
		startISO: "2026-09-20T08:00:00.000Z",
		endISO: "2026-09-20T12:00:00.000Z",
		city: "Warszawa",
	},
	{
		id: 3,
		name: "Posiedzenie Komisji Etyki Parlamentarnej",
		date: "25.09.2026",
		startISO: "2026-09-25T08:00:00.000Z",
		endISO: "2026-09-25T12:00:00.000Z",
		city: "Warszawa",
	},
	{
		id: 4,
		name: "IV POSIEDZENIE PARLAMENTU MŁODYCH RP",
		date: "15.10.2026",
		startISO: "2026-10-15T08:00:00.000Z",
		endISO: "2026-10-15T18:00:00.000Z",
		city: "Warszawa",
	},
];

export const currentSession = {
	id: 1,
	title: "III POSIEDZENIE PARLAMENTU MŁODYCH RP",
	start: "2026-09-19T08:00:00.000Z",
	end: "2026-09-19T18:00:00.000Z",
	active: false, // ← 17.09.2026, sesja 19.09 jeszcze się nie zaczęła
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
		{ time: "10:00", title: "Otwarcie posiedzenia", status: "crossed" },
		{ time: "10:30", title: "Sprawozdanie komisji", status: "done" },
		{ time: "12:00", title: "Debata nad ustawą o cyfryzacji administracji", status: "active" },
		{ time: "14:00", title: "Głosowania", status: "waiting" },
	],
	zoContent: "Sprawdzanie obecności",
};