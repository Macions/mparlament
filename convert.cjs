const fs = require("fs");
const path = require("path");

const dir = "A:/mparl backend/mparlament-frontend/src/features/dashboard/pages";
const jsxFile = path.join(dir, "Dashboard.jsx");
const cssFile = path.join(dir, "Dashboard.module.css");

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

// KROK 1: JSX – className="..." → className={styles....}
let jsx = fs.readFileSync(jsxFile, "utf8");

jsx = jsx.replace(/className="([^"]+)"/g, (_, classes) => {
	const parts = classes.split(/\s+/).filter(Boolean);
	const converted = parts.map((c) => `styles.${toCamelCase(c)}`);
	if (converted.length === 1) {
		return `className={${converted[0]}}`;
	}
	return `className={\`${converted.map((c) => `\${${c}}`).join(" ")}\`}`;
});

// Import
jsx = jsx.replace(
	/import "\.\/Dashboard\.css";/,
	'import styles from "./Dashboard.module.css";',
);

fs.writeFileSync(jsxFile, jsx);
console.log("✔ JSX zaktualizowany");

// KROK 2: CSS – .klasa → .camelCase
let css = fs.readFileSync(cssFile, "utf8");

css = css.replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g, (_, className) => {
	return `.${toCamelCase(className)}`;
});

fs.writeFileSync(cssFile, css);
console.log("✔ CSS zaktualizowany");

console.log("\n✅ Gotowe!");
console.log("Sprawdź:");
console.log("  " + jsxFile);
console.log("  " + cssFile);
