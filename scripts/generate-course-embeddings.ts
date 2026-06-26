/// <reference types="node" />

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MODEL = "nomic-embed-text";
const DEFAULT_ALGORITHM_VERSION = "nomic-embed-text:v1";

type Target = "local" | "remote";

type CourseRow = {
	pid: string;
	subject_code: string;
	title: string;
	description: string;
	credits: string;
	hours_catalog_text: string;
	notes: string;
	pre_and_corequisites: string;
};

type ExistingEmbeddingRow = {
	course_pid: string;
	input_hash: string;
	embedding_json: string;
};

type EmbeddedCourse = CourseRow & {
	input: string;
	inputHash: string;
	embedding: number[];
	norm: number;
};

type Options = {
	target: Target;
	database: string;
	model: string;
	ollamaUrl: string;
	algorithmVersion: string;
	top: number;
	limit?: number;
	dryRun: boolean;
};

const options = parseOptions(process.argv.slice(2));
const courses = await queryD1<CourseRow>(
	`SELECT pid, subject_code, title, description, credits, hours_catalog_text, notes, pre_and_corequisites
FROM courses
ORDER BY subject_code`,
	options,
);
const selectedCourses = options.limit ? courses.slice(0, options.limit) : courses;
const existingRows = await queryD1<ExistingEmbeddingRow>(
	`SELECT course_pid, input_hash, embedding_json FROM course_embeddings WHERE model = '${escapeSql(options.model)}'`,
	options,
);
const existingByPid = new Map(existingRows.map((row) => [row.course_pid, row]));

console.info(
	`Embedding ${selectedCourses.length} courses with ${options.model} (${options.target})`,
);

const embeddedCourses: EmbeddedCourse[] = [];
let embeddedCount = 0;
let reusedCount = 0;

for (const course of selectedCourses) {
	const input = courseEmbeddingText(course);
	const inputHash = sha256(input);
	const existing = existingByPid.get(course.pid);
	let embedding: number[] | null = null;

	if (existing?.input_hash === inputHash) {
		embedding = parseEmbedding(existing.embedding_json);
		reusedCount++;
	}

	if (!embedding) {
		embedding = await embed(input, options);
		embeddedCount++;
		console.info(`embedded ${course.subject_code} (${embeddedCount} new)`);
	}

	embeddedCourses.push({
		...course,
		input,
		inputHash,
		embedding,
		norm: vectorNorm(embedding),
	});
}

const recommendations = computeRecommendations(embeddedCourses, options.top);
const outputSql = buildSql(embeddedCourses, recommendations, options);
const sqlPath = resolve(
	root,
	`.wrangler/tmp/course-embeddings-${options.target}.sql`,
);
mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, outputSql);

console.info(
	`Prepared ${embeddedCourses.length} embeddings and ${recommendations.length} recommendations (${embeddedCount} new, ${reusedCount} reused)`,
);
console.info(`SQL written to ${sqlPath}`);

if (!options.dryRun) {
	execFileSync(
		"npx",
		[
			"wrangler",
			"d1",
			"execute",
			options.database,
			options.target === "remote" ? "--remote" : "--local",
			"--file",
			sqlPath,
		],
		{ cwd: root, stdio: "inherit" },
	);
}

function courseEmbeddingText(course: CourseRow) {
	return [
		course.subject_code,
		course.title,
		course.description,
		course.pre_and_corequisites &&
			`Prerequisites and corequisites: ${course.pre_and_corequisites}`,
		course.notes && `Notes: ${course.notes}`,
		course.hours_catalog_text && `Hours: ${course.hours_catalog_text}`,
	]
		.filter(Boolean)
		.join("\n");
}

