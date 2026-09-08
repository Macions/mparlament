import { http, HttpResponse } from "msw";

import { users } from "./data/users";
import { votings } from "./data/votings";
import { resolutions } from "./data/resolutions";
import { resolutionSignatures } from "./data/signatures";
import { amendments } from "./data/amendments";
import { parliamentarians } from "./data/parliamentarians";
import { clubs } from "./data/clubs";
import { sessions, currentSession } from "./data/sessions";
import { speakers } from "./data/speakers";
import { groups } from "./data/groups";
import { members } from "./data/members";
import { votes } from "./data/votes";

let currentUser = null;

if (typeof localStorage !== "undefined") {
	const savedUser = localStorage.getItem("msw_current_user");
	if (savedUser) {
		try {
			currentUser = JSON.parse(savedUser);
		} catch (e) {
			currentUser = null;
		}
	}
}

const getResolutionBySlug = (slug) => resolutions.find((r) => r.slug === slug);
const getResolutionById = (id) => resolutions.find((r) => r.id === Number(id));

const getSignaturesForResolution = (resolutionId) =>
	resolutionSignatures.filter(
		(signature) => signature.resolutionId === Number(resolutionId),
	);

const getUserSignature = (resolutionId, userId) =>
	resolutionSignatures.find(
		(signature) =>
			signature.resolutionId === Number(resolutionId) &&
			signature.userId === userId,
	);

const getCurrentUser = () => {
	if (currentUser) return currentUser;
	if (typeof localStorage !== "undefined") {
		const savedUser = localStorage.getItem("msw_current_user");
		if (savedUser) {
			try {
				return JSON.parse(savedUser);
			} catch (e) {
				return null;
			}
		}
	}
	return null;
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

	return { success: true };
};
const updateLinkedItemStatus = (voting) => {
	if (voting.linkedItemType === "amendment") {
		const amendment = amendments.find(
			(a) => a.id === Number(voting.linkedItemId),
		);

		if (!amendment) return;

		amendment.status =
			voting.votesFor > voting.votesAgainst ? "accepted" : "rejected";
	}

	if (voting.linkedItemType === "resolution") {
		const resolution = resolutions.find(
			(r) => r.id === Number(voting.linkedItemId),
		);

		if (!resolution) return;

		resolution.status =
			voting.votesFor > voting.votesAgainst ? "accepted" : "rejected";
	}
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

	return { success: true };
};

const findVotingIndex = (id) => votings.findIndex((v) => v.id === Number(id));

const createVoting = (body) => {
	const user = getCurrentUser();
	return {
		id: Date.now(),
		...body,
		votesFor: 0,
		votesAgainst: 0,
		abstained: 0,
		hasVoted: false,
		myVote: null,
		createdBy: user?.username || "unknown",
	};
};
// NOWE

const extractTarget = (amendment) => {
	return {
		article: amendment.target?.article || null,
		section: amendment.target?.section || "other",
		fragment:
			amendment.target?.fragment || amendment.changes?.[0]?.before || null,
	};
};

const compareAmendments = (amendment1, amendment2) => {
	// Czy dotyczą tego samego dokumentu?
	if (amendment1.resolutionId !== amendment2.resolutionId) {
		return { conflict: false, potential: false, reason: null, fragment: null };
	}

	const target1 = extractTarget(amendment1);
	const target2 = extractTarget(amendment2);

	// Czy dotyczą tego samego fragmentu?
	const sameFragment =
		target1.fragment &&
		target2.fragment &&
		target1.fragment === target2.fragment;
	const sameArticle =
		target1.article && target2.article && target1.article === target2.article;
	const sameSection =
		target1.section === target2.section && target1.section !== "other";

	// KONFLIKT PEWNY - ten sam fragment, różne zmiany
	if (sameFragment) {
		const before1 = amendment1.changes?.[0]?.before || "";
		const before2 = amendment2.changes?.[0]?.before || "";
		const after1 = amendment1.changes?.[0]?.after || "";
		const after2 = amendment2.changes?.[0]?.after || "";

		if (before1 === before2 && after1 !== after2) {
			return {
				conflict: true,
				potential: false,
				reason: `Zmiana tego samego fragmentu artykułu ${target1.article}`,
				fragment: target1.fragment,
			};
		}
	}

	// KONFLIKT PEWNY - ten sam artykuł, ten sam obszar
	if (sameArticle && sameSection) {
		return {
			conflict: true,
			potential: false,
			reason: `Zmiana tego samego artykułu ${target1.article} w obszarze ${target1.section}`,
			fragment: `Artykuł ${target1.article}`,
		};
	}

	// POTENCJALNY KONFLIKT - ten sam obszar, inne artykuły
	if (sameSection && !sameArticle) {
		return {
			conflict: false,
			potential: true,
			reason: `Poprawki dotyczą tego samego obszaru: ${target1.section}`,
			fragment: `Obszar: ${target1.section}`,
		};
	}

	// POTENCJALNY KONFLIKT - ten sam artykuł, inne obszary
	if (sameArticle && !sameSection) {
		return {
			conflict: false,
			potential: true,
			reason: `Poprawki dotyczą tego samego artykułu ${target1.article}`,
			fragment: `Artykuł ${target1.article}`,
		};
	}

	return { conflict: false, potential: false, reason: null, fragment: null };
};

