import mammoth from "mammoth";

export async function parseDocx(file) {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const result = await mammoth.convertToHtml({ arrayBuffer });
		console.log("=== SUROWY HTML ===");
		console.log(result.value);
		console.log("=== KONIEC HTML ===");
		const blocks = htmlToBlocks(result.value);
		return parse(blocks);
	} catch (err) {
		console.error("Błąd parsowania DOCX:", err);
		throw new Error("Nie udało się sparsować pliku DOCX: " + err.message);
	}
}

/* ─────────────────────────────────────────────────────────────
   POMOCNICZE — markery z linii
   ───────────────────────────────────────────────────────────── */

// "1)" / "1." / "a)" / "a." / "i)" — zachowuje oryginalny format
function extractMarker(line) {
	const t = (line || "").trim();
	if (!t) return null;

	// "1) treść"
	let m = t.match(/^(\d+)\)\s+(.+)$/s);
	if (m) return { marker: `${m[1]})`, text: m[2].trim(), rawType: "num-paren" };

	// "1. treść"
	// "1. treść"
	m = t.match(/^(\d+)\.\s+(.+)$/s);
	if (m) return { marker: `${m[1]}.`, text: m[2].trim(), rawType: "num-dot" };

	// "1.Treść" (bez spacji po kropce, np. "2.Wnioskuje się...")
	m = t.match(/^(\d+)\.([A-ZĄĆĘŁŃÓŚŹŻ].+)$/s);
	if (m) return { marker: `${m[1]}.`, text: m[2].trim(), rawType: "num-dot" };

	// "1 treść" (bez kropki, np. Art. 34 — "1 Postuluje się...")
	m = t.match(/^(\d+)\s+([A-ZĄĆĘŁŃÓŚŹŻ].+)$/s);
	if (m) return { marker: `${m[1]}.`, text: m[2].trim(), rawType: "num-dot" };

	// "a) treść"
	m = t.match(/^([a-z])\)\s+(.+)$/s);
	if (m) return { marker: `${m[1]})`, text: m[2].trim(), rawType: "let-paren" };

	// "a. treść"
	m = t.match(/^([a-z])\.\s+(.+)$/s);
	if (m) return { marker: `${m[1]}.`, text: m[2].trim(), rawType: "let-dot" };

	// "i) treść" / "ii) treść" / "iii) treść"
	m = t.match(/^([ivxlcdm]+)\)\s+(.+)$/i);
	if (m) return { marker: `${m[1]})`, text: m[2].trim(), rawType: "roman" };

	return null;
}

// Wykrywa "2. 3. treść" (Art. 28) → zwraca marker "3." i treść
function extractDoubleMarker(line) {
	const m = (line || "").trim().match(/^(\d+)\.\s+(\d+)\.\s+(.+)$/s);
	if (!m) return null;
	return { marker: `${m[2]}.`, text: m[3].trim() };
}

/* ─────────────────────────────────────────────────────────────
   NOWELIZACJA — rozpoznawanie markerów
   ───────────────────────────────────────────────────────────── */

const RE_POSTULUJE_NOWELIZACJE =
	/^Postuluje się nowelizację następujących przepisów:/i;
const RE_NOWEL_ART_BRZMIENIE = /^art\.\s*\d+[a-z]?\s+otrzymuje brzmienie:/i;
const RE_NOWEL_UCHYLA_UST = /^uchyla się ust\.\s*[\d\s,i]+w art\.\s*\d+/i;
const RE_NOWEL_UCHYLA_SAMO = /^uchyla się:\s*$/i;
const RE_NOWEL_W_ART_UCHYLA = /^W art\.\s*\d+\s+uchyla się/i;
const RE_NOWEL_ART_SREDNIK = /^art\.\s*\d+[a-z]?;\s*$/i;
const RE_NOWEL_ART_KROPKA = /^art\.\s*\d+[a-z]?\.\s*$/i;

