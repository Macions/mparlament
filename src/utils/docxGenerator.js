import JSZip from "jszip";
import { saveAs } from "file-saver";

export const generateDocxWithTags = async (originalFile, data) => {
	console.log(" Otrzymane dane do podmiany:", data);

	const arrayBuffer = await originalFile.arrayBuffer();
	const zip = await JSZip.loadAsync(arrayBuffer);
	let xml = await zip.file("word/document.xml").async("string");

	// Przetwarzanie poprawek (usuwanie, dodawanie, podmiana)
	Object.entries(data).forEach(([key, newContent]) => {
		if (!newContent) return;

		const num = parseInt(key.replace("art_", ""));
		const isNew = newContent.startsWith("NEW_ARTICLE: ");
		const isDeleted = newContent === "(usunięty)";
		const content = isNew
			? newContent.replace("NEW_ARTICLE: ", "")
			: newContent;

		if (isDeleted) {
			// ️ USUŃ ARTYKUŁ
			console.log(`️ Usuwam Art. ${num}`);
			const searchText = `Art. ${num}.`;
			const match = xml.match(new RegExp(`${searchText}[^<]*`, "i"));
			if (match) {
				const textToRemove = match[0];
				const startIndex = xml.lastIndexOf("<w:p", xml.indexOf(textToRemove));
				const endIndex = xml.indexOf("</w:p>", xml.indexOf(textToRemove)) + 6;
				if (startIndex !== -1 && endIndex !== -1) {
					const fullParagraph = xml.substring(startIndex, endIndex);
					xml = xml.replace(fullParagraph, "");
					console.log(`    Usunięto Art. ${num}`);
				}
			}
		} else if (isNew) {
			//  DODAJ NOWY ARTYKUŁ (z tymczasowym numerem)
			console.log(` Dodaję nowy artykuł po Art. ${num}`);
			const newArticleText = `Art. ${num}. ${content}`;

			const searchText = `Art. ${num}.`;
			const match = xml.match(new RegExp(`${searchText}[^<]*`, "i"));
			if (match) {
				const oldText = match[0];
				const endIndex = xml.indexOf("</w:p>", xml.indexOf(oldText)) + 6;
				if (endIndex !== -1) {
					const newParagraph = `<w:p><w:r><w:t>${escapeXml(newArticleText)}</w:t></w:r></w:p>`;
					xml = xml.slice(0, endIndex) + newParagraph + xml.slice(endIndex);
					console.log(`    Dodano: ${newArticleText}`);
				}
			}
		} else {
			// ️ PODMIANA ISTNIEJĄCEGO
			console.log(` Podmieniam Art. ${num} na: "${content}"`);
			const searchText = `Art. ${num}.`;
			const match = xml.match(new RegExp(`${searchText}[^<]*`, "i"));
			if (match) {
				const oldText = match[0];
				const newText = `${searchText} ${content}`;
				xml = xml.replace(oldText, newText);
				console.log(`    Podmieniono!`);
			}
		}
	});

	//  PRZENUMERUJ WSZYSTKIE ARTYKUŁY
	console.log(" Przenumerowuję artykuły...");
	xml = renumberArticles(xml);

	zip.file("word/document.xml", xml);

	const blob = await zip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
	});

	console.log(" DOCX wygenerowany, rozmiar:", blob.size);
	return blob;
};

// Funkcja do przenumerowania artykułów od 1 do n
function renumberArticles(xml) {
	// Znajdź wszystkie artykuły w kolejności występowania
	const articleRegex = /Art\.\s*(\d+)/g;
	let match;
	const articles = [];

	while ((match = articleRegex.exec(xml)) !== null) {
		articles.push({
			number: parseInt(match[1]),
			start: match.index,
			end: match.index + match[0].length,
			fullMatch: match[0],
		});
	}

	console.log(`   Znaleziono ${articles.length} artykułów`);

	// Przenumeruj od 1 do n (od tyłu, żeby nie psuć indeksów)
	let newNumber = 1;
	let offset = 0;

	for (let i = 0; i < articles.length; i++) {
		const art = articles[i];
		const oldText = `Art. ${art.number}`;
		const newText = `Art. ${newNumber}`;

		// Znajdź i zamień (uwzględniając offset)
		const currentPos = art.start + offset;
		const beforeReplace = xml.substring(0, currentPos);
		const afterReplace = xml.substring(currentPos + oldText.length);
		xml = beforeReplace + newText + afterReplace;

		// Aktualizuj offset dla następnych pozycji
		offset += newText.length - oldText.length;
		newNumber++;
	}

	return xml;
}

function escapeXml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const downloadDocx = (blob, fileName = "uchwala-final.docx") => {
	console.log(` Pobieranie: ${fileName}`);
	saveAs(blob, fileName);
};
