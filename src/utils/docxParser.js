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
 * Każdy blok: { type: 'paragraph'|'heading'|'list-item'|'table-row', text, level?, marker?, ordered? }
 *
 * Zachowujemy:
 *  - hierarchię list (zagnieżdżenia),
 *  - oryginalne markery (1., 1), a), i., itd.),
 *  - podział na linie wewnątrz akapitów (via <br>),
 *  - osobne bloki dla każdego akapitu / nagłówka / pozycji listy.
 */
function htmlToBlocks(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;
	const blocks = [];

	function pushText(type, text, extra = {}) {
		if (!text) return;
		// Rozbijamy po \n (z <br>), ale nie sklejamy spacji w środku linii.
		const parts = text.split(/\n/);
		for (const part of parts) {
			const cleaned = part.replace(/[ \t]+/g, " ").trim();
			if (cleaned) blocks.push({ type, text: cleaned, ...extra });
		}
	}

	function replaceBrWithNewline(el) {
		// Zamieniamy <br> na \n, żeby textContent je widział.
		el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
	}

	function walk(element) {
		for (const child of element.children) {
			const tag = child.tagName?.toLowerCase();

			if (tag === "p" || /^h[1-6]$/.test(tag)) {
				replaceBrWithNewline(child);
				pushText(
					tag.startsWith("h") ? "heading" : "paragraph",
					child.textContent || "",
					{ headingLevel: tag.startsWith("h") ? Number(tag[1]) : undefined },
				);
				continue;
			}

			if (tag === "ul" || tag === "ol") {
				walkList(child, 1, blocks);
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

	function walkList(listEl, level, out) {
		const ordered = listEl.tagName?.toLowerCase() === "ol";
		const items = listEl.querySelectorAll(":scope > li");
		let counter = 0;

		const start = Number(listEl.getAttribute("start")) || 1;
		const type = listEl.getAttribute("type") || "1";

		for (const li of items) {
			counter++;

			const clone = li.cloneNode(true);
			// Wyciągnij zagnieżdżone listy przed odczytem tekstu
			const nested = Array.from(clone.querySelectorAll("ul, ol"));
			nested.forEach((nl) => nl.remove());

			// <br> → \n w samej treści punktu
			replaceBrWithNewline(clone);

			const text = (clone.textContent || "").trim();

			let marker;
			if (ordered) {
				marker = formatMarker(start + counter - 1, type);
			} else {
				marker = "–";
			}

			if (text) {
				pushText("list-item", text, { ordered, marker, level });
			}

			// Rekurencyjnie obsłuż zagnieżdżone listy
			for (const nl of nested) {
				walkList(nl, level + 1, out);
			}
		}
	}

	function formatMarker(idx, type) {
		switch (type) {
			case "a":
				return String.fromCharCode(96 + idx) + ")"; // a), b), c)
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

	walk(body);
	return blocks;
}

function parse(blocks) {
	if (blocks.length === 0) {
		return { title: "Dokument bez tytułu", preamble: "", chapters: [] };
	}

	// ─── Znajdź pierwszy blok strukturalny ──────────────────
	const isStructural = (b) =>
		b.type === "paragraph" &&
		(/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(b.text) ||
			/^Art\.\s*\d+/i.test(b.text));

	let firstStructuralIndex = blocks.findIndex(isStructural);
	if (firstStructuralIndex === -1) firstStructuralIndex = blocks.length;

	// ─── Tytuł + preambuła ──────────────────────────────────
	const headerBlocks = blocks.slice(0, firstStructuralIndex);

	const preambleStart = headerBlocks.findIndex(
		(b) =>
			/^My,/.test(b.text) ||
			/uchwalamy/i.test(b.text) ||
			/w trosce o/i.test(b.text) ||
			/uznając, że/i.test(b.text),
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
			.map((b) => b.text)
			.join("\n");
	} else {
		title = headerBlocks.map((b) => b.text).join("\n") || "Dokument bez tytułu";
	}

	// ─── Rozdziały i artykuły ───────────────────────────────
	const chapters = [];
	let currentChapter = null;
	let currentArticle = null;
	let chapterIndex = 0;
	let articleIndex = 0;

	const flushArticle = () => {
		if (!currentArticle) return;
		if (
			currentArticle.contentLines.length === 0 &&
			currentChapter &&
			currentChapter.articles.includes(currentArticle)
		) {
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
			currentChapter = { id: "ch_0", title: "Przepisy wstępne", articles: [] };
			chapters.push(currentChapter);
		}
		return currentChapter;
	};

	// ─── Konwersja bloku na linię tekstu (z markerem i wcięciem) ─
	const blockToLine = (b) => {
		if (b.type === "list-item") {
			return {
				marker: b.marker, // "1." / "1)" / "a)"
				text: b.text, // treść punktu
				level: b.level || 1, // 1 = ustęp, 2 = punkt, 3 = podpunkt
				type: "list-item",
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
		const line = block.text;

		// Pomiń linie ozdobne
		if (/^[_\-\s]{3,}$/.test(line)) continue;
		if (/^\d+[.)]\s*$/.test(line)) continue;

		// ─── Rozdział ───────────────────────────────────────
		if (
			block.type === "paragraph" &&
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(line)
		) {
			flushArticle();
			chapterIndex++;
			let chapterTitle = line;
			let chapterSubtitle = "";
			if (
				next &&
				next.type === "paragraph" &&
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
				title: chapterTitle, // "Rozdział 1"
				subtitle: chapterSubtitle, // "Spółdzielnie energetyczne"
				articles: [],
			};
			chapters.push(currentChapter);
			continue;
		}

		// ─── Artykuł ────────────────────────────────────────
		const artMatch = line.match(/^Art\.\s*\d+[a-z]*\.?/i);
		if (block.type === "paragraph" && artMatch) {
			flushArticle();

			const artNumber = artMatch[0].replace(/\.$/, "").trim();
			const chapter = ensureChapter();

			const isDuplicate = chapter.articles.some((a) => a.number === artNumber);
			if (isDuplicate) continue;

			articleIndex++;
			const firstContent = line.replace(artMatch[0], "").trim();

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
			currentChapter = {
				id: `ch_${chapterIndex}`,
				title: line,
				articles: [],
			};
			chapters.push(currentChapter);
			articleIndex++;
			currentArticle = {
				id: `art_${articleIndex}`,
				number: "",
				contentLines: [],
				content: "",
			};
			currentChapter.articles.push(currentArticle);
			continue;
		}

		// ─── Zwykły blok (paragraph / list-item / heading) ──
		if (currentArticle) {
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

	return { title, preamble, chapters };
}
