import { http, HttpResponse } from "msw";

import { user } from "./data/users";
import { currentSession } from "./data/sessions";
import { votings } from "./data/votings";

export const handlers = [
	http.post("/api/auth/login", async ({ request }) => {
		const body = await request.json();

		if (body.username === "TEST123" && body.password === "password123") {
			return HttpResponse.json({
				token: "mock_jwt_token_123",

				user: {
					id: 1,
					username: "TEST123",
					name: "Jan Kowalski",
					role: "admin",
					club: "KLUB PARLAMENTARNY CZAS MŁODYCH",
				},
			});
		}

		return HttpResponse.json(
			{
				message: "Nieprawidłowy login lub hasło",
			},
			{
				status: 401,
			},
		);
	}),

	http.get("/api/auth/me", () => {
		return HttpResponse.json(user);
	}),

	http.get("/api/sessions/current", () => {
		return HttpResponse.json(currentSession);
	}),

	// pobieranie wszystkich głosowań

	http.get("/api/votings", () => {
		return HttpResponse.json(votings);
	}),

	// pobieranie jednego głosowania

	http.get("/api/votings/:id", ({ params }) => {
		const voting = votings.find((v) => v.id === Number(params.id));

		if (!voting) {
			return HttpResponse.json(
				{
					message: "Nie znaleziono głosowania",
				},
				{
					status: 404,
				},
			);
		}

		return HttpResponse.json(voting);
	}),

	// tworzenie głosowania

	http.post("/api/votings", async ({ request }) => {
		const body = await request.json();

		const newVoting = {
			id: Date.now(),

			...body,

			votesFor: 0,
			votesAgainst: 0,
			abstained: 0,

			hasVoted: false,
			myVote: null,

			createdBy: "TEST123",
		};

		votings.push(newVoting);

		return HttpResponse.json(newVoting, {
			status: 201,
		});
	}),

	// edycja głosowania

	http.put("/api/votings/:id", async ({ params, request }) => {
		const body = await request.json();

		const index = votings.findIndex((v) => v.id === Number(params.id));

		if (index === -1) {
			return HttpResponse.json(
				{
					message: "Nie znaleziono głosowania",
				},
				{
					status: 404,
				},
			);
		}

		votings[index] = {
			...votings[index],

			...body,
		};

		return HttpResponse.json(votings[index]);
	}),

	http.post("/api/votings", async ({ request }) => {
		const body = await request.json();

		const newVoting = {
			id: Date.now(),

			...body,

			votesFor: 0,
			votesAgainst: 0,
			abstained: 0,

			hasVoted: false,
			myVote: null,
		};

		votings.push(newVoting);

		return HttpResponse.json(newVoting);
	}),
	http.put("/api/votings/:id", async ({ params, request }) => {
		const id = Number(params.id);

		const body = await request.json();

		const index = votings.findIndex((v) => v.id === id);

		if (index === -1) {
			return HttpResponse.json(
				{
					message: "Nie znaleziono głosowania",
				},
				{
					status: 404,
				},
			);
		}

		votings[index] = {
			...votings[index],
			...body,
		};

		return HttpResponse.json(votings[index]);
	}),
	http.delete("/api/votings/:id", ({ params }) => {
		const id = Number(params.id);

		votings = votings.filter((v) => v.id !== id);

		return HttpResponse.json({
			success: true,
		});
	}),
	http.patch("/api/votings/:id", async ({ params, request }) => {
		const body = await request.json();

		const index = votings.findIndex((v) => v.id === Number(params.id));

		if (index === -1) {
			return HttpResponse.json(
				{
					message: "Nie znaleziono głosowania",
				},
				{
					status: 404,
				},
			);
		}

		votings[index] = {
			...votings[index],
			...body,
		};

		return HttpResponse.json(votings[index]);
	}),

	// usuwanie

	http.delete("/api/votings/:id", ({ params }) => {
		const index = votings.findIndex((v) => v.id === Number(params.id));

		if (index !== -1) {
			votings.splice(index, 1);
		}

		return HttpResponse.json({
			success: true,
		});
	}),

	// oddanie głosu

	http.post("/api/votings/:id/vote", async ({ request }) => {
		const body = await request.json();

		return HttpResponse.json({
			success: true,

			vote: body.vote,
		});
	}),
];
