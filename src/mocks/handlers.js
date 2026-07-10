import { http, HttpResponse } from "msw";

import { user, users } from "./data/users";
import { currentSession } from "./data/sessions";
import { votings } from "./data/votings";
import { resolutions } from "./data/resolutions";
import { resolutionSignatures } from "./data/signatures";
import { amendments } from "./data/amendments";

const getResolutionBySlug = (slug) => {
	return resolutions.find((r) => r.slug === slug);
};

const getResolutionById = (id) => {
	return resolutions.find((r) => r.id === Number(id));
};

const getSignaturesForResolution = (resolutionId) => {
	return resolutionSignatures.filter(
		(signature) => signature.resolutionId === Number(resolutionId),
	);
};

const getUserSignature = (resolutionId, userId) => {
	return resolutionSignatures.find(
		(signature) =>
			signature.resolutionId === Number(resolutionId) &&
			signature.userId === userId,
	);
};

const buildResolutionResponse = (
	resolution,
	signedUsers,
	currentUser = null,
) => {
	const signatures = getSignaturesForResolution(resolution.id);
	const signaturesCount = signatures.length;

	const usersWithSignatures = signatures
		.map((signature) => {
			const signedUser = users.find((u) => u.id === signature.userId);
			if (!signedUser) return null;
			return {
				name: signedUser.name,
				club: signedUser.club,
				timestamp: signature.timestamp,
				type: signature.type,
			};
		})
		.filter(Boolean);

	return {
		resolution: {
			...resolution,
			signatures: signaturesCount,
		},
		signedUsers: usersWithSignatures,
		session: {
			city: "Warszawa",
			date: "20.05",
		},
		...(currentUser && {
			currentUser: {
				hasSigned: !!getUserSignature(resolution.id, user.id),
				isAuthor: resolution.authorId === user.id,
				signatureType: getUserSignature(resolution.id, user.id)?.type ?? null,
			},
		}),
	};
};

const handleResolutionSign = (resolutionId, userId) => {
	const alreadySigned = resolutionSignatures.some(
		(signature) =>
			signature.resolutionId === Number(resolutionId) &&
			signature.userId === userId,
	);

	if (alreadySigned) {
		return {
			error: true,
			status: 400,
			message: "Już podpisałeś tę uchwałę",
		};
	}

	resolutionSignatures.push({
		id: Date.now(),
		resolutionId: Number(resolutionId),
		userId: userId,
		timestamp: new Date().toISOString(),
		type: "signature",
	});

	return {
		success: true,
	};
};

const handleResolutionUnsign = (resolutionId, userId) => {
	const signatureIndex = resolutionSignatures.findIndex(
		(signature) =>
			signature.resolutionId === Number(resolutionId) &&
			signature.userId === userId,
	);

	if (signatureIndex === -1) {
		return {
			error: true,
			status: 404,
			message: "Nie masz podpisu",
		};
	}

	const signature = resolutionSignatures[signatureIndex];

	if (signature.type === "author") {
		return {
			error: true,
			status: 403,
			message: "Autor nie może usunąć podpisu",
		};
	}

	resolutionSignatures.splice(signatureIndex, 1);

	return {
		success: true,
	};
};

const findVotingIndex = (id) => {
	return votings.findIndex((v) => v.id === Number(id));
};

const createVoting = (body) => {
	return {
		id: Date.now(),
		...body,
		votesFor: 0,
		votesAgainst: 0,
		abstained: 0,
		hasVoted: false,
		myVote: null,
		createdBy: "TEST123",
	};
};

