/// <reference types="node" />

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importCatalog } from "./catalogImport.server.ts";
import { parseCourseEntries, parseCourseId } from "./catalogImport.shared.ts";
import { buildCatalogImportSql } from "./catalogImport.sql.ts";
import type { CourseEntry } from "./catalogImport.types.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type Target = "local" | "remote";

type CliOptions = {
	coursesPath: string;
	term: string;
	target: Target;
	database: string;
	catalogId?: string;
	concurrency: number;
	enrollmentConcurrency: number;
	timeoutMs: number;
	delayMs: number;
	limit?: number;
	subjects: Set<string>;
	skipEnrollment: boolean;
	dryRun: boolean;
};

export async function runCatalogImportCli(args: string[]): Promise<void> {
	const options = parseOptions(args);

	if (options.term === "") {
		throw new Error(
			"Missing required --term <term>, for example --term 202609",
		);
	}

	const entries = selectEntries(
		parseCourseEntries(JSON.parse(readFileSync(options.coursesPath, "utf8"))),
		options,
	);

	console.info(
		`Importing ${entries.length} courses for term ${options.term} (${options.target}${options.dryRun ? ", dry-run" : ""})`,
	);

	const result = await importCatalog({
		entries,
		term: options.term,
		catalogId: options.catalogId,
		concurrency: options.concurrency,
		enrollmentConcurrency: options.enrollmentConcurrency,
		timeoutMs: options.timeoutMs,
		delayMs: options.delayMs,
		skipEnrollment: options.skipEnrollment,
		onProgress: (message) => console.info(message),
	});

	const report = {
		term: options.term,
		target: options.target,
		dryRun: options.dryRun,
		courses: result.courses.length,
		sections: result.sections.length,
		errors: result.errors,
		generatedAt: new Date().toISOString(),
	};

	const reportPath = resolve(
		root,
		`.wrangler/tmp/catalog-import-${options.term}.${options.target}.report.json`,
	);
	mkdirSync(dirname(reportPath), { recursive: true });
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
	console.info(`Report written to ${reportPath}`);

	if (options.dryRun) {
		console.info("Dry run complete; database was not modified.");
		process.exitCode = result.errors.length > 0 ? 1 : 0;
		return;
	}

	if (result.courses.length === 0) {
		throw new Error("No courses fetched; refusing to write an empty import");
	}

	const sql = buildCatalogImportSql({
		courses: result.courses,
		sections: result.sections,
		term: options.term,
		wrapTransaction: options.target === "local",
	});
	const sqlPath = resolve(
		root,
		`.wrangler/tmp/catalog-import-${options.term}.${options.target}.sql`,
	);
	writeFileSync(sqlPath, sql);

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

	console.info(
		`Imported ${result.courses.length} courses and ${result.sections.length} sections into ${options.database} (${options.target})`,
	);

	if (result.errors.length > 0) {
		console.warn(
			`Completed with ${result.errors.length} fetch errors; see ${reportPath}`,
		);
	}
}

function selectEntries(
	entries: CourseEntry[],
	options: CliOptions,
): CourseEntry[] {
	let selected = entries;

	if (options.subjects.size > 0) {
		selected = selected.filter((entry) => {
			const parsed = parseCourseId(entry.courseId);
			return parsed ? options.subjects.has(parsed.subject) : false;
		});
	}

	if (options.limit !== undefined) {
		selected = selected.slice(0, options.limit);
	}

	return selected;
}

function parseOptions(args: string[]): CliOptions {
	if (args.includes("--help") || args.includes("-h")) {
		console.info(`Usage: node scripts/import-catalog.ts --term 202609 [options]

Options:
  --courses <path>              Course index JSON (default: data/import/courses.json)
  --target <local|remote>       D1 target (default: local)
  --database <name>             D1 database name (default: course-flow-v4)
  --catalog <id>                Kuali catalog id override
  --subject <CSC,SENG>          Import only subject prefixes
  --limit <n>                   Import first n selected courses
  --concurrency <n>             Course/section fetch concurrency (default: 4)
  --enrollment-concurrency <n>  Enrollment fetch concurrency per course (default: 8)
  --timeout-ms <n>              Per-request timeout (default: 15000)
  --delay-ms <n>                Minimum delay between outbound UVic requests (default: 500)
  --skip-enrollment             Import timetable data without live enrollment counts
  --dry-run                     Fetch and write a report, but do not write D1
`);
		process.exit(0);
	}

	const target = readOption(args, "--target") ?? "local";
	if (target !== "local" && target !== "remote") {
		throw new Error("--target must be local or remote");
	}

	return {
		coursesPath: resolve(
			root,
			readOption(args, "--courses") ?? "data/import/courses.json",
		),
		term: readOption(args, "--term") ?? "",
		target,
		database: readOption(args, "--database") ?? "course-flow-v4",
		catalogId: readOption(args, "--catalog"),
		concurrency: readPositiveInt(args, "--concurrency", 4),
		enrollmentConcurrency: readPositiveInt(args, "--enrollment-concurrency", 8),
		timeoutMs: readPositiveInt(args, "--timeout-ms", 15_000),
		delayMs: readNonNegativeInt(args, "--delay-ms", 500),
		limit: readOptionalPositiveInt(args, "--limit"),
		subjects: new Set(
			(readOption(args, "--subject") ?? "")
				.split(",")
				.map((subject) => subject.trim().toUpperCase())
				.filter(Boolean),
		),
		skipEnrollment: args.includes("--skip-enrollment"),
		dryRun: args.includes("--dry-run"),
	};
}

function readOption(args: string[], name: string): string | undefined {
	const inline = args.find((arg) => arg.startsWith(`${name}=`));
	if (inline) return inline.slice(name.length + 1);

	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

function readPositiveInt(
	args: string[],
	name: string,
	defaultValue: number,
): number {
	return readOptionalPositiveInt(args, name) ?? defaultValue;
}

function readNonNegativeInt(
	args: string[],
	name: string,
	defaultValue: number,
): number {
	const value = readOption(args, name);
	if (value === undefined) return defaultValue;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`${name} must be a non-negative integer`);
	}
	return parsed;
}

function readOptionalPositiveInt(
	args: string[],
	name: string,
): number | undefined {
	const value = readOption(args, name);
	if (value === undefined) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}