function detectNowelizacjaMarker(line, ctx) {
	const t = (line || "").trim();
	if (!t) return null;

	if (RE_POSTULUJE_NOWELIZACJE.test(t)) {
		ctx.nowelCounter = 1;
		ctx.subCounter = 0;
		ctx.inUchyla = false;
		return { marker: `${ctx.topCounter++}.`, level: 1 };
	}
	if (RE_NOWEL_ART_BRZMIENIE.test(t)) {
		ctx.subCounter = 0;
		ctx.inUchyla = false;
		return { marker: `${ctx.nowelCounter++})`, level: 2 };
	}
	if (RE_NOWEL_UCHYLA_UST.test(t)) {
		ctx.subCounter = 0;
		ctx.inUchyla = false;
		return { marker: `${ctx.nowelCounter++})`, level: 2 };
	}
	if (RE_NOWEL_UCHYLA_SAMO.test(t)) {
		ctx.subCounter = 0;
		ctx.inUchyla = true;
		return { marker: `${ctx.nowelCounter++})`, level: 2 };
	}
	if (RE_NOWEL_W_ART_UCHYLA.test(t)) {
		ctx.subCounter = 0;
		ctx.inUchyla = false;
		return { marker: `${ctx.nowelCounter++})`, level: 2 };
	}
	if (ctx.inUchyla && RE_NOWEL_ART_SREDNIK.test(t)) {
		return { marker: `${++ctx.subCounter})`, level: 3 };
	}
	if (ctx.inUchyla && RE_NOWEL_ART_KROPKA.test(t)) {
		return { marker: `${++ctx.subCounter})`, level: 3 };
	}
	return null;
}

/* ─────────────────────────────────────────────────────────────
   PARSOWANIE HTML → BLOKI
   ───────────────────────────────────────────────────────────── */

