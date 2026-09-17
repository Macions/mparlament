import mammoth from "mammoth";

export async function parseDocx(file) {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const result = await mammoth.convertToHtml({ arrayBuffer });
		const blocks = htmlToBlocks(result.value);
		return parse(blocks);
	} catch (err) {
		console.error("Błąd parsowania DOCX:", err);
		throw new Error("Nie udało się sparsować pliku DOCX: " + err.message);
	}
}

/**
 * Zamienia HTML z mammotha na listę bloków.
 * Każdy blok: { type, text, html, level?, marker?, ordered? }
 */
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

			let text = (clone.textContent || "").trim();

			// rozbij <li> z <br> na osobne linie
			const lines = text
				.split(/\n/)
				.map((l) => l.trim())
				.filter(Boolean);

			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				const lineText = lines[lineIdx];
				let lineMarker = null;
				let lineContent = lineText;

				const inlineMarker = lineText.match(
					/^(\d+[a-z]?[.)]|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)])\s+/,
				);

				if (inlineMarker) {
					lineMarker = inlineMarker[1];
					lineContent = lineText.slice(inlineMarker[0].length);
				} else if (lineIdx === 0) {
					// pierwsza linia dostaje marker z listy
					lineMarker = ordered ? formatMarker(start + counter - 1, type) : "–";
				} else {
					// kolejne linie w tym samym <li> — bez markera, głębiej
					lineMarker = null;
				}

				if (lineContent) {
					pushText("list-item", lineContent, {
						ordered,
						marker: lineMarker,
						level: lineIdx === 0 ? level : level + 1,
						fromList: true,
					});
				}
			}

			for (const nl of nested) {
				walkList(nl, level + 1);
			}
		}
	}
	function handleParagraphLine(rawText, rawHtml) {
		const text = (rawText || "").trim();
		if (!text) return;

		// Rozbij linię, jeśli zawiera W ŚRODKU marker typu " 2. " lub " 3. "
		// UWAGA: nie ruszaj "Art." ani "Rozdział"
		if (!/^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(text)) {
			const parts = text.split(/\s(?=\d+[a-z]?\.\s|\d+[a-z]?\)\s)/);
			if (parts.length > 1) {
				for (const part of parts) {
					const trimmed = part.trim();
					if (trimmed) handleParagraphLine(trimmed, rawHtml);
				}
				return;
			}
		}

		const m = text.match(
			/^(\d+[a-z]?[.)]|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)])\s+(.+)$/s,
		);
		if (m) {
			const marker = m[1];
			const mtype = markerType(marker);
			let level = 1;
			// "1." i "1)" → poziom 1 (główne punkty)
			if (mtype === "num-dot" || mtype === "num-paren") level = 1;
			// "a)" i "a." → poziom 2 (podpunkty)
			else if (mtype === "let-paren" || mtype === "let-dot") level = 2;
			// "i)" / "i." → poziom 3
			else if (mtype === "roman") level = 3;

			pushText("list-item", m[2], {
				ordered: true,
				marker,
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
						// Scalamy linie, które NIE zaczynają się od markera
						const merged = [];
						for (const line of lines) {
							const isMarker =
								/^(\d+[a-z]?[.)]|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)])\s+/.test(
									line,
								) || /^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(line);

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

function toSubMarker(marker, level) {
	if (!marker) return marker;
	if (level === 2) {
		const m = marker.match(/^(\d+)\.$/);
		if (m) return `${m[1]})`;
	}
	if (level === 3) {
		const m = marker.match(/^(\d+)\.$/);
		if (m) {
			const idx = Number(m[1]);
			return String.fromCharCode(96 + idx) + ")";
		}
	}
	return marker;
}

/**
 * Zwraca TYP markera (nie poziom):
 *   "num-dot"   → "1."   (ustęp)
 *   "num-paren" → "1)"   (punkt)
 *   "let-paren" → "a)"   (podpunkt literowy)
 *   "let-dot"   → "a."   (podpunkt literowy)
 *   "roman"     → "i)" / "i." (rzadko)
 *   "other"     → "–" lub cokolwiek
 */
function markerType(marker) {
	if (!marker) return "other";
	if (/^\d+[a-z]?\.$/.test(marker)) return "num-dot";
	if (/^\d+[a-z]?\)$/.test(marker)) return "num-paren";
	if (/^[a-z]\)$/.test(marker)) return "let-paren";
	if (/^[a-z]\.$/.test(marker)) return "let-dot";
	if (/^[ivxlcdm]+[.)]$/i.test(marker)) return "roman";
	return "other";
}

