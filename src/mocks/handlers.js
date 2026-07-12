import { http, HttpResponse } from "msw";

import { users } from "./data/users";
import { currentSession } from "./data/sessions";
import { votings } from "./data/votings";
import { resolutions } from "./data/resolutions";
import { resolutionSignatures } from "./data/signatures";
import { amendments } from "./data/amendments";
import { parliamentarians } from "./data/parliamentarians";
import { clubs } from "./data/clubs";

let currentUser = null;

if (typeof localStorage !== 'undefined') {
	const savedUser = localStorage.getItem('msw_current_user');
	if (savedUser) {
		try {
			currentUser = JSON.parse(savedUser);
		} catch (e) {
			currentUser = null;
		}
	}
}
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
				hasSigned: !!getUserSignature(resolution.id, currentUser.id),
				isAuthor: resolution.authorId === currentUser.id,
				signatureType: getUserSignature(resolution.id, currentUser.id)?.type ?? null,
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

		const foundUser = users.find(u =>
			u.username === body.username && u.password === body.password
		);

		if (foundUser) {
			currentUser = foundUser;

			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('msw_current_user', JSON.stringify(foundUser));
			}

			return HttpResponse.json({
				token: "mock_jwt_token_123",
				user: {
					id: foundUser.id,
					username: foundUser.username,
					name: foundUser.name,
					role: foundUser.role,
					permissions: foundUser.permissions,
				},
			});
		}

		return HttpResponse.json(
			{ message: "Nieprawidłowy login lub hasło" },
			{ status: 401 },
		);
	}),



	http.get("/api/auth/me", () => {

		if (currentUser) {
			return HttpResponse.json(currentUser);
		}


		if (typeof localStorage !== 'undefined') {
			const savedUser = localStorage.getItem('msw_current_user');
			if (savedUser) {
				try {
					const user = JSON.parse(savedUser);
					currentUser = user;
					return HttpResponse.json(user);
				} catch (e) {

				}
			}
		}


		return HttpResponse.json(users[0]);
	}),

	http.get("/api/parliamentarians", () => {
		return HttpResponse.json({
			parliamentarians: parliamentarians.filter(p => p.clubId !== null),
			unaffiliated: parliamentarians.filter(p => p.clubId === null),
		});
	}),


	http.get("/api/session/current", () => {
		return HttpResponse.json(currentSession);
	}),

	http.put("/api/session/current", async ({ request }) => {
		const body = await request.json();

		return HttpResponse.json(body);
	}),


	http.get("/api/speakers", () => {
		return HttpResponse.json([
			{ name: "Jan Kowalski", club: "Klub Parlamentarny Czas Młodych", role: "Parlamentarzysta" },
			{ name: "Anna Nowak", club: "Klub Obywatelski", role: "Parlamentarzystka" },
			{ name: "Piotr Wiśniewski", club: "Klub Niezależnych", role: "Parlamentarzysta" },
		]);
	}),

	http.post("/api/speakers", async ({ request }) => {
		const body = await request.json();
		const newSpeaker = {
			id: Date.now(),
			...body,
		};

		return HttpResponse.json(newSpeaker, { status: 201 });
	}),
	http.post("/api/parliamentarians", async ({ request }) => {
		const body = await request.json();
		const newMember = {
			id: Date.now(),
			...body,
			clubId: body.clubId || null,
			clubName: body.clubId ? clubs.find(c => c.id === body.clubId)?.name : null,
			clubColor: body.clubId ? clubs.find(c => c.id === body.clubId)?.color : null,
		};
		parliamentarians.push(newMember);

		if (body.clubId) {
			const club = clubs.find(c => c.id === body.clubId);
			if (club) {
				club.members.push({
					id: newMember.id,
					firstName: newMember.firstName,
					lastName: newMember.lastName,
					functions: newMember.functions || [],
					commissions: newMember.commissions || [],
				});
			}
		}
		return HttpResponse.json(newMember, { status: 201 });
	}),

	http.put("/api/parliamentarians/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();
		const index = parliamentarians.findIndex(p => p.id === id);
		if (index === -1) return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });

		const old = parliamentarians[index];
		const updated = { ...old, ...body };


		const oldClub = clubs.find(c => c.id === old.clubId);
		if (oldClub) {
			oldClub.members = oldClub.members.filter(m => m.id !== id);
		}


		const newClub = clubs.find(c => c.id === body.clubId);
		if (newClub) {
			newClub.members.push({
				id: updated.id,
				firstName: updated.firstName,
				lastName: updated.lastName,
				functions: updated.functions || [],
				commissions: updated.commissions || [],
			});
			updated.clubName = newClub.name;
			updated.clubColor = newClub.color;
		}

		parliamentarians[index] = updated;
		return HttpResponse.json(updated);
	}),

	http.delete("/api/parliamentarians/:id", ({ params }) => {
		const id = Number(params.id);
		const member = parliamentarians.find(p => p.id === id);
		if (member?.clubId) {
			const club = clubs.find(c => c.id === member.clubId);
			if (club) {
				club.members = club.members.filter(m => m.id !== id);
			}
		}
		parliamentarians = parliamentarians.filter(p => p.id !== id);
		return HttpResponse.json({ success: true });
	}),


	http.get("/api/clubs", () => {
		return HttpResponse.json(clubs);
	}),

	http.post("/api/clubs", async ({ request }) => {
		const body = await request.json();
		const newClub = { id: Date.now(), ...body, members: [] };
		clubs.push(newClub);
		return HttpResponse.json(newClub, { status: 201 });
	}),

	http.put("/api/clubs/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();
		const index = clubs.findIndex(c => c.id === id);
		if (index === -1) return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		clubs[index] = { ...clubs[index], ...body };
		return HttpResponse.json(clubs[index]);
	}),

	http.delete("/api/clubs/:id", ({ params }) => {
		const id = Number(params.id);
		clubs = clubs.filter(c => c.id !== id);
		parliamentarians = parliamentarians.map(p =>
			p.clubId === id ? { ...p, clubId: null, clubName: null, clubColor: null } : p
		);
		return HttpResponse.json({ success: true });
	}),


	http.post("/api/clubs/:id/members", async ({ params, request }) => {
		const clubId = Number(params.id);
		const { memberId } = await request.json();

		const club = clubs.find(c => c.id === clubId);
		if (!club) return HttpResponse.json({ message: "Nie znaleziono klubu" }, { status: 404 });

		const member = parliamentarians.find(p => p.id === memberId);
		if (!member) return HttpResponse.json({ message: "Nie znaleziono członka" }, { status: 404 });


		if (member.clubId) {
			const oldClub = clubs.find(c => c.id === member.clubId);
			if (oldClub) {
				oldClub.members = oldClub.members.filter(m => m.id !== memberId);
			}
		}

		club.members.push({
			id: memberId,
			firstName: member.firstName,
			lastName: member.lastName,
			functions: member.functions || [],
			commissions: member.commissions || [],
		});

		member.clubId = clubId;
		member.clubName = club.name;
		member.clubColor = club.color;

		return HttpResponse.json({
			club: club,
			parliamentarians: parliamentarians.filter(p => p.clubId !== null),
			unaffiliated: parliamentarians.filter(p => p.clubId === null),
		});
	}),

	http.delete("/api/clubs/:id/members/:memberId", ({ params }) => {
		const clubId = Number(params.id);
		const memberId = Number(params.memberId);

		const club = clubs.find(c => c.id === clubId);
		if (club) {
			club.members = club.members.filter(m => m.id !== memberId);
		}

		const member = parliamentarians.find(p => p.id === memberId);
		if (member) {
			member.clubId = null;
			member.clubName = null;
			member.clubColor = null;
		}

		return HttpResponse.json({
			club: club,
			parliamentarians: parliamentarians.filter(p => p.clubId !== null),
			unaffiliated: parliamentarians.filter(p => p.clubId === null),
		});
	}),

	http.get("/api/sessions/current", () => {
		return HttpResponse.json(currentSession);
	}),

	http.get("/api/votings", () => {
		return HttpResponse.json(votings);
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

		const result = handleResolutionSign(params.id, 1);

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

		const result = handleResolutionUnsign(params.id, 1);

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

	http.post("/api/resolutions", async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('file');
			const data = JSON.parse(formData.get('data'));

			console.log('📁 Otrzymany plik:', file?.name, file?.size);
			console.log('📄 Otrzymane dane:', data);

			const newResolution = {
				id: Date.now(),
				title: data.title,
				slug: data.title
					.toLowerCase()
					.replaceAll(" ", "-")
					.replaceAll(/[^\w-]/g, ""),
				fileName: file ? file.name : data.fileName,
				authorId: data.authorId,
				author: data.author,
				party: data.party,
				preamble: data.preamble || "",
				chapters: data.chapters || [],
				signatures: 1,
				status: "pending",
				createdAt: new Date().toISOString(),
				fileInfo: file ? {
					name: file.name,
					size: file.size,
					type: file.type,
				} : null,
			};

			resolutions.push(newResolution);

			resolutionSignatures.push({
				id: Date.now(),
				resolutionId: newResolution.id,
				userId: data.authorId,
				date: new Date().toISOString().split("T")[0],
				type: "author",
			});

			return HttpResponse.json(newResolution, { status: 201 });
		} catch (error) {
			console.error('❌ Błąd w handlerze MSW:', error);
			return HttpResponse.json(
				{
					message: 'Błąd przetwarzania uchwały',
					error: error.message,
					stack: error.stack
				},
				{ status: 500 }
			);
		}
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

	http.get("/api/current-user", () => {
		return HttpResponse.json({
			user: {
				id: 1,
				username: "TEST123",
				name: "Jan Kowalski",
				role: "admin",
				permissions: ["MANAGE_VOTINGS"],
			},
		});
	}),


	http.post("/api/amendments/:id/withdraw", async ({ params, request }) => {
		const amendmentId = Number(params.id);
		const amendment = amendments.find((a) => a.id === amendmentId);

		if (!amendment) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 },
			);
		}


		if (amendment.authorId !== 1) {
			return HttpResponse.json(
				{ message: "Nie masz uprawnień do wycofania tej poprawki" },
				{ status: 403 },
			);
		}


		if (amendment.status === "withdrawn") {
			return HttpResponse.json(
				{ message: "Ta poprawka została już wycofana" },
				{ status: 400 },
			);
		}

		const body = await request.json();


		amendment.status = "withdrawn";
		amendment.withdrawnReason = body.reason || "Wycofane przez autora";

		return HttpResponse.json({
			success: true,
			amendment: amendment,
		});
	}),

	http.post("/api/votings/:id/archive", ({ params }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}


		voting.status = "archived";

		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zarchiwizowane",
		});
	}),

	http.post("/api/votings/:id/activate", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find(v => v.id === votingId);

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 }
			);
		}

		const body = await request.json();


		voting.startTime = body.startTime;
		voting.endTime = body.endTime;
		voting.status = "active";

		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało aktywowane",
			voting: voting
		});
	}),

	http.get("/api/groups", () => {
		return HttpResponse.json([
			{ id: 1, name: "Komisja Oświaty" },
			{ id: 2, name: "Komisja Środowiska" },
			{ id: 3, name: "Komisja Budżetu" },
			{ id: 4, name: "Komisja Regulaminowa" },
			{ id: 5, name: "Komisja Infrastruktury" },
		]);
	}),


	http.get("/api/members", () => {
		return HttpResponse.json([
			{ id: 1, name: "Jan Kowalski", group: "Platforma Obywatelska" },
			{ id: 2, name: "Anna Nowak", group: "Prawo i Sprawiedliwość" },
			{ id: 3, name: "Piotr Wiśniewski", group: "Polska 2050" },
			{ id: 4, name: "Maria Kowalska", group: "Lewica" },
			{ id: 5, name: "Tomasz Zieliński", group: "Konfederacja" },
			{ id: 6, name: "Katarzyna Woźniak", group: "PSL" },
			{ id: 7, name: "Michał Kamiński", group: "Platforma Obywatelska" },
			{ id: 8, name: "Agnieszka Lewandowska", group: "Prawo i Sprawiedliwość" },
		]);
	}),


	http.get("/api/resolutions", () => {
		return HttpResponse.json([
			{ id: 1, title: "Uchwała w sprawie finansowania oświaty" },
			{ id: 2, title: "Uchwała w sprawie ochrony środowiska" },
			{ id: 3, title: "Uchwała w sprawie budżetu na 2026 rok" },
		]);
	}),

	http.get("/api/amendments", () => {

		return HttpResponse.json(amendments);
	}),

	http.get("/api/users", () => {
		return HttpResponse.json(users);
	}),

	http.get("/api/amendments/:id", ({ params }) => {
		const amendmentId = Number(params.id);
		const amendment = amendments.find((a) => a.id === amendmentId);

		if (!amendment) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 }
			);
		}


		const resolution = resolutions.find(r => r.id === amendment.resolutionId);

		return HttpResponse.json({
			data: {
				...amendment,
				resolution: resolution ? {
					id: resolution.id,
					title: resolution.title,
					slug: resolution.slug
				} : null
			}
		});
	}),

	http.put("/api/votings/:id", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find(v => v.id === votingId);

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 }
			);
		}

		const body = await request.json();


		voting.title = body.title;
		voting.description = body.description;
		voting.category = body.category;
		voting.startTime = body.startTime;
		voting.endTime = body.endTime;
		voting.recipientsType = body.recipientsType;
		voting.selectedGroups = body.selectedGroups || [];
		voting.selectedMembers = body.selectedMembers || [];
		voting.tags = body.tags || [];
		voting.linkedItemType = body.linkedItemType;
		voting.linkedItemId = body.linkedItemId;
		voting.applicant = body.applicant;
		managers: body.managers || [];
		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zaktualizowane",
			voting: voting
		});
	}),



	http.get("/api/votings/:id", ({ params }) => {
		const voting = votings.find((v) => v.id === Number(params.id));

		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 }
			);
		}

		return HttpResponse.json(voting);
	}),
];