async function embed(input: string, options: Options): Promise<number[]> {
	const response = await fetch(`${options.ollamaUrl}/api/embeddings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: options.model, prompt: input }),
	});

	if (!response.ok) {
		throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
	}

	const body: unknown = await response.json();
	if (!isRecord(body) || !Array.isArray(body.embedding)) {
		throw new Error("Ollama response did not include an embedding array");
	}

	return body.embedding.map((value) => {
		if (typeof value !== "number") throw new Error("Embedding contained a non-number");
		return value;
	});
}

function computeRecommendations(courses: EmbeddedCourse[], top: number) {
	const output: Array<{
		source: EmbeddedCourse;
		related: EmbeddedCourse;
		semanticScore: number;
		lexicalScore: number;
		levelScore: number;
		discoveryScore: number;
		finalScore: number;
		reasons: string[];
		rank: number;
	}> = [];

	for (const source of courses) {
		const scored = courses
			.filter((candidate) => candidate.pid !== source.pid)
			.map((candidate) => {
				const semanticScore = cosine(source, candidate);
				const lexicalScore = lexicalOverlap(source, candidate);
				const levelScore = levelCompatibility(source.subject_code, candidate.subject_code);
				const crossSubject = subjectPrefix(source.subject_code) !== subjectPrefix(candidate.subject_code);
				const discoveryScore = crossSubject ? 1 : 0;
				const finalScore =
					semanticScore * 0.78 +
					lexicalScore * 0.09 +
					levelScore * 0.08 +
					discoveryScore * 0.05;

				return {
					source,
					related: candidate,
					semanticScore,
					lexicalScore,
					levelScore,
					discoveryScore,
					finalScore,
					reasons: reasons({ crossSubject, semanticScore, levelScore }),
				};
			})
			.sort((a, b) => b.finalScore - a.finalScore)
			.slice(0, top);

		scored.forEach((recommendation, index) => {
			output.push({ ...recommendation, rank: index + 1 });
		});
	}

	return output;
}

function buildSql(
	courses: EmbeddedCourse[],
	recommendations: ReturnType<typeof computeRecommendations>,
	options: Options,
) {
	const now = new Date().toISOString();
	const lines = ["PRAGMA foreign_keys = ON;"];
	const wrapTransaction = options.target === "local";
	if (wrapTransaction) lines.push("BEGIN TRANSACTION;");

	for (const course of courses) {
		lines.push(
			`INSERT INTO course_embeddings (course_pid, model, dimensions, embedding_json, input_hash, embedded_at)
VALUES (${sqlValue(course.pid)}, ${sqlValue(options.model)}, ${course.embedding.length}, ${sqlValue(JSON.stringify(course.embedding))}, ${sqlValue(course.inputHash)}, ${sqlValue(now)})
ON CONFLICT(course_pid) DO UPDATE SET
  model = excluded.model,
  dimensions = excluded.dimensions,
  embedding_json = excluded.embedding_json,
  input_hash = excluded.input_hash,
  embedded_at = excluded.embedded_at;`,
		);
	}

	lines.push(
		`DELETE FROM course_recommendations WHERE algorithm_version = ${sqlValue(options.algorithmVersion)};`,
	);

	for (const recommendation of recommendations) {
		lines.push(
			`INSERT INTO course_recommendations (source_pid, related_pid, model, algorithm_version, semantic_score, lexical_score, prereq_score, level_score, discovery_score, final_score, reasons_json, recommendation_rank, computed_at)
VALUES (${sqlValue(recommendation.source.pid)}, ${sqlValue(recommendation.related.pid)}, ${sqlValue(options.model)}, ${sqlValue(options.algorithmVersion)}, ${recommendation.semanticScore}, ${recommendation.lexicalScore}, 0, ${recommendation.levelScore}, ${recommendation.discoveryScore}, ${recommendation.finalScore}, ${sqlValue(JSON.stringify(recommendation.reasons))}, ${recommendation.rank}, ${sqlValue(now)});`,
		);
	}

	if (wrapTransaction) lines.push("COMMIT;");
	return `${lines.join("\n\n")}\n`;
}

async function queryD1<T>(command: string, options: Options): Promise<T[]> {
	const raw = execFileSync(
		"npx",
		[
			"wrangler",
			"d1",
			"execute",
			options.database,
			options.target === "remote" ? "--remote" : "--local",
			"--json",
			"--command",
			command,
		],
		{
			cwd: root,
			encoding: "utf8",
			maxBuffer: 512 * 1024 * 1024,
		},
	);
	const parsed: unknown = JSON.parse(raw);
	if (!Array.isArray(parsed)) return [];
	const first = parsed[0];
	if (!isRecord(first)) return [];
	const results = first.results;
	return Array.isArray(results) ? (results as T[]) : [];
}

function lexicalOverlap(a: CourseRow, b: CourseRow) {
	const aTokens = tokenSet(`${a.title} ${a.description}`);
	const bTokens = tokenSet(`${b.title} ${b.description}`);
	let overlap = 0;
	for (const token of aTokens) {
		if (bTokens.has(token)) overlap++;
	}
	return overlap / Math.max(1, Math.sqrt(aTokens.size * bTokens.size));
}

function levelCompatibility(a: string, b: string) {
	const aLevel = courseLevel(a);
	const bLevel = courseLevel(b);
	if (aLevel === null || bLevel === null) return 0.5;
	const distance = Math.abs(aLevel - bLevel);
	if (distance === 0) return 1;
	if (distance === 100) return 0.75;
	if (distance === 200) return 0.35;
	return 0.1;
}

function reasons(input: {
	crossSubject: boolean;
	semanticScore: number;
	levelScore: number;
}) {
	const reasons = ["Similar topic"];
	if (input.levelScore >= 0.75) reasons.push("Same level");
	if (input.crossSubject) reasons.push("Cross-subject");
	if (input.semanticScore >= 0.82) reasons.push("Strong match");
	return reasons;
}

function cosine(a: EmbeddedCourse, b: EmbeddedCourse) {
	let dot = 0;
	for (let i = 0; i < a.embedding.length; i++) {
		dot += a.embedding[i] * (b.embedding[i] ?? 0);
	}
	return dot / Math.max(1e-9, a.norm * b.norm);
}

function vectorNorm(values: number[]) {
	return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
}

function tokenSet(value: string) {
	return new Set(
		value
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((token) => token.length > 3),
	);
}

function subjectPrefix(subjectCode: string) {
	return subjectCode.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? subjectCode;
}

function courseLevel(subjectCode: string) {
	const match = subjectCode.match(/\d/);
	if (!match || match.index === undefined) return null;
	const level = Number.parseInt(subjectCode.slice(match.index, match.index + 1), 10);
	return Number.isInteger(level) ? level * 100 : null;
}

function parseEmbedding(raw: string) {
	const parsed: unknown = JSON.parse(raw);
	if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
		throw new Error("Stored embedding was invalid");
	}
	return parsed as number[];
}

function sha256(input: string) {
	return createHash("sha256").update(input).digest("hex");
}

function sqlValue(value: string) {
	return `'${escapeSql(value)}'`;
}

function escapeSql(value: string) {
	return value.replaceAll("'", "''");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseOptions(args: string[]): Options {
	if (args.includes("--help") || args.includes("-h")) {
		console.info(`Usage: node scripts/generate-course-embeddings.ts [options]

Options:
  --target <local|remote>       D1 target (default: local)
  --database <name>             D1 database name (default: course-flow-v4)
  --model <name>                Ollama embedding model (default: nomic-embed-text)
  --ollama-url <url>            Ollama base URL (default: http://localhost:11434)
  --algorithm-version <name>    Recommendation version (default: nomic-embed-text:v1)
  --top <n>                     Recommendations per course (default: 24)
  --limit <n>                   Embed first n courses only
  --dry-run                     Write SQL but do not execute it
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
		model: readOption(args, "--model") ?? DEFAULT_MODEL,
		ollamaUrl: (readOption(args, "--ollama-url") ?? "http://localhost:11434").replace(/\/+$/, ""),
		algorithmVersion: readOption(args, "--algorithm-version") ?? DEFAULT_ALGORITHM_VERSION,
		top: readPositiveInt(args, "--top", 24),
		limit: readOptionalPositiveInt(args, "--limit"),
		dryRun: args.includes("--dry-run"),
	};
}

function readOption(args: string[], name: string): string | undefined {
	const inline = args.find((arg) => arg.startsWith(`${name}=`));
	if (inline) return inline.slice(name.length + 1);
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

function readPositiveInt(args: string[], name: string, defaultValue: number) {
	return readOptionalPositiveInt(args, name) ?? defaultValue;
}

function readOptionalPositiveInt(args: string[], name: string) {
	const value = readOption(args, name);
	if (value === undefined) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}