// Wykrywanie konfliktów dla wszystkich poprawek
const detectAllConflicts = (amendmentsList) => {
	const result = amendmentsList.map((amendment) => ({
		...amendment,
		conflictsWith: [],
		potentialConflicts: [],
		conflictReason: null,
		conflictFragment: null,
	}));

	for (let i = 0; i < result.length; i++) {
		for (let j = i + 1; j < result.length; j++) {
			const comparison = compareAmendments(result[i], result[j]);

			if (comparison.conflict) {
				if (!result[i].conflictsWith.includes(result[j].id)) {
					result[i].conflictsWith.push(result[j].id);
					result[i].conflictReason = comparison.reason;
					result[i].conflictFragment = comparison.fragment;
				}
				if (!result[j].conflictsWith.includes(result[i].id)) {
					result[j].conflictsWith.push(result[i].id);
					result[j].conflictReason = comparison.reason;
					result[j].conflictFragment = comparison.fragment;
				}
			} else if (comparison.potential) {
				if (!result[i].potentialConflicts.includes(result[j].id)) {
					result[i].potentialConflicts.push(result[j].id);
				}
				if (!result[j].potentialConflicts.includes(result[i].id)) {
					result[j].potentialConflicts.push(result[i].id);
				}
			}
		}
	}

	return result;
};

// handlers.ts - ZMIEŃ TĘ FUNKCJĘ