function htmlToBlocks(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;
	const blocks = [];

	function pushText(type, text, extra = {}) {
		if (!text) return;
		const parts = text.split(/\r?\n/);
		for (const part of parts) {
			const cleaned = part
				.replace(/^[ \t]+/, "")
				.replace(/[ \t\r]+$/, "")
				.replace(/^[\u200B\u200C\u200D\uFEFF]+/, "")
				.replace(/[\u200B\u200C\u200D\uFEFF]+$/, "");
			if (cleaned)
				blocks.push({ type, text: cleaned, html: cleaned, ...extra });
		}
	}

	function replaceBrWithNewline(el) {
		el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
	}

	function roman(num) {
		if (num <= 0 || num > 3999) return String(num);
		const map = [
			[1000, "M"],
			[900, "CM"],
			[500, "D"],
			[400, "CD"],
			[100, "C"],
			[90, "XC"],
			[50, "L"],
			[40, "XL"],
			[10, "X"],
			[9, "IX"],
			[5, "V"],
			[4, "IV"],
			[1, "I"],
		];
		let res = "";
		for (const [v, s] of map) {
			while (num >= v) {
				res += s;
				num -= v;
			}
		}
		return res;
	}

	function formatMarker(idx, type) {
		switch (type) {
			case "a":
				return String.fromCharCode(96 + idx) + ")";
			case "A":
				return String.fromCharCode(64 + idx) + ")";
			case "i":
				return roman(idx).toLowerCase() + ".";
			case "I":
				return roman(idx) + ".";
			default:
				return idx + ".";
		}
	}

	function parseLineMarker(line) {
		const mArt = line.match(
			/^(Art|ART)\.?\s*(\d+(?:\.\d+)*[a-z]*)[\.\s]*(.*)$/,
		);
		if (mArt) {
			return { kind: "art", artNumber: `Art. ${mArt[2]}`, rest: mArt[3] || "" };
		}
		const extracted = extractMarker(line);
		if (extracted) {
			return {
				kind: "marker",
				marker: extracted.marker,
				text: extracted.text,
				rawType: extracted.rawType,
			};
		}
		return null;
	}

	function walkList(listEl, level) {
		const ordered = listEl.tagName?.toLowerCase() === "ol";
		const items = listEl.querySelectorAll(":scope > li");
		let counter = 0;
		const start = Number(listEl.getAttribute("start")) || 1;
		const type = listEl.getAttribute("type") || "1";

		for (const li of items) {
			counter++;
			const nested = Array.from(
				li.querySelectorAll(":scope > ul, :scope > ol"),
			);
			const clone = li.cloneNode(true);
			clone.querySelectorAll("ul, ol").forEach((nl) => nl.remove());
			replaceBrWithNewline(clone);

			const text = (clone.textContent || "").trim();
			const lines = text
				.split(/\n/)
				.map((l) => l.trim())
				.filter(Boolean);

			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				const lineText = lines[lineIdx];
				const extracted = extractMarker(lineText);

				if (extracted) {
					pushText("list-item", extracted.text, {
						ordered,
						marker: extracted.marker,
						rawType: extracted.rawType,
						level: lineIdx === 0 ? level : level + 1,
						fromList: true,
					});
				} else if (lineIdx === 0) {
					const marker = ordered
						? formatMarker(start + counter - 1, type)
						: "–";
					pushText("list-item", lineText, {
						ordered,
						marker,
						level,
						fromList: true,
					});
				} else {
					pushText("list-item", lineText, {
						ordered,
						marker: null,
						level: level + 1,
						fromList: true,
					});
				}
			}
			for (const nl of nested) walkList(nl, level + 1);
		}
	}

	function handleParagraphLine(rawText, rawHtml) {
		const text = (rawText || "").trim();
		if (!text) return;

		// 0) Rozbij linię na wiele markerów — obsługa "1.Treść 2.Treść" i "1. Treść 2. Treść"
		const subParts = text.split(
			/(?<=[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ;:,.)])\s+(?=\d+[a-z]?\.(?=[A-ZĄĆĘŁŃÓŚŹŻ])|\d+[a-z]?\.\s|\d+[a-z]?\)\s|[a-z]\)\s)/,
		);
		if (subParts.length > 1) {
			for (const part of subParts) {
				handleParagraphLine(part.trim(), rawHtml);
			}
			return;
		}

		// 1) Sprawdź Art.
		const mArt = text.match(/^(Art|ART)\.?\s*(\d+(?:\.\d+)*[a-z]*)\.?\s*(.*)$/);
		if (mArt) {
			pushText("paragraph", `${`Art. ${mArt[2]}`} ${mArt[3] || ""}`.trim());
			return;
		}

		// 2) "2. 3. treść" → normalizuj do "3. treść"
		const dbl = extractDoubleMarker(text);
		if (dbl) {
			pushText("list-item", dbl.text, {
				ordered: true,
				marker: dbl.marker,
				rawType: "num-dot",
				level: 1,
				fromParagraph: true,
			});
			return;
		}

		// 3) Zwykły marker z linii
		const extracted = extractMarker(text);
		if (extracted) {
			let level = 1;
			if (extracted.rawType === "num-paren") level = 2;
			else if (
				extracted.rawType === "let-paren" ||
				extracted.rawType === "let-dot" ||
				extracted.rawType === "roman"
			)
				level = 3;
			else level = 1;

			pushText("list-item", extracted.text, {
				ordered: true,
				marker: extracted.marker,
				rawType: extracted.rawType,
				level,
				fromParagraph: true,
			});
			return;
		}

		pushText("paragraph", text, { html: rawHtml });
	}

	function walk(element) {
		for (const child of element.children) {
			const tag = child.tagName?.toLowerCase();

			if (tag === "div" && child.children.length === 0) {
				pushText("paragraph", child.textContent || "");
				continue;
			}
			if (tag === "p" || /^h[1-6]$/.test(tag)) {
				const rawHtml = child.innerHTML || "";
				replaceBrWithNewline(child);
				const rawText = child.textContent || "";

				if (!tag.startsWith("h")) {
					const lines = rawText
						.split(/\n/)
						.map((l) => l.trim())
						.filter(Boolean);
					if (lines.length > 1) {
						const merged = [];
						for (const line of lines) {
							const isMarker =
								!!extractMarker(line) || !!extractDoubleMarker(line);
							if (!isMarker && merged.length > 0) {
								merged[merged.length - 1] += " " + line;
							} else {
								merged.push(line);
							}
						}
						for (const line of merged) handleParagraphLine(line, rawHtml);
						continue;
					}
					handleParagraphLine(rawText, rawHtml);
					continue;
				}
				pushText("heading", rawText, {
					headingLevel: Number(tag[1]),
					html: rawHtml,
				});
				continue;
			}
			if (tag === "ul" || tag === "ol") {
				walkList(child, 1);
				continue;
			}
			if (tag === "table") {
				const rows = child.querySelectorAll("tr");
				for (const row of rows) {
					const cells = row.querySelectorAll("td, th");
					const rowText = Array.from(cells)
						.map((c) => (c.textContent || "").trim())
						.join(" | ");
					pushText("table-row", rowText);
				}
				continue;
			}
			walk(child);
		}
	}

	walk(body);
	return blocks;
}

/* ─────────────────────────────────────────────────────────────
   POMOCNICZE
   ───────────────────────────────────────────────────────────── */

