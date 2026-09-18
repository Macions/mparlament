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
	if (voting.votingMode === "batch") return;

	if (voting.linkedItemType === "amendment") {
		const amendment = amendments.find(
			(a) => a.id === Number(voting.linkedItemId),
		);

		if (!amendment) return;

		const accepted = voting.votesFor > voting.votesAgainst;
		amendment.status = accepted ? "accepted" : "rejected";

		// ← NOWE: zastosuj zmianę nazwy rozdziału
		if (accepted) {
			const renameChange = amendment.changes?.find(
				(c) => c.type === "rename_chapter",
			);
			if (renameChange && amendment.target?.chapter_id != null) {
				const resolution = resolutions.find(
					(r) => r.id === amendment.resolutionId,
				);
				const chapter = resolution?.chapters?.find(
					(ch) => String(ch.id) === String(amendment.target.chapter_id),
				);
				if (chapter) {
					// Rozbij „Rozdział 1 — Przepisy ogólne" na title/subtitle
					const parts = String(renameChange.after).split(" — ");
					chapter.title = parts[0]?.trim() || renameChange.after;
					if (parts.length > 1) {
						chapter.subtitle = parts.slice(1).join(" — ").trim();
					}
				}
			}
		}
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
	const votingMode = body.votingMode === "batch" ? "batch" : "single";

	return {
		id: Date.now(),
		title: body.title || "",
		description: body.description || "",
		category: body.category || "",

		votingMode,
		questions:
			votingMode === "batch" && Array.isArray(body.questions)
				? body.questions.map((q, idx) => ({
						id: q.id || `q_${Date.now()}_${idx}`,
						text: String(q.text || "").trim(),
						linkedItemType: q.linkedItemType || "none",
						linkedItemId: q.linkedItemId || "",
						resolutionId: q.resolutionId || "",
					}))
				: [],

		startTime: body.startTime || null,
		endTime: body.endTime || null,

		recipientsType: body.recipientsType || "all",
		selectedGroups: body.selectedGroups || [],
		selectedMembers: body.selectedMembers || [],

		// W trybie batch czyścimy pojedyncze powiązanie
		linkedItemType:
			votingMode === "batch" ? "none" : body.linkedItemType || "none",
		linkedItemId: votingMode === "batch" ? "" : body.linkedItemId || "",

		applicant: body.applicant || "",
		managers: body.managers || [],

		quorumRequired: body.quorumRequired ?? 50,
		majorityType: body.majorityType || "simple",
		allowAbstain: body.allowAbstain ?? true,
		isAnonymous: body.isAnonymous ?? false,
		requireComment: body.requireComment ?? false,
		canChangeVote: body.canChangeVote ?? false,
		showResultsDuringVoting: body.showResultsDuringVoting ?? false,
		notifyEmail: body.notifyEmail ?? false,
		notifyPush: body.notifyPush ?? false,

		status: "inactive",
		createdAt: new Date().toISOString(),

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
		article: amendment.target?.article ?? null,
		section_id: amendment.target?.section_id ?? null,
		chapter_id: amendment.target?.chapter_id ?? null, // ← NOWE
		section: amendment.target?.section || "other",
		fragment:
			amendment.target?.fragment || amendment.changes?.[0]?.before || null,
	};
};
const compareAmendments = (amendment1, amendment2) => {
	if (amendment1.resolutionId !== amendment2.resolutionId) {
		return { conflict: false, potential: false, reason: null, fragment: null };
	}

	const target1 = extractTarget(amendment1);
	const target2 = extractTarget(amendment2);

	const sameFragment =
		target1.fragment &&
		target2.fragment &&
		target1.fragment === target2.fragment;
	const sameArticle =
		target1.article && target2.article && target1.article === target2.article;
	const sameSectionId =
		target1.section_id &&
		target2.section_id &&
		target1.section_id === target2.section_id;
	const sameSection =
		target1.section === target2.section && target1.section !== "other";

	// ← NOWE: ten sam rozdział
	const sameChapter =
		target1.chapter_id &&
		target2.chapter_id &&
		String(target1.chapter_id) === String(target2.chapter_id);

	// PRIORYTET 0: ten sam rozdział
	if (sameChapter) {
		const rename1 = amendment1.changes?.find(
			(c) => c.type === "rename_chapter",
		);
		const rename2 = amendment2.changes?.find(
			(c) => c.type === "rename_chapter",
		);

		if (rename1 && rename2) {
			if (rename1.after === rename2.after) {
				return {
					conflict: true,
					potential: false,
					reason: `Ta sama zmiana nazwy rozdziału ${target1.chapter_id}: „${rename1.after}”`,
					fragment: rename1.before || target1.fragment,
				};
			}
			return {
				conflict: true,
				potential: false,
				reason: `Sprzeczna zmiana nazwy rozdziału ${target1.chapter_id}: „${rename1.after}” vs „${rename2.after}”`,
				fragment: rename1.before || target1.fragment,
			};
		}

		return {
			conflict: false,
			potential: true,
			reason: `Obie poprawki dotyczą rozdziału ${target1.chapter_id}`,
			fragment: target1.fragment,
		};
	}
	// PRIORYTET 1: ten sam ustęp — konflikt pewny lub potencjalny
	if (sameArticle && sameSectionId) {
		if (sameFragment) {
			const before1 = amendment1.changes?.[0]?.before || "";
			const before2 = amendment2.changes?.[0]?.before || "";
			const after1 = amendment1.changes?.[0]?.after || "";
			const after2 = amendment2.changes?.[0]?.after || "";

			if (before1 === before2 && after1 !== after2) {
				return {
					conflict: true,
					potential: false,
					reason: `Zmiana tego samego fragmentu w artykule ${target1.article}, ustęp ${target1.section_id}`,
					fragment: target1.fragment,
				};
			}
		}

		return {
			conflict: false,
			potential: true,
			reason: `Poprawki dotyczą tego samego ustępu w artykule ${target1.article}`,
			fragment: `Artykuł ${target1.article}, ustęp ${target1.section_id}`,
		};
	}

	// PRIORYTET 2: ten sam fragment, ale różne ustępy (rzadkie, ale możliwe)
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

	// PRIORYTET 3: ten sam artykuł, ten sam obszar (bez section_id)
	if (sameArticle && sameSection) {
		return {
			conflict: true,
			potential: false,
			reason: `Zmiana tego samego artykułu ${target1.article} w obszarze ${target1.section}`,
			fragment: `Artykuł ${target1.article}`,
		};
	}

	// PRIORYTET 4: ten sam artykuł, różne ustępy → potencjalny
	if (sameArticle) {
		return {
			conflict: false,
			potential: true,
			reason: `Poprawki dotyczą tego samego artykułu ${target1.article}`,
			fragment: `Artykuł ${target1.article}`,
		};
	}

	// PRIORYTET 5: ten sam obszar, różne artykuły → potencjalny
	if (sameSection) {
		return {
			conflict: false,
			potential: true,
			reason: `Poprawki dotyczą tego samego obszaru: ${target1.section}`,
			fragment: `Obszar: ${target1.section}`,
		};
	}

	return { conflict: false, potential: false, reason: null, fragment: null };
};
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

	let currentUserResponse = null;
	if (currentUser) {
		currentUserResponse = {
			hasSigned,
			isAuthor,
			signatureType: isAuthor
				? "author"
				: (getUserSignature(resolution.id, currentUser.id)?.type ?? null),
			isAutoSigned: isAuthor,

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
			currentUser: currentUserResponse,
		}),
	};
};
export const handlers = [
	http.post("/newapp/api/auth/login", async ({ request }) => {
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

	http.get("/newapp/api/auth/me", () => {
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

	http.get("/newapp/api/parliamentarians", () =>
		HttpResponse.json({
			parliamentarians: parliamentarians.filter((p) => p.clubId !== null),
			unaffiliated: parliamentarians.filter((p) => p.clubId === null),
		}),
	),

	http.get("/newapp/api/session/current", () =>
		HttpResponse.json(currentSession),
	),

	http.put("/newapp/api/session/current", async ({ request }) => {
		const body = await request.json();
		Object.assign(currentSession, body);
		return HttpResponse.json(currentSession);
	}),

	http.get("/newapp/api/speakers", () => HttpResponse.json(speakers)),

	http.post("/newapp/api/speakers", async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
	}),

	http.post("/newapp/api/parliamentarians", async ({ request }) => {
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

	http.put("/newapp/api/parliamentarians/:id", async ({ params, request }) => {
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

	http.delete("/newapp/api/parliamentarians/:id", ({ params }) => {
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

	http.get("/newapp/api/clubs", () => HttpResponse.json(clubs)),

	http.post("/newapp/api/clubs", async ({ request }) => {
		const body = await request.json();
		const newClub = { id: Date.now(), ...body, members: [] };
		clubs.push(newClub);
		return HttpResponse.json(newClub, { status: 201 });
	}),

	http.put("/newapp/api/clubs/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();
		const index = clubs.findIndex((c) => c.id === id);
		if (index === -1) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}
		clubs[index] = { ...clubs[index], ...body };
		return HttpResponse.json(clubs[index]);
	}),

	http.delete("/newapp/api/clubs/:id", ({ params }) => {
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

	http.post("/newapp/api/clubs/:id/members", async ({ params, request }) => {
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

	http.delete("/newapp/api/clubs/:id/members/:memberId", ({ params }) => {
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

	http.get("/newapp/api/sessions/current", () =>
		HttpResponse.json(currentSession),
	),
	http.get("/newapp/api/sessions/next", () => {
		const now = Date.now();

		const upcoming = sessions
			.filter((s) => new Date(s.startISO).getTime() > now)
			.sort((a, b) => new Date(a.startISO) - new Date(b.startISO))[0];

		if (!upcoming) return HttpResponse.json(null);

		return HttpResponse.json({
			id: upcoming.id,
			title: upcoming.name,
			start: upcoming.startISO,
			end: upcoming.endISO,
			active: false,
			city: upcoming.city,
		});
	}),
	http.post("/newapp/api/votings", async ({ request }) => {
		let body;
		try {
			body = await request.json();
		} catch {
			return HttpResponse.json(
				{ message: "Nieprawidłowe ciało żądania (nieprawidłowy JSON)" },
				{ status: 400 },
			);
		}

		// walidacja zależna od trybu
		if (body.votingMode === "batch") {
			if (!Array.isArray(body.questions) || body.questions.length === 0) {
				return HttpResponse.json(
					{ message: "Dodaj co najmniej jedno pytanie" },
					{ status: 400 },
				);
			}
			if (body.questions.length > 50) {
				return HttpResponse.json(
					{ message: "Maksymalnie 50 pytań w jednym głosowaniu" },
					{ status: 400 },
				);
			}
			const bad = body.questions.find((q) => !q.text || !String(q.text).trim());
			if (bad) {
				return HttpResponse.json(
					{ message: "Każde pytanie musi mieć treść" },
					{ status: 400 },
				);
			}
		}
		const badLink = body.questions.find(
			(q) => q.linkedItemType === "amendment" && !q.resolutionId,
		);
		if (badLink) {
			return HttpResponse.json(
				{
					message: `Poprawka w pytaniu "${badLink.text}" nie ma wskazanej uchwały`,
				},
				{ status: 400 },
			);
		}
		const newVoting = createVoting(body);
		votings.push(newVoting);
		return HttpResponse.json(newVoting, { status: 201 });
	}),
	http.patch("/newapp/api/votings/:id", async ({ params, request }) => {
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

	http.delete("/newapp/api/votings/:id", ({ params }) => {
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

	http.get("/newapp/api/resolutions", () => HttpResponse.json({ resolutions })),

	http.get("/newapp/api/sessions", () => HttpResponse.json(sessions)),

	http.get("/newapp/api/resolutions/:slug", ({ params }) => {
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

	http.post("/newapp/api/resolutions/:id/sign", ({ params }) => {
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

	http.delete("/newapp/api/resolutions/:id/sign", ({ params }) => {
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

	http.get("/newapp/api/resolutions/:slug/amendments", ({ params }) => {
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

	http.post("/newapp/api/resolutions", async ({ request }) => {
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

	http.get(
		"/newapp/api/resolutions/:slug/amendments/:amendmentId",
		({ params }) => {
			const resolution = resolutions.find((r) => r.slug === params.slug);
			if (!resolution) {
				return HttpResponse.json(
					{ message: "Nie znaleziono uchwały" },
					{ status: 404 },
				);
			}
			const amendment = amendments.find(
				(a) =>
					a.id === Number(params.amendmentId) &&
					a.resolutionId === resolution.id,
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
		},
	),

	http.post(
		"/newapp/api/resolutions/:slug/amendments",
		async ({ params, request }) => {
			const resolution = resolutions.find((r) => r.slug === params.slug);
			if (!resolution) {
				return HttpResponse.json(
					{ message: "Nie znaleziono uchwały" },
					{ status: 404 },
				);
			}
			const body = await request.json();

			// ← NOWE: walidacja celu
			const hasTarget =
				body.target &&
				(body.target.article != null ||
					body.target.section_id != null ||
					body.target.chapter_id != null);
			if (!hasTarget) {
				return HttpResponse.json(
					{
						message:
							"Poprawka musi mieć określony cel (article, section_id lub chapter_id)",
					},
					{ status: 400 },
				);
			}

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
				target: {
					article: body.target?.article ?? null,
					section_id: body.target?.section_id ?? null,
					chapter_id: body.target?.chapter_id ?? null, // ← NOWE
					section: body.target?.section || "other",
					fragment: body.target?.fragment ?? null,
				},
				changes: body.changes || [],
			};
			amendments.push(newAmendment);
			return HttpResponse.json(
				{ success: true, amendment: newAmendment },
				{ status: 201 },
			);
		},
	),

	http.post(
		"/newapp/api/amendments/:id/withdraw",
		async ({ params, request }) => {
			const amendmentId = Number(params.id);
			const amendment = amendments.find((a) => a.id === amendmentId);
			if (!amendment) {
				return HttpResponse.json(
					{ message: "Nie znaleziono poprawki" },
					{ status: 404 },
				);
			}

			const user = getCurrentUser();
			if (!user) {
				return HttpResponse.json(
					{ message: "Nie zalogowany" },
					{ status: 401 },
				);
			}

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
		},
	),

	http.post("/newapp/api/votings/:id/activate", async ({ params, request }) => {
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

	http.get("/newapp/api/groups", () => HttpResponse.json(groups)),

	http.get("/newapp/api/members", () => HttpResponse.json(members)),

	http.get("/newapp/api/users", () => HttpResponse.json(users)),

	http.put("/newapp/api/votings/:id", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);
		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		let body;
		try {
			body = await request.json();
		} catch {
			return HttpResponse.json(
				{ message: "Nieprawidłowe ciało żądania (nieprawidłowy JSON)" },
				{ status: 400 },
			);
		}

		const nextMode =
			body.votingMode === "batch" || body.votingMode === "single"
				? body.votingMode
				: voting.votingMode || "single";

		const nextQuestions =
			nextMode === "batch" && Array.isArray(body.questions)
				? body.questions.map((q, idx) => ({
						id: q.id || `q_${Date.now()}_${idx}`,
						text: String(q.text || "").trim(),
						linkedItemType: q.linkedItemType || "none",
						linkedItemId: q.linkedItemId || "",
						resolutionId: q.resolutionId || "",
					}))
				: nextMode === "batch"
					? voting.questions || []
					: [];

		Object.assign(voting, {
			title: body.title ?? voting.title,
			description: body.description ?? voting.description,
			category: body.category ?? voting.category,

			votingMode: nextMode,
			questions: nextQuestions,

			startTime: body.startTime ?? voting.startTime,
			endTime: body.endTime ?? voting.endTime,

			recipientsType: body.recipientsType ?? voting.recipientsType,
			selectedGroups: body.selectedGroups || voting.selectedGroups || [],
			selectedMembers: body.selectedMembers || voting.selectedMembers || [],

			tags: body.tags || voting.tags || [],

			linkedItemType:
				nextMode === "batch"
					? "none"
					: (body.linkedItemType ?? voting.linkedItemType),
			linkedItemId:
				nextMode === "batch" ? "" : (body.linkedItemId ?? voting.linkedItemId),

			applicant: body.applicant ?? voting.applicant,
			managers: body.managers || voting.managers || [],
		});

		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zaktualizowane",
			voting,
		});
	}),

	http.get("/newapp/api/resolutions/session/:sessionId", ({ params }) => {
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
	http.post(
		"/newapp/api/votings/:id/attachments",
		async ({ params, request }) => {
			const votingId = Number(params.id);
			const voting = votings.find((v) => v.id === votingId);
			if (!voting) {
				return HttpResponse.json(
					{ message: "Nie znaleziono głosowania" },
					{ status: 404 },
				);
			}

			try {
				const formData = await request.formData();
				const files = [];
				for (const [fieldName, value] of formData.entries()) {
					if (value instanceof File) {
						files.push({
							id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
							fieldName,
							name: value.name,
							size: value.size,
							type: value.type,
							uploadedAt: new Date().toISOString(),
						});
					}
				}

				voting.attachments = [...(voting.attachments || []), ...files];

				return HttpResponse.json({
					success: true,
					attachments: voting.attachments,
				});
			} catch (err) {
				return HttpResponse.json(
					{
						message: "Błąd przetwarzania załączników",
						error: err.message,
					},
					{ status: 500 },
				);
			}
		},
	),
	http.post("/newapp/api/votings/:id/archive", ({ params }) => {
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
	http.post("/newapp/api/votings/:id/finish", ({ params }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);

		if (!voting) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		// ustaw koniec na teraz, żeby `getVoteStatus` zwrócił "finished"
		voting.endTime = new Date().toISOString();
		voting.status = "inactive";

		// przelicz wyniki z `votes` (dla single — sumy; dla batch — per pytanie)
		const votingVotes = votes.filter((v) => v.votingId === votingId);

		if (voting.votingMode !== "batch") {
			voting.votesFor = votingVotes.filter((v) => v.vote === "for").length;
			voting.votesAgainst = votingVotes.filter(
				(v) => v.vote === "against",
			).length;
			voting.abstained = votingVotes.filter((v) => v.vote === "abstain").length;
		}

		// zastosuj statusy powiązanych uchwał/poprawek
		updateLinkedItemStatus(voting);

		return HttpResponse.json({
			success: true,
			message: "Głosowanie zostało zakończone",
			voting,
		});
	}),
	http.get("/newapp/api/votings", ({ request }) => {
		const url = new URL(request.url);
		const userId = url.searchParams.get("userId");
		const role = url.searchParams.get("role");

		// console.log("🔍 [HANDLER] GET /newapp/api/votings");
		// console.log("📌 userId:", userId);
		// console.log("📌 role:", role);

		let filteredVotings = [...votings];

		if (userId && role !== "admin") {
			filteredVotings = filteredVotings.filter((vote) => {
				if (vote.recipientsType === "all") return true;
				if (vote.recipientsType === "members") {
					return vote.selectedMembers?.includes(Number(userId));
				}
				if (vote.recipientsType === "groups") {
					const user = users.find((u) => u.id === Number(userId));
					return user && vote.selectedGroups?.includes(user.clubId);
				}
				return false;
			});
		} else {
			// console.log("👑 Admin lub brak userId - zwracam wszystko");
		}

		const votingsWithResults = filteredVotings.map((voting) => {
			const votingVotes = votes.filter((v) => v.votingId === voting.id);

			const isBatch = voting.votingMode === "batch";

			const votesFor = isBatch
				? 0
				: votingVotes.filter((v) => v.vote === "for").length;
			const votesAgainst = isBatch
				? 0
				: votingVotes.filter((v) => v.vote === "against").length;
			const abstained = isBatch
				? 0
				: votingVotes.filter((v) => v.vote === "abstain").length;

			const currentUser = getCurrentUser();
			const userVotes = currentUser
				? votingVotes.filter((v) => v.userId === currentUser.id)
				: [];

			let hasVoted = false;
			let myVote = null;
			let myAnswersCount = 0;

			if (isBatch) {
				const requiredCount = voting.questions?.length || 0;
				myAnswersCount = userVotes.filter((v) => v.questionId).length;
				hasVoted =
					requiredCount > 0 &&
					voting.questions.every((q) =>
						userVotes.some((v) => String(v.questionId) === String(q.id)),
					);
			} else {
				myVote = userVotes[0]?.vote || null;
				hasVoted = !!myVote;
			}

			return {
				...voting,
				votesFor,
				votesAgainst,
				abstained,
				hasVoted,
				myVote,
				myAnswersCount,
				votedCount: votingVotes.length,
			};
		});

		// console.log(
		// 	`\n📊 Zwracam ${votingsWithResults.length} głosowań z wynikami`,
		// );
		return HttpResponse.json(votingsWithResults);
	}),

	// NOWE !!!

	http.put("/newapp/api/speakers/:id", async ({ params, request }) => {
		const id = Number(params.id);
		const body = await request.json();

		const index = speakers.findIndex((s) => s.id === id);
		if (index === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono mówcy" },
				{ status: 404 },
			);
		}

		speakers[index] = { ...speakers[index], ...body };

		return HttpResponse.json(speakers[index], { status: 200 });
	}),

	http.patch("/newapp/api/speakers/:id/status", async ({ params, request }) => {
		const id = Number(params.id);
		const { status } = await request.json();

		const speaker = speakers.find((s) => s.id === id);
		if (!speaker) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		speaker.status = status;
		return HttpResponse.json(speaker);
	}),

	http.delete("/newapp/api/speakers/:id", ({ params }) => {
		const id = Number(params.id);
		const index = speakers.findIndex((s) => s.id === id);
		if (index === -1) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}
		speakers.splice(index, 1);
		return HttpResponse.json({ success: true });
	}),
	http.get("/newapp/api/votings/:id", ({ params }) => {
		const voting = votings.find((v) => v.id === Number(params.id));
		if (!voting) {
			return HttpResponse.json(
				{ message: "Nie znaleziono głosowania" },
				{ status: 404 },
			);
		}

		const votingVotes = votes.filter((v) => v.votingId === voting.id);

		const votesFor = votingVotes.filter((v) => v.vote === "for").length;
		const votesAgainst = votingVotes.filter((v) => v.vote === "against").length;
		const abstained = votingVotes.filter((v) => v.vote === "abstain").length;

		const votedUserIds = votingVotes.map((v) => v.userId);

		const allParliamentarians = parliamentarians.filter(
			(p) => p.clubId !== null,
		);

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

		const eligibleUsers = eligibleIds.map((id) => {
			const p = allParliamentarians.find((m) => m.id === id);
			return {
				id: p?.id || id,
				name: p ? `${p.firstName} ${p.lastName}` : `User ${id}`,
				club: p?.clubName || "",
			};
		});

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

		const currentUser = getCurrentUser();
		const userVotes = currentUser
			? votingVotes.filter((v) => v.userId === currentUser.id)
			: [];

		let myVote = null;
		let myAnswers = null;
		let hasVoted = false;

		if (voting.votingMode === "batch") {
			myAnswers = userVotes
				.filter((v) => v.questionId)
				.map((v) => ({ questionId: v.questionId, vote: v.vote }));

			const requiredCount = voting.questions?.length || 0;
			hasVoted =
				requiredCount > 0 &&
				voting.questions.every((q) =>
					myAnswers.some((a) => String(a.questionId) === String(q.id)),
				);
		} else {
			myVote = userVotes[0]?.vote || null;
			hasVoted = !!myVote;
		}

		// ============================================================
		// BATCH – wyniki per pytanie
		// ============================================================
		let votersPerQuestion = null;

		if (
			voting.votingMode === "batch" &&
			Array.isArray(voting.questions) &&
			!voting.isAnonymous
		) {
			votersPerQuestion = voting.questions.map((q) => {
				const qVotes = votingVotes.filter(
					(v) => String(v.questionId) === String(q.id),
				);

				const voters = eligibleUsers.map((u) => {
					const userVote = qVotes.find((v) => v.userId === u.id);
					return {
						id: u.id,
						name: u.name,
						club: u.club,
						vote: userVote?.vote || null,
					};
				});

				return {
					questionId: q.id,
					voters,
				};
			});
		}
		let resultsPerQuestion = null;

		if (voting.votingMode === "batch" && Array.isArray(voting.questions)) {
			resultsPerQuestion = voting.questions.map((q) => {
				const qVotes = votingVotes.filter(
					(v) => String(v.questionId) === String(q.id),
				);
				const qFor = qVotes.filter((v) => v.vote === "for").length;
				const qAgainst = qVotes.filter((v) => v.vote === "against").length;
				const qAbstain = qVotes.filter((v) => v.vote === "abstain").length;

				let outcome = "tie";
				if (qFor > qAgainst) outcome = "passed";
				else if (qFor < qAgainst) outcome = "rejected";

				return {
					questionId: q.id,
					text: q.text,
					linkedItemType: q.linkedItemType,
					linkedItemId: q.linkedItemId,
					resolutionId: q.resolutionId,
					votesFor: qFor,
					votesAgainst: qAgainst,
					abstained: qAbstain,
					totalVotes: qVotes.length,
					outcome,
				};
			});
		}

		return HttpResponse.json({
			...voting,
			votesFor,
			votesAgainst,
			abstained,
			votedCount: votedUsers.length,
			totalEligible: eligibleUsers.length,
			eligibleUsers,
			votersPerQuestion,
			votedUsers,
			notVotedUsers,
			hasVoted,
			myVote,
			myAnswers,
			resultsPerQuestion, // ← NOWE
		});
	}),
	http.get("/newapp/api/amendments", () => {
		const amendmentsWithConflicts = detectAllConflicts(amendments);
		return HttpResponse.json(amendmentsWithConflicts);
	}),
	http.get("/newapp/api/amendments/:id", ({ params }) => {
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
	http.post("/newapp/api/votings/:id/vote", async ({ params, request }) => {
		const votingId = Number(params.id);
		const voting = votings.find((v) => v.id === votingId);
		if (!voting) {
			return HttpResponse.json({ message: "Nie znaleziono" }, { status: 404 });
		}

		const user = getCurrentUser();
		if (!user) {
			return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
		}

		const body = await request.json();
		const now = Date.now();
		const start = new Date(voting.startTime).getTime();
		const end = new Date(voting.endTime).getTime();

		if (now < start || now >= end || voting.status === "archived") {
			return HttpResponse.json(
				{ message: "Głosowanie nie jest aktywne" },
				{ status: 403 },
			);
		}

		// BATCH
		if (voting.votingMode === "batch" && Array.isArray(body.answers)) {
			// walidacja: każde pytanie musi mieć odpowiedź
			const missing = voting.questions.find(
				(q) => !body.answers.some((a) => String(a.questionId) === String(q.id)),
			);
			if (missing) {
				return HttpResponse.json(
					{ message: `Brak odpowiedzi na pytanie: "${missing.text}"` },
					{ status: 400 },
				);
			}

			// zapis głosów w `votes` (z questionId)
			for (const ans of body.answers) {
				const existing = votes.find(
					(v) =>
						v.votingId === votingId &&
						v.userId === user.id &&
						String(v.questionId) === String(ans.questionId),
				);
				if (existing) {
					existing.vote = ans.vote;
				} else {
					votes.push({
						id: Date.now() + Math.random(),
						votingId,
						questionId: ans.questionId,
						userId: user.id,
						vote: ans.vote,
						timestamp: new Date().toISOString(),
					});
				}
			}

			return HttpResponse.json({
				success: true,
				answers: body.answers,
			});
		}

		// SINGLE – dotychczasowa logika + zapis do votes
		// (u Ciebie mock nie zapisywał do votes, ale dla spójności warto)
		// SINGLE – zapisz (lub zaktualizuj) głos w `votes`
		const existing = votes.find(
			(v) => v.votingId === votingId && v.userId === user.id && !v.questionId,
		);

		if (existing) {
			existing.vote = body.vote;
			existing.timestamp = new Date().toISOString();
		} else {
			votes.push({
				id: Date.now() + Math.random(),
				votingId,
				questionId: null,
				userId: user.id,
				vote: body.vote,
				timestamp: new Date().toISOString(),
			});
		}

		return HttpResponse.json({ success: true, vote: body.vote });
	}),

	http.delete("/newapp/api/resolutions/:id", ({ params }) => {
		const id = Number(params.id);
		const resolutionIndex = resolutions.findIndex((r) => r.id === id);

		if (resolutionIndex === -1) {
			return HttpResponse.json(
				{ message: "Nie znaleziono uchwały" },
				{ status: 404 },
			);
		}

		resolutions.splice(resolutionIndex, 1);

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
	http.get("/newapp/api/current-user", () => {
		const user = getCurrentUser();
		if (user) {
			return HttpResponse.json(user);
		}
		return HttpResponse.json({ message: "Nie zalogowany" }, { status: 401 });
	}),
];
