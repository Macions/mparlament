import mammoth from "mammoth";

export async function parseDocx(file) {
	const arrayBuffer = await file.arrayBuffer();
	const result = await mammoth.convertToHtml({ arrayBuffer });
	const html = result.value;
	const text = htmlToStructuredText(html);

	console.log("=== SUROWY TEKST Z MAMMOTHA ===");
	console.log(text);
	console.log("=== KONIEC ===");

	return parse(text);
}

function htmlToStructuredText(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;
	const lines = [];

	function extractText(element) {
		const children = element.children;
		if (children.length === 0) {
			const text = element.textContent?.trim();
			if (text) lines.push(text);
			return;
		}
		for (const child of children) {
			const tag = child.tagName?.toLowerCase();
			if (tag === "p" || /^h[1-6]$/.test(tag)) {
				const fullText = child.textContent?.trim();
				if (fullText) lines.push(fullText);
			} else if (tag === "ul" || tag === "ol") {
				const items = child.querySelectorAll(":scope > li");
				items.forEach((li) => {
					const text = li.textContent?.trim();
					if (text) lines.push(text);
				});
			} else if (tag === "table") {
				const rows = child.querySelectorAll("tr");
				rows.forEach((row) => {
					const cells = row.querySelectorAll("td, th");
					const rowText = Array.from(cells)
						.map((c) => c.textContent?.trim())
						.join(" | ");
					if (rowText) lines.push(rowText);
				});
			} else {
				extractText(child);
			}
		}
	}

	extractText(body);

	if (lines.length === 0) {
		const bodyText = body.textContent?.trim();
		if (bodyText) return bodyText;
	}

	// Scalanie: Rozdział + tytuł, Art. X. + następna linia
	const merged = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Rozdział bez tytułu – połącz z następną linią
		if (
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+$/i.test(line) &&
			i + 1 < lines.length
		) {
			const nextLine = lines[i + 1];
			if (
				!/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(nextLine) &&
				!/^Art\.\s*\d+/i.test(nextLine) &&
				!/^Załącznik\s+nr/i.test(nextLine)
			) {
				merged.push(line + " – " + nextLine);
				i++;
				continue;
			}
		}

		// Art. X. puste – połącz z następną
		if (/^Art\.\s*\d+[a-z]*\.?\s*$/.test(line) && i + 1 < lines.length) {
			const nextLine = lines[i + 1];
			if (
				!/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(nextLine) &&
				!/^Art\.\s*\d+/i.test(nextLine) &&
				!/^Załącznik\s+nr/i.test(nextLine)
			) {
				merged.push(line + " " + nextLine);
				i++;
				continue;
			}
		}

		// Duplikaty
		if (merged.length > 0 && merged[merged.length - 1] === line) continue;

		merged.push(line);
	}

	return merged.join("\n");
}

function normalize(text) {
	return text
		.replace(/\r/g, "")
		.replace(/[ \t]+/g, " ")
		.trim();
}

function parse(text) {
	const normalized = normalize(text);
	const lines = normalized
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	let title = lines[0] || "Dokument bez tytułu";

	let preambleEndIndex = 0;
	for (let i = 0; i < Math.min(lines.length, 15); i++) {
		if (
			/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(lines[i]) ||
			/^Art\.\s*\d+/i.test(lines[i])
		) {
			preambleEndIndex = i;
			break;
		}
		if (i > 0) preambleEndIndex = i;
	}

	const preambleLines = lines.slice(1, preambleEndIndex || 1);
	const preamble = preambleLines.length > 0 ? preambleLines.join("\n") : "";

	const chapters = [];
	let currentChapter = null;
	let currentArticle = null;
	let chapterIndex = 0;
	let articleIndex = 0;

	const startIndex = preambleEndIndex > 0 ? preambleEndIndex : 1;

	function flushArticle() {
		if (currentArticle) {
			currentArticle.content = currentArticle.content
				.replace(/\s+/g, " ")
				.trim();
			if (currentArticle.content === "" && currentChapter) {
				const idx = currentChapter.articles.indexOf(currentArticle);
				if (idx !== -1) currentChapter.articles.splice(idx, 1);
			}
		}
		currentArticle = null;
	}

	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i];

		if (/^[_\-\s]{3,}$/.test(line)) continue;
		if (/^\d+[.)]\s*$/.test(line)) continue;

		// ROZDZIAŁ
		if (/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(line)) {
			flushArticle();
			chapterIndex++;
			currentChapter = { id: `ch_${chapterIndex}`, title: line, articles: [] };
			chapters.push(currentChapter);
			continue;
		}

		// ARTYKUŁ
		const artMatch = line.match(/^Art\.\s*\d+[a-z]*\.?/i);
		if (artMatch) {
			flushArticle();

			// Sprawdź duplikaty w bieżącym rozdziale
			const artNumber = artMatch[0].replace(/\.$/, "").trim();
			if (currentChapter) {
				const isDuplicate = currentChapter.articles.some(
					(a) => a.number === artNumber,
				);
				if (isDuplicate) continue; // Pomiń duplikat
			}

			articleIndex++;
			let content = line.replace(artMatch[0], "").trim();

			while (i + 1 < lines.length) {
				const nextLine = lines[i + 1];
				if (
					/^(Rozdział|DZIAŁ|CZĘŚĆ)\s+[IVXLCDM\d]+/i.test(nextLine) ||
					/^Art\.\s*\d+/i.test(nextLine) ||
					/^Załącznik\s+nr/i.test(nextLine) ||
					/^[_\-\s]{3,}$/.test(nextLine)
				)
					break;
				content += " " + nextLine;
				i++;
			}

			currentArticle = {
				id: `art_${articleIndex}`,
				number: artNumber,
				content: content.replace(/\s+/g, " ").trim(),
			};

			if (!currentChapter) {
				currentChapter = {
					id: "ch_0",
					title: "Przepisy wstępne",
					articles: [],
				};
				chapters.push(currentChapter);
			}
			currentChapter.articles.push(currentArticle);
			continue;
		}

		// ZAŁĄCZNIKI
		if (/^Załącznik\s+nr/i.test(line)) {
			flushArticle();
			chapterIndex++;
			let attachmentContent = "";
			let j = i + 1;
			while (j < lines.length) {
				if (/^Załącznik\s+nr/i.test(lines[j])) break;
				const l = lines[j].trim();
				if (l && l !== "." && !/^\.\s*\(/.test(l)) {
					const cleaned = l.replace(/^\.\s*/, "");
					if (cleaned) {
						attachmentContent += (attachmentContent ? " " : "") + cleaned;
					}
				}
				j++;
			}
			currentChapter = { id: `ch_${chapterIndex}`, title: line, articles: [] };
			chapters.push(currentChapter);
			if (attachmentContent.trim()) {
				articleIndex++;
				currentChapter.articles.push({
					id: `art_${articleIndex}`,
					number: ``,
					content: attachmentContent.replace(/\s+/g, " ").trim(),
				});
			}
			i = j - 1;
			continue;
		}

		// FALLBACK
		if (!currentChapter) {
			currentChapter = { id: "ch_0", title: "Przepisy wstępne", articles: [] };
			chapters.push(currentChapter);
		}
		if (currentArticle) {
			currentArticle.content += " " + line;
		} else {
			articleIndex++;
			currentArticle = {
				id: `art_${articleIndex}`,
				number: `Art. ${articleIndex}`,
				content: line,
			};
			currentChapter.articles.push(currentArticle);
		}
	}

	flushArticle();
	return { title, preamble, chapters };
}
