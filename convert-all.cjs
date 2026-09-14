const fs = require("fs");
const path = require("path");

// ============================================================
// KONFIGURACJA – zmień ścieżki, jeśli trzeba
// ============================================================

const files = [
	{
		jsx: "A:/mparl backend/mparlament-frontend/src/features/dashboard/pages/Dashboard.jsx",
		css: "A:/mparl backend/mparlament-frontend/src/features/dashboard/pages/Dashboard.css",
		cssModule:
			"A:/mparl backend/mparlament-frontend/src/features/dashboard/pages/Dashboard.module.css",
	},
	{
		jsx: "A:/mparl backend/mparlament-frontend/src/features/resolutions/pages/Resolutions.jsx",
		css: "A:/mparl backend/mparlament-frontend/src/features/resolutions/pages/resolutions.css",
		cssModule:
			"A:/mparl backend/mparlament-frontend/src/features/resolutions/pages/resolutions.module.css",
	},
];

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

function convertFile({ jsx, css, cssModule }) {
	console.log(`\n📄 Przetwarzam: ${path.basename(jsx)}`);

	// KROK 1: Backup
	backup(jsx);
	if (fs.existsSync(css)) backup(css);

	// KROK 2: Zmień nazwę CSS → CSS module
	if (fs.existsSync(css) && !fs.existsSync(cssModule)) {
		fs.renameSync(css, cssModule);
		console.log(
			`   📝 Zmieniono nazwę: ${path.basename(css)} → ${path.basename(cssModule)}`,
		);
	} else if (fs.existsSync(cssModule)) {
		console.log(`   ✔ CSS module już istnieje: ${path.basename(cssModule)}`);
	} else {
		console.log(`   ⚠ Nie znaleziono CSS: ${path.basename(css)}`);
	}

	// KROK 3: Konwersja JSX
	if (!fs.existsSync(jsx)) {
		console.log(`   ⚠ Nie znaleziono JSX: ${path.basename(jsx)}`);
		return;
	}

	let jsxContent = fs.readFileSync(jsx, "utf8");

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
	const cssBasename = path.basename(css).replace(".css", "");
	jsxContent = jsxContent.replace(
		new RegExp(`import "\\./${cssBasename}\\.css";`),
		`import styles from "./${cssBasename}.module.css";`,
	);

	fs.writeFileSync(jsx, jsxContent);
	console.log(`   ✔ JSX zaktualizowany`);

	// KROK 4: Konwersja CSS
	if (fs.existsSync(cssModule)) {
		let cssContent = fs.readFileSync(cssModule, "utf8");

		cssContent = cssContent.replace(
			/\.([a-zA-Z][a-zA-Z0-9_-]*)/g,
			(_, className) => {
				return `.${toCamelCase(className)}`;
			},
		);

		fs.writeFileSync(cssModule, cssContent);
		console.log(`   ✔ CSS zaktualizowany`);
	}
}

// ============================================================
// URUCHOMIENIE
// ============================================================

console.log("🚀 Konwersja CSS → CSS Modules\n");

files.forEach(convertFile);

console.log("\n✅ Gotowe!");
console.log("\nSprawdź pliki:");
files.forEach(({ jsx, cssModule }) => {
	console.log(`  ${jsx}`);
	console.log(`  ${cssModule}`);
});

console.log("\n⚠ Pamiętaj o ręcznej weryfikacji:");
console.log(
	"  - back-to-home-btn – dodaj do CSS modułu albo użyj komponentu BackButton",
);
console.log(
	"  - klasy dynamiczne (np. className={`foo ${bar}`}) – mogą wymagać ręcznej poprawki",
);
console.log("  - @import w CSS module – usuń, jeśli jest");
