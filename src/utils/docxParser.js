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
			if (cleaned) blocks.push({ type, text: cleaned, html: cleaned, ...extra });
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
			[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
			[100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
			[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
		];
		let res = "";
		for (const [v, s] of map) {
			while (num >= v) { res += s; num -= v; }
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

			const nested = Array.from(li.querySelectorAll(":scope > ul, :scope > ol"));
			const clone = li.cloneNode(true);
			clone.querySelectorAll("ul, ol").forEach((nl) => nl.remove());

			replaceBrWithNewline(clone);

			let text = (clone.textContent || "").trim();

			let marker;
			const inlineMarker = text.match(
				/^(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+[.)])\s+/
			);
			if (inlineMarker) {
				marker = inlineMarker[1];
				text = text.slice(inlineMarker[0].length);
			} else if (ordered) {
				marker = (start + counter - 1) + ")";
			} else {
				marker = "–";
			}

			if (text) {
				pushText("list-item", text, {
					ordered,
					marker,
					level,
					fromList: true,   // ← NOWE: pochodzi z <ol>/<ul>
				});
			}
			for (const nl of nested) {
				walkList(nl, level + 1);
			}
		}
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
					const m = rawText.match(
						/^(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+\.|[IVXLCDM]+\))\s+(.+)$/s
					);
					if (m) {
						const marker = m[1];
						const mtype = markerType(marker);   // ← użyj markerType
						let level = 1;
						if (mtype === "num-paren") level = 2;
						else if (mtype === "let-paren" || mtype === "let-dot" || mtype === "roman") level = 3;

						const parts = m[2].split(/\n/);
						parts.forEach((p) => {
							const t = p.replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
							if (!t) return;

							const innerMatch = t.match(
								/^(\d+\.|\d+\)|[a-z]\)|[a-z]\.|[IVXLCDM]+\.|[IVXLCDM]+\))\s+(.+)$/
							);
							if (innerMatch) {
								const innerMtype = markerType(innerMatch[1]);
								let innerLevel = 1;
								if (innerMtype === "num-paren") innerLevel = 2;
								else if (innerMtype === "let-paren" || innerMtype === "let-dot" || innerMtype === "roman") innerLevel = 3;

								pushText("list-item", innerMatch[2], {
									ordered: true,
									marker: innerMatch[1],
									level: innerLevel,
									fromParagraph: true,
								});
							} else {
								pushText("list-item", t, {
									ordered: true,
									marker,
									level,                 // ← było na sztywno 1
									fromParagraph: true,
								});
							}
						});
						continue;
					}
				}

				pushText(
					tag.startsWith("h") ? "heading" : "paragraph",
					rawText,
					{
						headingLevel: tag.startsWith("h") ? Number(tag[1]) : undefined,
						html: rawHtml,
					},
				);
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
	if (/^\d+\.$/.test(marker)) return "num-dot";
	if (/^\d+\)$/.test(marker)) return "num-paren";
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
			/uznając, że/i.test(b.text),
	);
	let title;
	let preamble = "";
	if (preambleStart > 0) {
		title = headerBlocks.slice(0, preambleStart).map((b) => b.text).join("\n");
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

	const chapters = [];
	let currentChapter = null;
	let currentArticle = null;
	let chapterIndex = 0;
	let articleIndex = 0;

	const flushArticle = () => {
		if (!currentArticle) return;              // ← DODAJ TO

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
			currentChapter = { id: "ch_0", title: "Przepisy wstępne", subtitle: "", articles: [] };
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
		if (/^\d+[.)]\s*$/.test(line)) continue;

		// ─── Rozdział ───────────────────────────────────────
		// ─── Rozdział ───────────────────────────────────────
		if (
			(block.type === "paragraph" || block.type === "heading") &&
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(line)
		) {
			flushArticle();
			chapterIndex++;
			let chapterTitle = line;
			let chapterSubtitle = "";

			const next = blocks[k + 1];
			if (
				next &&
				(next.type === "paragraph" || next.type === "heading") &&  // ← DODANE: heading też
				!/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(next.text) &&
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

		const lineHasQuote = /^Art\.\s*\d+[a-z]*[¹²³⁴⁵⁶⁷⁸⁹⁰]*\.?\s*(otrzymuje brzmienie|Otrzymuje brzmienie|uchyla się)/i.test(line);
		const prevLooksLikeIntro = /(wprowadza się następujące zmiany|nowelizację następujących przepisów|otrzymuje brzmienie|uchyla się|zmienia się w następujący sposób):?\s*$/i.test(prevText);
		const nextLooksLikeQuote = /^(Otrzymuje brzmienie|otrzymuje brzmienie|wprowadza się następujące zmiany|uchyla się)/i.test(nextText);
		const looksLikeQuote = lineHasQuote || prevLooksLikeIntro || nextLooksLikeQuote;

		const artMatch = !looksLikeQuote && line.match(/^(Art|ART)\.?\s*\d+[a-z]*[¹²³⁴⁵⁶⁷⁸⁹⁰]*\.?/);
		if ((block.type === "paragraph" || block.type === "heading") && artMatch) {
			flushArticle();
			console.log("=== ART DEBUG ===");
			console.log("k =", k);
			console.log("artMatch[0] =", JSON.stringify(artMatch[0]));
			console.log("line.slice(0, 60) =", JSON.stringify(line.slice(0, 60)));
			console.log("articleIndex PRZED =", articleIndex);
			const artNumber = artMatch[0].replace(/\.$/, "").trim();
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

			console.log("  → artNumber =", JSON.stringify(artNumber));
			console.log("  → articleIndex PO =", articleIndex);
			console.log("  → chapter.articles.length PO push =", chapter.articles.length);
			console.log("  → numery w chapter:", chapter.articles.map((a) => a.number));
			console.log("==================");

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
					// Pochodzi z <ol> — to jest lista podrzędna, poziom 2
					lineObj.level = 2;
					// Marker już ustawiony na "1)", "2)" w walkList
				} else if (fromParagraph) {
					// Pochodzi z <p> z markerem "1.", "2." — to ustęp, poziom 1
					lineObj.level = 1;
				} else {
					// Fallback — heurystyka po markerze
					const type = markerType(lineObj.marker);
					if (type === "num-paren") {
						lineObj.level = 2;
					} else if (type === "let-paren" || type === "let-dot" || type === "roman") {
						lineObj.level = 3;
					} else {
						lineObj.level = 1;
					}
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

	return { title, preamble, chapters };
}