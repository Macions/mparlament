const fs = require("fs");
const path = require("path");

// ============================================================
// KONFIGURACJA
// ============================================================

const dir =
	"A:/mparl backend/mparlament-frontend/src/features/resolutions/pages";

const jsxFile = path.join(dir, "Resolutions.jsx");
const cssFile = path.join(dir, "resolutions.css");
const cssModuleFile = path.join(dir, "resolutions.module.css");

// ============================================================
// FUNKCJE POMOCNICZE
// ============================================================

function toCamelCase(name) {
	return name
		.replace(/__/g, " ")
		.replace(/--/g, " ")
		.replace(/-/g, " ")
		.split(/\s+/)
		.filter(Boolean)
		.map((part, i) =>
			i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
		)
		.join("");
}

function backup(file) {
	if (!fs.existsSync(file)) return;
	const bakFile = file + ".bak";
	if (!fs.existsSync(bakFile)) {
		fs.copyFileSync(file, bakFile);
		console.log(`   📦 Backup: ${path.basename(bakFile)}`);
	}
}

// ============================================================
// GŁÓWNA LOGIKA
// ============================================================

console.log(`\n📄 Przetwarzam: ${path.basename(jsxFile)}`);

// KROK 1: Backup
backup(jsxFile);
if (fs.existsSync(cssFile)) backup(cssFile);

// KROK 2: Zmień nazwę CSS → CSS module
if (fs.existsSync(cssFile) && !fs.existsSync(cssModuleFile)) {
	fs.renameSync(cssFile, cssModuleFile);
	console.log(
		`   📝 Zmieniono nazwę: ${path.basename(cssFile)} → ${path.basename(cssModuleFile)}`,
	);
} else if (fs.existsSync(cssModuleFile)) {
	console.log(`   ✔ CSS module już istnieje`);
} else {
	console.log(`   ⚠ Nie znaleziono CSS`);
}

// KROK 3: Konwersja JSX
if (!fs.existsSync(jsxFile)) {
	console.log(`   ⚠ Nie znaleziono JSX`);
	process.exit(1);
}

let jsxContent = fs.readFileSync(jsxFile, "utf8");

// 3a: Zamień className="..." → className={styles....}
jsxContent = jsxContent.replace(/className="([^"]+)"/g, (_, classes) => {
	const parts = classes.split(/\s+/).filter(Boolean);
	const converted = parts.map((c) => `styles.${toCamelCase(c)}`);
	if (converted.length === 1) {
		return `className={${converted[0]}}`;
	}
	return `className={\`${converted.map((c) => `\${${c}}`).join(" ")}\`}`;
});

// 3b: Zamień import CSS → CSS module
jsxContent = jsxContent.replace(
	/import "\.\/resolutions\.css";/,
	'import styles from "./resolutions.module.css";',
);

fs.writeFileSync(jsxFile, jsxContent);
console.log(`   ✔ JSX zaktualizowany`);

// KROK 4: Konwersja CSS
if (fs.existsSync(cssModuleFile)) {
	let cssContent = fs.readFileSync(cssModuleFile, "utf8");

	cssContent = cssContent.replace(
		/\.([a-zA-Z][a-zA-Z0-9_-]*)/g,
		(_, className) => {
			return `.${toCamelCase(className)}`;
		},
	);

	fs.writeFileSync(cssModuleFile, cssContent);
	console.log(`   ✔ CSS zaktualizowany`);
}

console.log("\n✅ Gotowe!");
console.log("\nSprawdź:");
console.log("  " + jsxFile);
console.log("  " + cssModuleFile);