const RE_CHAPTER = /^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+[a-z]?[\.\s–-]/i;
const RE_ART = /^(Art|ART)\.?\s*\d+(?:\.\d+)*[a-z]*\.?/;
const RE_CHAPTER_ANYWHERE = /^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i;
const RE_ART_ANYWHERE = /^(Art|ART)\.?\s*\d+/;

/* ─────────────────────────────────────────────────────────────
   GŁÓWNY PARSER
   ───────────────────────────────────────────────────────────── */

function parse(blocks) {
	if (blocks.length === 0) {
		return { title: "Dokument bez tytułu", preamble: "", chapters: [] };
	}

	// ─────────────────────────────────────────────
	// 1) MERGE
	// ─────────────────────────────────────────────
	const mergedBlocks = [];
	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i];
		const next = blocks[i + 1];
		const bTrim = (b.text || "").trim();
		const nextTrim = (next?.text || "").trim();

		// "Art." + "2. Głównymi celami..."  →  "Art. 2. Głównymi celami..."
		if (
			bTrim &&
			/^(Art|ART)\.?$/.test(bTrim) &&
			next &&
			/^\d+[a-z]?[.)]\s/.test(nextTrim)
		) {
			mergedBlocks.push({ ...b, text: `Art. ${nextTrim}` });
			i++;
			continue;
		}

		// "Art." + "2. Głównymi celami..." — wariant z pustym "Art." jako osobnym blokiem
		// (gdy edytor zapisał Art. i treść jako dwa oddzielne bloki)
		if (
			bTrim &&
			/^(Art|ART)\.?$/.test(bTrim) &&
			next &&
			/^\d+[a-z]?[.)]/.test(nextTrim) &&
			!/^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(nextTrim)
		) {
			mergedBlocks.push({ ...b, text: `Art. ${nextTrim}` });
			i++;
			continue;
		}
		if (
			bTrim &&
			/^(Art|ART)\.?\s*\d+(?:\.\d+)*[a-z]*\.$/.test(bTrim) &&
			next &&
			!/^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(nextTrim)
		) {
			mergedBlocks.push({ ...b, text: `${bTrim} ${nextTrim}` });
			i++;
			continue;
		}
		if (
			bTrim &&
			/^\d+[a-z]?\.$/.test(bTrim) &&
			next &&
			/^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(nextTrim)
		) {
			mergedBlocks.push({ ...b, text: `${bTrim} ${nextTrim}` });
			i++;
			continue;
		}
		mergedBlocks.push(b);
	}

	// ─────────────────────────────────────────────
	// 2) SPLIT
	// ─────────────────────────────────────────────
	const splitBlocks = [];
	for (const b of mergedBlocks) {
		const text = (b.text || "").trim();
		if (!text) {
			splitBlocks.push(b);
			continue;
		}
		if (RE_CHAPTER.test(text) || RE_ART.test(text)) {
			splitBlocks.push(b);
			continue;
		}
		const parts = text.split(
			/(?<=[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ;:,.)])\s+(?=\d+[a-z]?[.)]\s|[a-z]\)\s|\d+[a-z]?\.(?=[A-ZĄĆĘŁŃÓŚŹŻ]))/,
		);
		if (parts.length > 1) {
			const filtered = parts
				.map((p) => p.trim())
				.filter(Boolean)
				.map((p) => ({ ...b, text: p }));
			if (
				filtered.length > 1 &&
				filtered.every((f) => !RE_CHAPTER.test(f.text) && !RE_ART.test(f.text))
			) {
				splitBlocks.push(...filtered);
				continue;
			}
		}
		splitBlocks.push(b);
	}
	blocks = splitBlocks;

	// ─────────────────────────────────────────────
	// 3) NAGŁÓWEK
	// ─────────────────────────────────────────────
	const isStructural = (b) =>
		(b.type === "paragraph" ||
			b.type === "heading" ||
			b.type === "list-item") &&
		(RE_CHAPTER_ANYWHERE.test(b.text || "") ||
			RE_ART_ANYWHERE.test(b.text || ""));

	let firstStructuralIndex = blocks.findIndex(isStructural);
	if (firstStructuralIndex === -1) firstStructuralIndex = blocks.length;

	const headerBlocks = blocks.slice(0, firstStructuralIndex);

	const preambleStart = headerBlocks
		.slice(0, 20)
		.findIndex(
			(b) =>
				/^My,/.test(b.text) ||
				/^Preambuła$/i.test(b.text) ||
				/uchwalamy/i.test(b.text) ||
				/w trosce o/i.test(b.text) ||
				/uznając, że/i.test(b.text) ||
				/^Parlament Młodych/i.test(b.text) ||
				/^Parlamentarzyści/i.test(b.text) ||
				/^Parlamentarzystki/i.test(b.text) ||
				/świadomy bezprecedensowych/i.test(b.text) ||
				/mając na uwadze/i.test(b.text) ||
				/dostrzegając, że/i.test(b.text),
		);

	let title;
	let preamble = "";
	if (preambleStart > 0) {
		title = headerBlocks
			.slice(0, preambleStart)
			.map((b) => b.text)
			.join("\n");
		preamble = headerBlocks
			.slice(preambleStart)
			.filter((b) => !/^Preambuła$/i.test(b.text.trim()))
			.map((b) => b.text)
			.join("\n");
	} else if (preambleStart === 0) {
		title = "Dokument bez tytułu";
		preamble = headerBlocks
			.filter((b) => !/^Preambuła$/i.test(b.text.trim()))
			.map((b) => b.text)
			.join("\n");
	} else {
		title = headerBlocks.map((b) => b.text).join("\n") || "Dokument bez tytułu";
	}

	// ─────────────────────────────────────────────
	// 4) GŁÓWNA PĘTLA
	// ─────────────────────────────────────────────
	const chapters = [];
	let currentChapter = null;
	let currentArticle = null;
	let chapterIndex = 0;
	let articleIndex = 0;
	let insideQuote = false;

	const nowelCtx = {
		topCounter: 1,
		nowelCounter: 1,
		subCounter: 0,
		inUchyla: false,
	};
	const resetNowelCtx = () => {
		nowelCtx.topCounter = 1;
		nowelCtx.nowelCounter = 1;
		nowelCtx.subCounter = 0;
		nowelCtx.inUchyla = false;
	};

	const flushArticle = () => {
		if (!currentArticle) return;
		if (currentArticle.contentLines.length === 0 && currentChapter) {
			const idx = currentChapter.articles.indexOf(currentArticle);
			if (idx !== -1) currentChapter.articles.splice(idx, 1);
		}
		currentArticle.content = currentArticle.contentLines
			.map((l) => {
				if (typeof l === "string") return l;
				if (!l) return "";
				return l.marker ? `${l.marker} ${l.text}` : l.text || "";
			})
			.join("\n");
		currentArticle = null;
	};

	const ensureChapter = () => {
		if (!currentChapter) {
			currentChapter = {
				id: "ch_0",
				title: "Przepisy wstępne",
				subtitle: "",
				articles: [],
			};
			chapters.push(currentChapter);
		}
		return currentChapter;
	};

	const blockToLine = (b) => {
		if (b.type === "list-item") {
			return {
				marker: b.marker,
				text: b.text,
				level: b.level || 1,
				type: "list-item",
				fromList: b.fromList === true,
				fromParagraph: b.fromParagraph === true,
			};
		}
		return {
			marker: null,
			text: b.text,
			level: 1,
			type: b.type || "paragraph",
		};
	};

	for (let k = firstStructuralIndex; k < blocks.length; k++) {
		const block = blocks[k];
		const line = (block.text || "")
			.replace(/^[\u200B\u200C\u200D\uFEFF]+/, "")
			.replace(/[\u200B\u200C\u200D\uFEFF]+$/, "");
		if (/^\d+[.)]\s*$/.test(line) || /^\s*\.\s*$/.test(line)) continue;

		const startsWithStructural =
			RE_CHAPTER_ANYWHERE.test(line) || RE_ART_ANYWHERE.test(line);

		if (
			!startsWithStructural &&
			/[:]\s*$/.test(line) &&
			/(w brzmieniu|następujące zmiany|następująco|uchyla się|zmienia się)/i.test(
				line,
			)
		) {
			insideQuote = true;
		}
		if (
			/[""„”'']\s*[;.]?\s*$/.test(line) ||
			/[""„”'']\s*[;.](?:\s|$)/.test(line)
		) {
			insideQuote = false;
		}

		// ─── Rozdział ───
		if (
			(block.type === "paragraph" ||
				block.type === "heading" ||
				block.type === "list-item") &&
			RE_CHAPTER_ANYWHERE.test(line)
		) {
			if (insideQuote && currentArticle) {
				currentArticle.contentLines.push(blockToLine(block));
				continue;
			}
			flushArticle();
			insideQuote = false;
			chapterIndex++;

			let chapterTitle = line.replace(/[\.\s–-]+$/, "").trim();
			let chapterSubtitle = "";

			const next = blocks[k + 1];
			if (
				!insideQuote &&
				next &&
				(next.type === "paragraph" || next.type === "heading") &&
				!RE_CHAPTER_ANYWHERE.test(next.text) &&
				!RE_ART_ANYWHERE.test(next.text) &&
				!/^Załącznik\s+nr/i.test(next.text) &&
				next.text.trim()
			) {
				chapterSubtitle = next.text.trim();
				k++;
			}

			currentChapter = {
				id: `ch_${chapterIndex}`,
				title: chapterTitle,
				subtitle: chapterSubtitle,
				articles: [],
			};
			chapters.push(currentChapter);
			currentArticle = null;
			continue;
		}

		// ─── Artykuł ───
		const prevBlock = blocks[k - 1];
		const prevText = prevBlock ? (prevBlock.text || "").trim() : "";
		const nextBlock = blocks[k + 1];
		const nextText = nextBlock ? (nextBlock.text || "").trim() : "";

		const lineHasQuote =
			/^Art\.\s*\d+(?:\.\d+)*[a-z]*\.?\s*(otrzymuje brzmienie|Otrzymuje brzmienie|uchyla się)/i.test(
				line,
			);
		const prevLooksLikeIntro =
			/(wprowadza się następujące zmiany|nowelizację następujących przepisów|otrzymuje brzmienie|uchyla się|zmienia się w następujący sposób):?\s*$/i.test(
				prevText,
			);
		const nextLooksLikeQuote =
			/^(Otrzymuje brzmienie|otrzymuje brzmienie|wprowadza się następujące zmiany|uchyla się)/i.test(
				nextText,
			);
		const looksLikeQuote =
			lineHasQuote || prevLooksLikeIntro || nextLooksLikeQuote;

		const hasOpenQuote =
			currentArticle &&
			currentArticle.contentLines.some((l) => {
				const t = (typeof l === "string" ? l : l.text) || "";
				const openCount = (t.match(/„/g) || []).length;
				const closeCount = (t.match(/”/g) || []).length;
				return openCount > closeCount;
			});

		const isInnerQuoteArticle =
			RE_ART.test(line) &&
			currentArticle !== null &&
			(hasOpenQuote || /^(Art|ART)\.?\s*39[a-z]?/i.test(line));

		// ─── Specjalny przypadek: sam "Art." + następny blok "X. treść" ───
		// W edytorze edytor zapisał "Art." i "2. Głównymi celami..." jako dwa osobne bloki.
		// Trzeba je scalić w "Art. 2. Głównymi celami..." ZANIM sprawdzimy artMatch.
		if (/^(Art|ART)\.?$/.test(line.trim()) && !insideQuote && !looksLikeQuote) {
			const nb = blocks[k + 1];
			const nbText = nb ? (nb.text || "").trim() : "";
			const mNext = nbText.match(/^(\d+(?:\.\d+)*[a-z]*)\.?\s+(.+)$/s);
			if (mNext) {
				flushArticle();
				resetNowelCtx();

				const artNumber = `Art. ${mNext[1]}`;
				const chapter = ensureChapter();

				// Scalanie z istniejącym artykułem (np. Art. 6 + Art. 6.1)
				const baseNumber = artNumber.match(/^Art\.\s*\d+/)?.[0];
				const existing = chapter.articles.find(
					(a) =>
						a.number === artNumber ||
						(baseNumber && a.number === baseNumber) ||
						(baseNumber && a.number.startsWith(baseNumber + ".")),
				);

				if (existing) {
					existing.contentLines.push({
						marker: null,
						text: mNext[2],
						level: 1,
						type: "paragraph",
					});
					currentArticle = existing;
				} else {
					articleIndex++;
					currentArticle = {
						id: `art_${articleIndex}`,
						number: artNumber,
						contentLines: [
							{ marker: null, text: mNext[2], level: 1, type: "paragraph" },
						],
						content: "",
					};
					chapter.articles.push(currentArticle);
				}
				k++; // pomiń zużyty blok
				continue;
			}
		}

		// ─── Artykuł ───
		const artMatch =
			!looksLikeQuote &&
			!insideQuote &&
			!isInnerQuoteArticle &&
			line.match(RE_ART);

		if (
			(block.type === "paragraph" ||
				block.type === "heading" ||
				block.type === "list-item") &&
			artMatch
		) {
			flushArticle();
			resetNowelCtx();
			// ... reszta bez zmian (bez tego wewnętrznego if-a z Art.)

			const artNumber = artMatch[0]
				.replace(/\.$/, "")
				.replace(/^Art\s+/, "Art. ")
				.trim();
			const chapter = ensureChapter();

			const baseNumber = artNumber.match(/^Art\.\s*\d+/)?.[0];
			const existing = chapter.articles.find(
				(a) =>
					a.number === artNumber ||
					(baseNumber && a.number === baseNumber) ||
					(baseNumber && a.number.startsWith(baseNumber + ".")),
			);

			if (existing) {
				const firstContent = line.slice(artMatch[0].length).trim();
				if (firstContent) {
					existing.contentLines.push({
						marker: null,
						text: firstContent,
						level: 1,
						type: "paragraph",
					});
				}
				currentArticle = existing;
				continue;
			}

			articleIndex++;
			const firstContent = line.slice(artMatch[0].length).trim();

			currentArticle = {
				id: `art_${articleIndex}`,
				number: artNumber,
				contentLines: firstContent
					? [{ marker: null, text: firstContent, level: 1, type: "paragraph" }]
					: [],
				content: "",
			};
			chapter.articles.push(currentArticle);
			continue;
		}

		// ─── Załącznik ───
		if (block.type === "paragraph" && /^Załącznik\s+nr/i.test(line)) {
			flushArticle();
			resetNowelCtx();
			insideQuote = false;
			chapterIndex++;
			currentChapter = {
				id: `ch_${chapterIndex}`,
				title: line,
				subtitle: "",
				articles: [],
			};
			chapters.push(currentChapter);
			currentArticle = {
				id: `zal_${chapterIndex}`,
				number: "",
				contentLines: [],
				content: "",
			};
			currentChapter.articles.push(currentArticle);
			continue;
		}

		// ─── Zwykły blok ───
		if (currentArticle) {
			// Nowelizacja (przed zwykłym markerem)
			const nowel = detectNowelizacjaMarker(line, nowelCtx);
			if (nowel) {
				currentArticle.contentLines.push({
					marker: nowel.marker,
					text: line,
					level: nowel.level,
					type: "list-item",
					fromParagraph: true,
				});
				continue;
			}

			// "2. 3. treść" → "3. treść"
			const dbl = extractDoubleMarker(line);
			if (dbl) {
				currentArticle.contentLines.push({
					marker: dbl.marker,
					text: dbl.text,
					level: 1,
					type: "list-item",
					fromParagraph: true,
				});
				continue;
			}

			// Zachowaj oryginalny marker z linii (np. "1)", "1.", "a)")
			const extracted = extractMarker(line);
			if (extracted) {
				// level wyznaczony z typu markera
				let level = 1;
				if (extracted.rawType === "num-paren") level = 2;
				else if (
					extracted.rawType === "let-paren" ||
					extracted.rawType === "let-dot" ||
					extracted.rawType === "roman"
				)
					level = 3;
				else level = 1;

				currentArticle.contentLines.push({
					marker: extracted.marker,
					text: extracted.text,
					level,
					type: "list-item",
					fromParagraph: true,
				});
				continue;
			}

			// Zwykły tekst
			currentArticle.contentLines.push(blockToLine(block));
		} else {
			const chapter = ensureChapter();
			articleIndex++;
			currentArticle = {
				id: `art_${articleIndex}`,
				number: `Art. ${articleIndex}`,
				contentLines: [blockToLine(block)],
				content: "",
			};
			chapter.articles.push(currentArticle);
		}
	}

	flushArticle();

	// ─────────────────────────────────────────────
	// 5) FINALNE ID
	// ─────────────────────────────────────────────
	for (let ci = 0; ci < chapters.length; ci++) {
		const ch = chapters[ci];
		ch.id = `ch_${ci + 1}`;
		ch.articles.forEach((a, i) => {
			a.id = `art_${ci + 1}_${i + 1}`;
		});
	}

	return { title, preamble, chapters };
}
