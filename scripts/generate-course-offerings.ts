/// <reference types="node" />

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TERMS } from "../src/utils/constants.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputPath = resolve(root, "public/generated/course-offerings.json");

const SQL = `SELECT term, course_pid AS pid
FROM sections
WHERE course_pid IS NOT NULL AND course_pid != ''
GROUP BY term, course_pid
ORDER BY term, course_pid`;

type Target = "local" | "remote";

type Options = {
	target: Target;
	database: string;
	outputPath: string;
};

type D1ExecuteResponse = Array<{
	results?: Array<{ term?: string; pid?: string }>;
	success?: boolean;
}>;

const options = parseOptions(process.argv.slice(2));
const response = JSON.parse(
	execFileSync(
		"npx",
		[
			"wrangler",
			"d1",
			"execute",
			options.database,
			options.target === "remote" ? "--remote" : "--local",
			"--json",
			"--command",
			SQL,
		],
		{ cwd: root, encoding: "utf8" },
	),
) as D1ExecuteResponse;

const offerings = Object.fromEntries(
	TERMS.map((term) => [term.value, [] as string[]]),
) as Record<string, string[]>;

for (const row of response.flatMap((result) => result.results ?? [])) {
	if (!row.term || !row.pid) continue;
	offerings[row.term] ??= [];
	offerings[row.term].push(row.pid);
}

for (const [term, pids] of Object.entries(offerings)) {
	offerings[term] = Array.from(new Set(pids)).sort();
}

mkdirSync(dirname(options.outputPath), { recursive: true });
writeFileSync(options.outputPath, `${JSON.stringify(offerings)}\n`);

const summary = Object.entries(offerings)
	.map(([term, pids]) => `${term}: ${pids.length}`)
	.join(", ");
console.info(`Generated course offerings at ${options.outputPath} (${summary})`);

function parseOptions(args: string[]): Options {
	if (args.includes("--help") || args.includes("-h")) {
		console.info(`Usage: node scripts/generate-course-offerings.ts [options]

Options:
  --target <local|remote>       D1 target (default: local)
  --database <name>             D1 database name (default: course-flow-v4)
  --output <path>               Output JSON path (default: public/generated/course-offerings.json)
`);
		process.exit(0);
	}

	const target = readOption(args, "--target") ?? "local";
	if (target !== "local" && target !== "remote") {
		throw new Error("--target must be local or remote");
	}

	return {
		target,
		database: readOption(args, "--database") ?? "course-flow-v4",
		outputPath: resolve(root, readOption(args, "--output") ?? defaultOutputPath),
	};
}

function readOption(args: string[], name: string): string | undefined {
	const inline = args.find((arg) => arg.startsWith(`${name}=`));
	if (inline) return inline.slice(name.length + 1);

	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}
