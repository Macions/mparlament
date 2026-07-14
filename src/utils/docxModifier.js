import { extract, pack } from 'docx';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

export const generateTaggedDocx = async (templatePath, amendments) => {
    try {
        const buffer = fs.readFileSync(templatePath);
        const zip = await extract(buffer);
        const docXml = zip.files['word/document.xml'].data.toString('utf8');

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
        const docObj = parser.parse(docXml);

        const paragraphs = docObj['w:document']['w:body']['w:p'];
        if (!Array.isArray(paragraphs)) {
            return { success: false, message: 'Brak paragrafow w dokumencie' };
        }

        let artIndex = 0;
        let foundArticles = 0;
        const articleMap = {};

        paragraphs.forEach((paragraph, idx) => {
            const text = extractTextFromParagraph(paragraph);
            const artMatch = text.match(/^(Art\.|§)\s*(\d+)[\.\s]/i);
            if (artMatch) {
                artIndex++;
                const key = `art_${artIndex}`;
                const artNumber = artMatch[0];

                articleMap[key] = {
                    articleId: artIndex,
                    number: artNumber,
                    content: text
                };

                const hasAmendment = amendments.some(a =>
                    a.status === 'accepted' &&
                    a.changes && a.changes.some(c => c.articleId === artIndex)
                );

                if (hasAmendment) {
                    const newText = `${artNumber} {{${key}}}`;
                    paragraphs[idx] = replaceParagraphContent(paragraph, newText);
                    foundArticles++;
                }
            }
        });

        const builder = new XMLBuilder({
            attributeNamePrefix: '@_',
            format: true
        });
        const newDocXml = builder.build(docObj);
        zip.files['word/document.xml'].data = Buffer.from(newDocXml, 'utf8');

        const newBuffer = await pack(zip);
        const taggedPath = templatePath.replace('.docx', '-tagged.docx');
        fs.writeFileSync(taggedPath, newBuffer);

        return {
            success: true,
            buffer: newBuffer,
            taggedPath: taggedPath,
            articleMap: articleMap,
            totalArticles: artIndex,
            foundArticles: foundArticles
        };

    } catch (error) {
        console.error('Blad generowania znacznikow:', error);
        return { success: false, error: error.message };
    }
};

function extractTextFromParagraph(paragraph) {
    let text = '';
    const runs = paragraph['w:r'];
    if (!runs) return text;
    const runsArray = Array.isArray(runs) ? runs : [runs];

    runsArray.forEach(run => {
        const t = run['w:t'];
        if (t) {
            if (typeof t === 'string') text += t;
            else if (t['#text']) text += t['#text'];
        }
    });
    return text;
}

function replaceParagraphContent(paragraph, newText) {
    const runs = paragraph['w:r'];
    if (!runs || !Array.isArray(runs) || runs.length === 0) {
        return {
            'w:p': {
                'w:r': {
                    'w:t': { '#text': newText }
                }
            }
        };
    }

    const firstRun = runs[0];
    const newRun = {
        'w:r': {
            'w:t': { '#text': newText }
        }
    };

    if (firstRun['w:rPr']) {
        newRun['w:r']['w:rPr'] = firstRun['w:rPr'];
    }

    paragraph['w:r'] = [firstRun, newRun];
    return paragraph;
}