const buildResolutionResponse = (resolution, currentUser = null) => {
	const signatures = getSignaturesForResolution(resolution.id);
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

	const isAuthor = currentUser && resolution.authorId === currentUser.id;
	const hasSigned =
		isAuthor || !!getUserSignature(resolution.id, currentUser?.id);

	// ✅ ZBUDUJ OBIEKT currentUser Z ROLĄ
	let currentUserResponse = null;
	if (currentUser) {
		currentUserResponse = {
			hasSigned,
			isAuthor,
			signatureType: isAuthor
				? "author"
				: (getUserSignature(resolution.id, currentUser.id)?.type ?? null),
			isAutoSigned: isAuthor,
			// ✅ DODAJ ROLĘ I ID
			id: currentUser.id,
			role: currentUser.role || currentUser.role_id || "member",
			role_id: currentUser.role_id || null,
			name: currentUser.name || currentUser.username,
			club: currentUser.club || null,
		};
	}

	return {
		resolution: {
			...resolution,
			signatures: signatures.length,
		},
		signedUsers: usersWithSignatures,
		session: {
			city: currentSession?.city,
			date: currentSession?.date || "20.05",
		},
		...(currentUser && {
			currentUser: currentUserResponse, // ✅ UŻYJ NOWEGO OBIEKTU
		}),
	};
};
export const handlers = [
	http.post("/api/auth/login", async ({ request }) => {
		const body = await request.json();
		const foundUser = users.find(
			(u) => u.username === body.username && u.password === body.password,
		);

		if (foundUser) {
			currentUser = foundUser;
			if (typeof localStorage !== "undefined") {
				localStorage.setItem("msw_current_user", JSON.stringify(foundUser));
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
		if (currentUser) return HttpResponse.json(currentUser);
		if (typeof localStorage !== "undefined") {
			const savedUser = localStorage.getItem("msw_current_user");
			if (savedUser) {
				try {
					currentUser = JSON.parse(savedUser);
					return HttpResponse.json(currentUser);
				} catch (e) {}
			}
		}
		return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
	}),

	http.get("/api/parliamentarians", () =>
		HttpResponse.json({
			parliamentarians: parliamentarians.filter((p) => p.clubId !== null),
			unaffiliated: parliamentarians.filter((p) => p.clubId === null),
		}),
	),

	http.get("/api/session/current", () => HttpResponse.json(currentSession)),

	http.put("/api/session/current", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json(body);
	}),

	http.get("/api/speakers", () => HttpResponse.json(speakers)),

	http.post("/api/speakers", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
	}),

	http.post("/api/parliamentarians", async ({ request }) => {
		const body = await request.json();
		const newMember = {
			id: Date.now(),
			...body,
			clubId: body.clubId || null,
			clubName: body.clubId
				? clubs.find((c) => c.id === body.clubId)?.name
				: null,
			clubColor: body.clubId
				? clubs.find((c) => c.id === body.clubId)?.color
				: null,
		};
		parliamentarians.push(newMember);

		if (body.clubId) {
			const club = clubs.find((c) => c.id === body.clubId);
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
		const index = parliamentarians.findIndex((p) => p.id === id);
		if (index === -1) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		const old = parliamentarians[index];
		const updated = { ...old, ...body };

		const oldClub = clubs.find((c) => c.id === old.clubId);
		if (oldClub) {
			oldClub.members = oldClub.members.filter((m) => m.id !== id);
		}

		const newClub = clubs.find((c) => c.id === body.clubId);
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
		const member = parliamentarians.find((p) => p.id === id);
		if (member?.clubId) {
			const club = clubs.find((c) => c.id === member.clubId);
			if (club) {
				club.members = club.members.filter((m) => m.id !== id);
			}
		}
		const index = parliamentarians.findIndex((p) => p.id === id);
		if (index !== -1) {
			parliamentarians.splice(index, 1);
		}
		return HttpResponse.json({ success: true });
	}),

	http.get("/api/clubs", () => HttpResponse.json(clubs)),

	http.post("/api/clubs", async ({ request }) => {
		const body = await request.json();
		const newClub = { id: Date.now(), ...body, members: [] };
		clubs.push(newClub);
		return HttpResponse.json(newClub, { status: 201 });
	}),

	http.put("/api/clubs/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();
		const index = clubs.findIndex((c) => c.id === id);
		if (index === -1) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}
		clubs[index] = { ...clubs[index], ...body };
		return HttpResponse.json(clubs[index]);
	}),

	http.delete("/api/clubs/:id", ({ params }) => {
		const id = Number(params.id);
		const clubIndex = clubs.findIndex((c) => c.id === id);
		if (clubIndex !== -1) {
			clubs.splice(clubIndex, 1);
		}
		parliamentarians.forEach((p) => {
			if (p.clubId === id) {
				p.clubId = null;
				p.clubName = null;
				p.clubColor = null;
			}
		});
		return HttpResponse.json({ success: true });
	}),

	http.post("/api/clubs/:id/members", async ({ params, request }) => {
		const clubId = Number(params.id);
		const { memberId } = await request.json();

		const club = clubs.find((c) => c.id === clubId);
		if (!club) {
			return HttpResponse.json(
				{ message: "Nie znaleziono klubu" },
				{ status: 404 },
			);
		}

		const member = parliamentarians.find((p) => p.id === memberId);
		if (!member) {
			return HttpResponse.json(
				{ message: "Nie znaleziono członka" },
				{ status: 404 },
			);
		}

		if (member.clubId) {
			const oldClub = clubs.find((c) => c.id === member.clubId);
			if (oldClub) {
				oldClub.members = oldClub.members.filter((m) => m.id !== memberId);
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
			club,
			parliamentarians: parliamentarians.filter((p) => p.clubId !== null),
			unaffiliated: parliamentarians.filter((p) => p.clubId === null),
		});
	}),

	http.delete("/api/clubs/:id/members/:memberId", ({ params }) => {
		const clubId = Number(params.id);
		const memberId = Number(params.memberId);

		const club = clubs.find((c) => c.id === clubId);
		if (club) {
			club.members = club.members.filter((m) => m.id !== memberId);
		}

		const member = parliamentarians.find((p) => p.id === memberId);
		if (member) {
			member.clubId = null;
			member.clubName = null;
			member.clubColor = null;
		}

		return HttpResponse.json({
			club,
			parliamentarians: parliamentarians.filter((p) => p.clubId !== null),
			unaffiliated: parliamentarians.filter((p) => p.clubId === null),
		});
	}),

	http.get("/api/sessions/current", () => HttpResponse.json(currentSession)),

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

	http.get("/api/resolutions", () => HttpResponse.json({ resolutions })),

	http.get("/api/sessions", () => HttpResponse.json(sessions)),

	http.get("/api/resolutions/:slug", ({ params }) => {
		const resolution = getResolutionBySlug(params.slug);
		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}
		const user = getCurrentUser();
		return HttpResponse.json(buildResolutionResponse(resolution, user));
	}),

	http.post("/api/resolutions/:id/sign", ({ params }) => {
		const resolution = getResolutionById(params.id);
		if (!resolution) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}
		const user = getCurrentUser();
		if (!user) {
			return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
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
		const user = getCurrentUser();
		if (!user) {
			return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
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
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}
		const billAmendments = amendments.filter(
			(amendment) => amendment.resolutionId === resolution.id,
		);
		return HttpResponse.json({
			resolution: { title: resolution.title, slug: resolution.slug },
			session: {
				city: currentSession?.city,
				date: currentSession?.date,
			},
			amendments: billAmendments,
		});
	}),

	http.post("/api/resolutions", async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get("file");
			const data = JSON.parse(formData.get("data"));

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
				sessionId: data.sessionId,
				signatures: 1,
				status: "pending",
				createdAt: new Date().toISOString().split("T")[0],
				fileInfo: file
					? { name: file.name, size: file.size, type: file.type }
					: null,
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
			return HttpResponse.json(
				{ message: "Błąd przetwarzania uchwały", error: error.message },
				{ status: 500 },
			);
		}
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
			resolution: { title: resolution.title, slug: resolution.slug },
			amendment,
			session: {
				city: currentSession?.city,
				date: currentSession?.date,
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

	http.post("/api/amendments/:id/withdraw", async ({ params, request }) => {
		const amendmentId = Number(params.id);
		const amendment = amendments.find((a) => a.id === amendmentId);
		if (!amendment) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 },
			);
		}

		// ✅ Pobierz zalogowanego użytkownika
		const user = getCurrentUser();
		if (!user) {
			return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
		}

		// ✅ Sprawdź czy zalogowany użytkownik jest autorem poprawki
		if (amendment.authorId !== user.id) {
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
		return HttpResponse.json({ success: true, amendment });
	}),

	http.post("/api/votings/:id/activate", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);
		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}
		const body = await request.json();
		voting.startTime = body.startTime;
		voting.endTime = body.endTime;
		voting.status = "active";
		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało aktywowane",
			voting,
		});
	}),

	http.get("/api/groups", () => HttpResponse.json(groups)),

	http.get("/api/members", () => HttpResponse.json(members)),

	http.get("/api/users", () => HttpResponse.json(users)),

	http.put("/api/votings/:id", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);
		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}
		const body = await request.json();
		Object.assign(voting, {
			title: body.title,
			description: body.description,
			category: body.category,
			startTime: body.startTime,
			endTime: body.endTime,
			recipientsType: body.recipientsType,
			selectedGroups: body.selectedGroups || [],
			selectedMembers: body.selectedMembers || [],
			tags: body.tags || [],
			linkedItemType: body.linkedItemType,
			linkedItemId: body.linkedItemId,
			applicant: body.applicant,
			managers: body.managers || [],
		});
		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zaktualizowane",
			voting,
		});
	}),

	http.get("/api/resolutions/session/:sessionId", ({ params }) => {
		const sessionId = Number(params.sessionId);
		const sessionResolutions = resolutions.filter(
			(r) => r.sessionId === sessionId,
		);
		return HttpResponse.json({
			resolutions: sessionResolutions,
			sessionId,
			count: sessionResolutions.length,
		});
	}),

	http.get("/finalizuj-uchwale/:sessionId", () =>
		HttpResponse.json({ message: "Strona finalizacji" }),
	),
	http.post("/api/votings/:id/archive", ({ params }) => {
		const votingId = Number(params.id);

		const voting = votings.find((v) => v.id === votingId);

		if (!voting) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		voting.status = "archived";

		updateLinkedItemStatus(voting);

		return HttpResponse.json({
			success: true,
			voting,
		});
	}),
	http.get("/api/votings", ({ request }) => {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");
		const role = url.searchParams.get("role");

		console.log("🔍 [HANDLER] GET /api/votings");
		console.log("📌 userId:", userId);
		console.log("📌 role:", role);

		let filteredVotings = [...votings];

		// Jeśli userId jest podany i rola to NIE admin
		if (userId && role !== "admin") {
			console.log("🔄 Filtruję dla usera:", userId);

			filteredVotings = filteredVotings.filter((vote) => {
				// ... reszta filtrowania (to co już masz)
			});
		} else {
			console.log("👑 Admin lub brak userId - zwracam wszystko");
		}

		// DODAJ OBLICZANIE GŁOSÓW DLA KAŻDEGO GŁOSOWANIA
		const votingsWithResults = filteredVotings.map((voting) => {
			// Pobierz głosy dla tego głosowania
			const votingVotes = votes.filter((v) => v.votingId === voting.id);

			// Oblicz liczby
			const votesFor = votingVotes.filter((v) => v.vote === "for").length;
			const votesAgainst = votingVotes.filter(
				(v) => v.vote === "against",
			).length;
			const abstained = votingVotes.filter(
				(v) => v.vote === "abstained",
			).length;

			// Sprawdź czy obecny user głosował
			const currentUser = getCurrentUser();
			const userVote = votingVotes.find((v) => v.userId === currentUser?.id);
			const hasVoted = !!userVote;
			const myVote = userVote?.vote || null;

			return {
				...voting,
				votesFor,
				votesAgainst,
				abstained,
				hasVoted,
				myVote,
				votedCount: votingVotes.length,
			};
		});

		console.log(
			`\n📊 Zwracam ${votingsWithResults.length} głosowań z wynikami`,
		);
		return HttpResponse.json(votingsWithResults);
	}),

	// NOWE !!!

	http.put("/api/speakers/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();

		// Znajdź mówcę po ID
		const index = speakers.findIndex((s) => s.id === id);
		if (index === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono mówcy" },
				{ status: 404 },
			);
		}

		// Zaktualizuj mówcę
		speakers[index] = { ...speakers[index], ...body };

		return HttpResponse.json(speakers[index], { status: 200 });
	}),

	// Aktualizacja statusu mówcy (done/active/waiting)
	http.patch("/api/speakers/:id/status", async ({ params, request }) => {
		const id = Number(params.id);
		const { status } = await request.json();

		const speaker = speakers.find((s) => s.id === id);
		if (!speaker) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		speaker.status = status;
		return HttpResponse.json(speaker);
	}),

	// Usuwanie mówcy
	http.delete("/api/speakers/:id", ({ params }) => {
		const id = Number(params.id);
		const index = speakers.findIndex((s) => s.id === id);
		if (index === -1) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}
		speakers.splice(index, 1);
		return HttpResponse.json({ success: true });
	}),
	http.get("/api/votings/:id", ({ params }) => {
		const voting = votings.find((v) => v.id === Number(params.id));
		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		// Pobierz głosy dla tego głosowania
		const votingVotes = votes.filter((v) => v.votingId === voting.id);

		// OBLICZ ILE ZA, PRZECIW, WSTRZYMUJĄCYCH
		const votesFor = votingVotes.filter((v) => v.vote === "for").length;
		const votesAgainst = votingVotes.filter((v) => v.vote === "against").length;
		const abstained = votingVotes.filter((v) => v.vote === "abstain").length;

		const votedUserIds = votingVotes.map((v) => v.userId);

		// Pobierz wszystkich parlamentarzystów
		const allParliamentarians = parliamentarians.filter(
			(p) => p.clubId !== null,
		);

		// Określ uprawnionych
		let eligibleIds = [];
		if (voting.recipientsType === "all") {
			eligibleIds = allParliamentarians.map((p) => p.id);
		} else if (voting.recipientsType === "members") {
			eligibleIds = voting.selectedMembers || [];
		} else if (voting.recipientsType === "groups") {
			eligibleIds = allParliamentarians
				.filter((p) => voting.selectedGroups?.includes(p.clubId))
				.map((p) => p.id);
		}

		// Mapuj na obiekty z danymi
		const eligibleUsers = eligibleIds.map((id) => {
			const p = allParliamentarians.find((m) => m.id === id);
			return {
				id: p?.id || id,
				name: p ? `${p.firstName} ${p.lastName}` : `User ${id}`,
				club: p?.clubName || "",
			};
		});

		// DODAJ pole 'vote' do votedUsers
		const votedUsers = eligibleUsers
			.filter((u) => votedUserIds.includes(u.id))
			.map((u) => {
				const vote = votingVotes.find((v) => v.userId === u.id);
				return {
					...u,
					vote: vote?.vote || null,
				};
			});

		const notVotedUsers = eligibleUsers.filter(
			(u) => !votedUserIds.includes(u.id),
		);

		// Sprawdź czy obecny user głosował
		const currentUser = getCurrentUser();
		const myVote =
			votingVotes.find((v) => v.userId === currentUser?.id)?.vote || null;
		const hasVoted = !!myVote;

		return HttpResponse.json({
			...voting,
			votesFor: votesFor,
			votesAgainst: votesAgainst,
			abstained: abstained,
			votedCount: votedUsers.length,
			totalEligible: eligibleUsers.length,
			eligibleUsers,
			votedUsers,
			notVotedUsers,
			hasVoted: hasVoted,
			myVote: myVote,
		});
	}),
	http.get("/api/amendments", () => {
		const amendmentsWithConflicts = detectAllConflicts(amendments);
		return HttpResponse.json(amendmentsWithConflicts);
	}),
	http.get("/api/amendments/:id", ({ params }) => {
		const allWithConflicts = detectAllConflicts(amendments);
		const result = allWithConflicts.find((a) => a.id === Number(params.id));

		if (!result) {
			return HttpResponse.json(
				{ message: "Nie znaleziono poprawki" },
				{ status: 404 },
			);
		}

		return HttpResponse.json(result);
	}),
	http.post("/api/votings/:id/vote", async ({ request }) => {
		const body = await request.json();
		const { amendmentId, vote, userVotes } = body;

		if (vote === "for") {
			const allWithConflicts = detectAllConflicts(amendments);
			const amendment = allWithConflicts.find((a) => a.id === amendmentId);

			if (amendment?.conflictsWith?.length > 0) {
				const hasConflict = amendment.conflictsWith.some((id) =>
					userVotes?.some((v) => v.amendmentId === id && v.vote === "for"),
				);

				if (hasConflict) {
					return HttpResponse.json(
						{
							success: false,
							message:
								"Nie możesz głosować ZA tą poprawką, ponieważ jest sprzeczna z inną poprawką, którą poparłeś.",
							conflictsWith: amendment.conflictsWith,
							conflictReason: amendment.conflictReason,
							conflictFragment: amendment.conflictFragment,
						},
						{ status: 409 },
					);
				}
			}
		}

		return HttpResponse.json({ success: true, vote: body.vote });
	}),
	// ===== USUWANIE UCHWAŁY (DELETE) =====
	http.delete("/api/resolutions/:id", ({ params }) => {
		const id = Number(params.id);
		const resolutionIndex = resolutions.findIndex((r) => r.id === id);

		if (resolutionIndex === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		// Usuń uchwałę z listy
		resolutions.splice(resolutionIndex, 1);

		// Usuń wszystkie podpisy powiązane z tą uchwałą
		const signatureIndices = resolutionSignatures
			.map((s, index) => (s.resolutionId === id ? index : -1))
			.filter((index) => index !== -1)
			.sort((a, b) => b - a);

		for (const index of signatureIndices) {
			resolutionSignatures.splice(index, 1);
		}

		return HttpResponse.json(
			{ success: true, message: "Uchwała została usunięta" },
			{ status: 200 },
		);
	}),
	http.get("/api/current-user", () => {
	const user = getCurrentUser();
	if (user) {
		// Zwróć samo dane użytkownika, bez zagnieżdżania
		return HttpResponse.json(user);
	}
	return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
}),
];