export const handlers = [
	http.post("/api/auth/login", async ({ request }) => {
		const body = await request.json();

		if (body.username === user.username && body.password === user.password) {
			return HttpResponse.json({
				token: "mock_jwt_token_123",
				user: {
					id: user.id,
					username: user.username,
					name: user.name,
					role: user.role,
					permissions: user.permissions,
				},
			});
		}

		return HttpResponse.json(
			{ message: "Nieprawidłowy login lub hasło" },
			{ status: 401 },
		);
	}),

	http.get("/api/auth/me", () => {
		return HttpResponse.json(user);
	}),

	http.get("/api/sessions/current", () => {
		return HttpResponse.json(currentSession);
	}),

	http.get("/api/votings", () => {
		return HttpResponse.json(votings);
	}),

	http.get("/api/votings/:id", ({ params }) => {
		const voting = votings.find((v) => v.id === Number(params.id));

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		return HttpResponse.json(voting);
	}),

	http.post("/api/votings", async ({ request }) => {
		const body = await request.json();
		const newVoting = createVoting(body);
		votings.push(newVoting);
		return HttpResponse.json(newVoting, { status: 201 });
	}),

	http.put("/api/votings/:id", async ({ params, request }) => {
		const index = findVotingIndex(params.id);

		if (index === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		votings[index] = { ...votings[index], ...body };
		return HttpResponse.json(votings[index]);
	}),

	http.patch("/api/votings/:id", async ({ params, request }) => {
		const index = findVotingIndex(params.id);

		if (index === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		votings[index] = { ...votings[index], ...body };
		return HttpResponse.json(votings[index]);
	}),

	http.delete("/api/votings/:id", ({ params }) => {
		const index = findVotingIndex(params.id);

		if (index === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		votings.splice(index, 1);
		return HttpResponse.json({ success: true });
	}),

	http.post("/api/votings/:id/vote", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({
			success: true,
			vote: body.vote,
		});
	}),

	http.get("/api/resolutions", () => {
		return HttpResponse.json({
			session: {
				city: "Warszawa",
				date: "20.05",
			},
			resolutions,
		});
	}),

	http.get("/api/resolutions/:slug", ({ params }) => {
		const resolution = getResolutionBySlug(params.slug);

		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		return HttpResponse.json(buildResolutionResponse(resolution, null, true));
	}),

	http.post("/api/resolutions/:id/sign", ({ params }) => {
		const resolution = getResolutionById(params.id);

		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		const result = handleResolutionSign(params.id, user.id);

		if (result.error) {
			return HttpResponse.json(
				{ message: result.message },
				{ status: result.status },
			);
		}

		return HttpResponse.json({ success: true });
	}),

	http.delete("/api/resolutions/:id/sign", ({ params }) => {
		const resolution = getResolutionById(params.id);

		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		const result = handleResolutionUnsign(params.id, user.id);

		if (result.error) {
			return HttpResponse.json(
				{ message: result.message },
				{ status: result.status },
			);
		}

		return HttpResponse.json(
			{ success: true, message: "Podpis został usunięty" },
			{ status: 200 },
		);
	}),
	http.get("/api/resolutions/:slug/amendments", ({ params }) => {
		const resolution = resolutions.find((r) => r.slug === params.slug);

		if (!resolution) {
			return HttpResponse.json(
				{
					message: "Nie znaleziono uchwały",
				},
				{
					status: 404,
				},
			);
		}

		const billAmendments = amendments.filter(
			(amendment) => amendment.resolutionId === resolution.id,
		);

		return HttpResponse.json({
			resolution: {
				title: resolution.title,
				slug: resolution.slug,
			},

			session: {
				city: "Warszawa",
				date: "20.05",
			},

			amendments: billAmendments,
		});
	}),
	// tworzenie uchwały
	http.post("/api/resolutions", async ({ request }) => {
		const body = await request.json();

		const newResolution = {
			id: Date.now(),
			title: body.title,
			slug: body.title
				.toLowerCase()
				.replaceAll(" ", "-")
				.replaceAll(/[^\w-]/g, ""),
			fileName: body.fileName,
			authorId: body.authorId,
			author: body.author,
			party: body.party,
			preamble: body.preamble,
			chapters: body.chapters,
			signatures: 1,
			status: "pending",
			createdAt: new Date().toISOString(),
		};

		resolutions.push(newResolution);

		resolutionSignatures.push({
			id: Date.now(),
			resolutionId: newResolution.id,
			userId: body.authorId,
			date: new Date().toISOString().split("T")[0],
			type: "author",
		});

		return HttpResponse.json(newResolution, { status: 201 });
	}),
	http.get("/api/resolutions/:slug/amendments", ({ params }) => {
		const resolution = resolutions.find((r) => r.slug === params.slug);

		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		const billAmendments = amendments.filter(
			(amendment) => amendment.resolutionId === resolution.id,
		);

		return HttpResponse.json({
			resolution: {
				title: resolution.title,
				slug: resolution.slug,
			},
			session: {
				city: "Warszawa",
				date: "20.05",
			},
			amendments: billAmendments,
		});
	}),
	http.get("/api/resolutions/:slug/amendments/:amendmentId", ({ params }) => {
		const resolution = resolutions.find((r) => r.slug === params.slug);

		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		const amendment = amendments.find(
			(a) =>
				a.id === Number(params.amendmentId) && a.resolutionId === resolution.id,
		);

		if (!amendment) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 },
			);
		}

		return HttpResponse.json({
			resolution: {
				title: resolution.title,
				slug: resolution.slug,
			},
			amendment: amendment,
			session: {
				city: "Warszawa",
				date: "20.05",
			},
		});
	}),
	http.post(
		"/api/resolutions/:slug/amendments",
		async ({ params, request }) => {
			const resolution = resolutions.find((r) => r.slug === params.slug);

			if (!resolution) {
				return HttpResponse.json(
					{ message: "Nie znaleziono uchwały" },
					{ status: 404 },
				);
			}

			const body = await request.json();

			const newAmendment = {
				id: Date.now(),
				resolutionId: resolution.id,
				author: body.author,
				authorId: body.authorId,
				club: body.club,
				content: body.content,
				status: "pending",
				createdAt: new Date().toISOString().split("T")[0],
				withdrawnReason: null,
				changes: body.changes || [],
			};

			amendments.push(newAmendment);

			return HttpResponse.json(
				{ success: true, amendment: newAmendment },
				{ status: 201 },
			);
		},
	),
	// Pobieranie aktualnego użytkownika
	http.get("/api/current-user", () => {
		return HttpResponse.json({
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				role: user.role,
				permissions: user.permissions,
			},
		});
	}),

	// Wycofywanie poprawki
	http.post("/api/amendments/:id/withdraw", async ({ params, request }) => {
		const amendmentId = Number(params.id);
		const amendment = amendments.find((a) => a.id === amendmentId);

		if (!amendment) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 },
			);
		}

		// Sprawdź czy zalogowany użytkownik jest autorem
		if (amendment.authorId !== user.id) {
			return HttpResponse.json(
				{ message: "Nie masz uprawnień do wycofania tej poprawki" },
				{ status: 403 },
			);
		}

		// Sprawdź czy poprawka nie jest już wycofana
		if (amendment.status === "withdrawn") {
			return HttpResponse.json(
				{ message: "Ta poprawka została już wycofana" },
				{ status: 400 },
			);
		}

		const body = await request.json();

		// Aktualizuj status poprawki
		amendment.status = "withdrawn";
		amendment.withdrawnReason = body.reason || "Wycofane przez autora";

		return HttpResponse.json({
			success: true,
			amendment: amendment,
		});
	}),
	// Archiwizacja głosowania
	http.post("/api/votings/:id/archive", ({ params }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		// Zmień status na archived
		voting.status = "archived";

		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zarchiwizowane",
		});
	}),
];
