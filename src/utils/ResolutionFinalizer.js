import { createReport } from 'docx-templates';
import { generateTaggedDocx } from './docxTagGenerator.js';
import fs from 'fs';
import path from 'path';

export const generateFinalResolution = async (resolutionId, resolutionData, amendments) => {
    try {
        if (!amendments || amendments.length === 0) {
            return {
                success: false,
                message: 'Brak poprawek do tej uchwały'
            };
        }

        const acceptedAmendments = amendments.filter(a => a.status === 'accepted');

        if (acceptedAmendments.length === 0) {
            return {
                success: false,
                message: 'Brak przyjętych poprawek do tej uchwały'
            };
        }

        const templatePath = path.join(process.cwd(), 'uploads', resolutionData.fileName);

        if (!fs.existsSync(templatePath)) {
            return {
                success: false,
                message: `Nie znaleziono pliku szablonu: ${resolutionData.fileName}`
            };
        }

        const taggedResult = await generateTaggedDocx(templatePath, amendments);

        if (!taggedResult.success) {
            return {
                success: false,
                message: taggedResult.message || 'Blad generowania znacznikow'
            };
        }

        const data = {};

        acceptedAmendments.forEach(amendment => {
            if (amendment.changes && Array.isArray(amendment.changes)) {
                amendment.changes.forEach(change => {
                    const key = `art_${change.articleId}`;
                    if (taggedResult.articleMap && taggedResult.articleMap[key]) {
                        data[key] = change.after || '';
                    }
                });
            }
        });

        if (Object.keys(data).length === 0) {
            return {
                success: false,
                message: 'Brak danych do podmiany - sprawdz czy articleId pasuja'
            };
        }

        const taggedTemplatePath = taggedResult.taggedPath || templatePath.replace('.docx', '-tagged.docx');
        const templateBuffer = fs.readFileSync(taggedTemplatePath);

        const report = await createReport({
            template: templateBuffer,
            data: data,
            cmdDelimiter: ['{{', '}}']
        });

        const outputFileName = `${resolutionData.slug}-final-${Date.now()}.docx`;
        const outputPath = path.join(process.cwd(), 'uploads', 'final', outputFileName);

        const finalDir = path.join(process.cwd(), 'uploads', 'final');
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, report);

        return {
            success: true,
            filePath: outputPath,
            fileName: outputFileName,
            url: `/uploads/final/${outputFileName}`,
            appliedAmendments: acceptedAmendments.length,
            totalAmendments: amendments.length,
            appliedChanges: Object.keys(data).length,
            totalArticles: taggedResult.totalArticles,
            dataKeys: Object.keys(data)
        };

    } catch (error) {
        console.error('Blad generowania uchwaly:', error);
        return {
            success: false,
            message: error.message || 'Wystapil blad podczas generowania uchwaly'
        };
    }
};