function parse(blocks) {
	if (blocks.length === 0) {
		return { title: "Dokument bez tytułu", preamble: "", chapters: [] };
	}

	const isStructural = (b) =>
		(b.type === "paragraph" || b.type === "heading") &&
		(/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+[a-z]?/i.test(b.text) ||
			/^(Art|ART)\.?\s*\d+/.test(b.text));

	let firstStructuralIndex = blocks.findIndex(isStructural);
	if (firstStructuralIndex === -1) firstStructuralIndex = blocks.length;

	const headerBlocks = blocks.slice(0, firstStructuralIndex);

	const preambleStart = headerBlocks.slice(0, 20).findIndex(
		(b) =>
			/^My,/.test(b.text) ||
			/^Preambuła$/i.test(b.text) ||
			/uchwalamy/i.test(b.text) ||
			/w trosce o/i.test(b.text) ||
			/uznając, że/i.test(b.text) ||
			/^Parlament Młodych/i.test(b.text) || // ← DODAJ
			/^Parlamentarzyści/i.test(b.text) || // ← DODAJ
			/^Parlamentarzystki/i.test(b.text) || // ← DODAJ
			/świadomy bezprecedensowych/i.test(b.text) || // ← DODAJ
			/mając na uwadze/i.test(b.text) || // ← DODAJ
			/dostrzegając, że/i.test(b.text), // ← DODAJ
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

	// Scal bloki, które mammoth rozbił na "Art." + "1. treść"
	// Scal bloki, które mammoth rozbił na "Art." + "1. treść"
	// oraz bloki kończące się na "Art." + następny zaczynający się od "39a."
	const mergedBlocks = [];
	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i];
		const next = blocks[i + 1];
		const bTrim = (b.text || "").trim();
		const nextTrim = (next?.text || "").trim();

		// "Art." + "1. treść" → "Art. 1. treść"
		if (
			bTrim &&
			/^(Art|ART)\.?$/.test(bTrim) &&
			next &&
			/^\d+[a-z]?[.)]/.test(nextTrim)
		) {
			mergedBlocks.push({
				...b,
				text: `Art. ${nextTrim}`,
			});
			i++;
			continue;
		}

		// "... Art." + "39a. treść" → "... Art. 39a. treść"
		if (
			bTrim &&
			/\b(Art|ART)\.$/.test(bTrim) &&
			next &&
			/^\d+[a-z]?[.)]/.test(nextTrim)
		) {
			mergedBlocks.push({
				...b,
				text: `${bTrim} ${nextTrim}`,
			});
			i++;
			continue;
		}

		// "1." + "Apelujemy..." → "1. Apelujemy..."
		if (
			bTrim &&
			/^\d+[a-z]?\.$/.test(bTrim) &&
			next &&
			/^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(nextTrim)
		) {
			mergedBlocks.push({
				...b,
				text: `${bTrim} ${nextTrim}`,
			});
			i++;
			continue;
		}

		mergedBlocks.push(b);
	}
	// Rozbij bloki, które zawierają kilka markerów w środku
	// np. "1. Postulujemy... 2. Wysokość... 3. Postuluje..."
	// Rozbij bloki, które zawierają kilka markerów w środku
	const splitBlocks = [];
	for (const b of mergedBlocks) {
		const text = (b.text || "").trim();
		if (!text) {
			splitBlocks.push(b);
			continue;
		}

		// nie ruszaj Art./Rozdział
		if (/^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(text)) {
			splitBlocks.push(b);
			continue;
		}

		// rozbij po markerach w środku
		const parts = text.split(
			/(?<=[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ;:,.)])\s+(?=\d+[a-z]?[.)]\s|[a-z]\)\s)/,
		);

		if (parts.length > 1) {
			const filtered = parts
				.map((p) => p.trim())
				.filter(Boolean)
				.map((p) => ({ ...b, text: p }));

			// nie scalaj jeśli któryś fragment zaczyna się od "Art."
			if (
				filtered.length > 1 &&
				filtered.every((f) => !/^(Art|ART|Rozdział|DZIAŁ|CZĘŚĆ)/.test(f.text))
			) {
				splitBlocks.push(...filtered);
				continue;
			}
		}

		splitBlocks.push(b);
	}

	// Scal bloki, które mammoth rozbił na dwa <p> w środku zdania
	// (np. "...odnawialnych źródeł" + "energii.")
	// używaj splitBlocks zamiast blocks od tego miejsca
	blocks = splitBlocks;

	const chapters = [];
	let currentChapter = null;
	let currentArticle = null;
	let chapterIndex = 0;
	let articleIndex = 0;
	let insideQuote = false;

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

		// ─── Śledzenie cytatu ───────────────────────────────
		// ─── Śledzenie cytatu ───────────────────────────────
		// NIE włączaj cytatu, jeśli linia sama jest nowym artykułem/rozdziałem
		const startsWithStructural =
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(line) ||
			/^(Art|ART)\.?\s*\d+/.test(line);

		if (
			!startsWithStructural &&
			/[:]\s*$/.test(line) &&
			/(w brzmieniu|następujące zmiany|następująco|uchyla się|zmienia się)/i.test(
				line,
			)
		) {
			insideQuote = true;
		}
		// Wyłącz cytat TYLKO gdy linia kończy się na cudzysłów zamykający
		// Wyłącz cytat TYLKO gdy linia kończy się na cudzysłów zamykający
		// Wyłącz cytat gdy linia kończy się na cudzysłów zamykający (opcjonalnie + ; lub .)
		// albo gdy zawiera `".` lub `";` (cudzysłów + kropka/średnik)
		if (
			/[""„”'']\s*[;.]?\s*$/.test(line) ||
			/[""„”'']\s*[;.](?:\s|$)/.test(line)
		) {
			insideQuote = false;
		}

		// DEBUG — usuń po testach
		console.log(
			k,
			"| insideQuote:",
			insideQuote,
			"| line:",
			JSON.stringify(line.slice(0, 60)),
		);

		// ─── Rozdział ───────────────────────────────────────
		if (
			(block.type === "paragraph" || block.type === "heading") &&
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(line)
		) {
			if (insideQuote && currentArticle) {
				currentArticle.contentLines.push(blockToLine(block));
				continue;
			}

			flushArticle();
			chapterIndex++;
			let chapterTitle = line;
			let chapterSubtitle = "";

			const next = blocks[k + 1];
			if (
				!insideQuote &&
				next &&
				(next.type === "paragraph" || next.type === "heading") &&
				!/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+[a-z]?/i.test(next.text) &&
				!/^Art\.\s*\d+/i.test(next.text) &&
				!/^Załącznik\s+nr/i.test(next.text) &&
				next.text.trim()
			) {
				chapterSubtitle = next.text;
				k++;
			}

			currentChapter = {
				id: `ch_${chapterIndex}`,
				title: chapterTitle,
				subtitle: chapterSubtitle,
				articles: [],
			};
			chapters.push(currentChapter);
			continue;
		}

		// ─── Artykuł ────────────────────────────────────────
		// Heurystyka: linia, poprzedni LUB następny blok wskazuje CYTAT ustawy.
		const prevBlock = blocks[k - 1];
		const prevText = prevBlock ? prevBlock.text.trim() : "";
		const nextBlock = blocks[k + 1];
		const nextText = nextBlock ? nextBlock.text.trim() : "";

		const lineHasQuote =
			/^Art\.\s*\d+[a-z]*[¹²³⁴⁵⁶⁷⁸⁹⁰]*\.?\s*(otrzymuje brzmienie|Otrzymuje brzmienie|uchyla się)/i.test(
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

		// Sprawdź, czy to "wewnętrzny" artykuł cytatu (np. Art. 39a, Art. 39b)
		// — taki, który pojawia się wewnątrz treści innego artykułu
		// Sprawdź, czy to "wewnętrzny" artykuł cytatu (np. Art. 39a, Art. 39b)
		// — taki, który pojawia się wewnątrz treści innego artykułu
		const inArt2Quote =
			currentArticle &&
			currentArticle.number === "Art. 2" &&
			currentArticle.contentLines.some(
				(l) => l.text && /w brzmieniu:/.test(l.text),
			);

		const isInnerQuoteArticle =
			/^(Art|ART)\.?\s*\d+[a-z]?/i.test(line) &&
			currentArticle !== null &&
			(inArt2Quote || /^(Art|ART)\.?\s*39[a-z]?/i.test(line));

		const artMatch =
			!looksLikeQuote &&
			!insideQuote &&
			!isInnerQuoteArticle &&
			line.match(/^(Art|ART)\.?\s*\d+[a-z]*[¹²³⁴⁵⁶⁷⁸⁹⁰]*\.?/);
		if ((block.type === "paragraph" || block.type === "heading") && artMatch) {
			flushArticle();
			const artNumber = artMatch[0]
				.replace(/\.$/, "")
				.replace(/^Art\s+/, "Art. ") // ← dodaj spację po Art.
				.trim();
			const chapter = ensureChapter();

			const existing = chapter.articles.find((a) => a.number === artNumber);
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

			// ─── Heurystyka A tymczasowo wyłączona ──
			// if ( ... ) { ... }

			currentArticle = {
				id: `art_${articleIndex}`,
				number: artNumber,
				contentLines: firstContent
					? [
							{
								marker: null,
								text: firstContent,
								level: 1,
								type: "paragraph",
							},
						]
					: [],
				content: "",
			};
			chapter.articles.push(currentArticle);

			continue;
		}

		// ─── Załącznik ──────────────────────────────────────
		if (block.type === "paragraph" && /^Załącznik\s+nr/i.test(line)) {
			flushArticle();
			chapterIndex++;
			currentChapter = { id: `ch_${chapterIndex}`, title: line, articles: [] };
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

		// ─── Zwykły blok ────────────────────────────────────
		if (currentArticle) {
			const lineObj = blockToLine(block);

			if (lineObj.type === "list-item" && lineObj.level === 1) {
				const fromList = block.fromList === true;
				const fromParagraph = block.fromParagraph === true;

				if (fromList) {
					// zachowaj poziom z walkList (już ustawiony), nie wymuszaj 2
					// lineObj.level zostaje jak jest
				} else if (fromParagraph) {
					lineObj.level = 1;
				} else {
					const type = markerType(lineObj.marker);
					if (type === "num-paren") lineObj.level = 2;
					else if (
						type === "let-paren" ||
						type === "let-dot" ||
						type === "roman"
					)
						lineObj.level = 3;
					else lineObj.level = 1;
				}
			}
			currentArticle.contentLines.push(lineObj);
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

	// Przenumeruj ID artykułów (bo flushArticle usuwa puste → dziury)
	for (const ch of chapters) {
		ch.articles.forEach((a, i) => {
			a.id = `art_${i + 1}`;
		});
	}

	return { title, preamble, chapters };
}
