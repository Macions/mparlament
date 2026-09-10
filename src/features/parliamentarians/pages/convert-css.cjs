const fs = require("fs");

const input = "./Parliamentarians.module.css";
const output = "./Parliamentarians.module.css";

let css = fs.readFileSync(input, "utf8");

css = css.replace(
	/\.([a-zA-Z][a-zA-Z0-9]*(?:[-_]{1,2}[a-zA-Z0-9]+)*)/g,
	(_, name) => {
		const camel = name
			.replace(/[-_]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
			.replace(/^([A-Z])/, (_, c) => c.toLowerCase());
		return "." + camel;
	},
);

css = css.replace(
	/\.([a-zA-Z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)/g,
	(_, a, b) => {
		const combined = a + b.charAt(0).toUpperCase() + b.slice(1);
		return "." + combined;
	},
);

fs.writeFileSync(output, css);
console.log("Zapisano:", output);
