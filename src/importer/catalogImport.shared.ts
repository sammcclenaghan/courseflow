import type { CourseEntry, ParsedCourseId } from "./catalogImport.types.ts";

const COURSE_ID_RE = /^([A-Z]+)(\d+[A-Z]?)$/;

export function parseCourseEntries(raw: unknown): CourseEntry[] {
	if (!Array.isArray(raw)) {
		throw new Error("course index must be a JSON array");
	}

	const entries: CourseEntry[] = [];
	const seenPids = new Set<string>();

	for (const item of raw) {
		if (!isRecord(item)) continue;

		const pid = readString(item, "pid").trim();
		const courseId = (
			readString(item, "courseID") || readString(item, "__catalogCourseId")
		).trim();

		if (pid === "" || courseId === "" || seenPids.has(pid)) continue;

		seenPids.add(pid);
		entries.push({
			courseId,
			pid,
			title: readString(item, "title").trim(),
		});
	}

	return entries;
}

export function parseCourseId(courseId: string): ParsedCourseId | null {
	const match = COURSE_ID_RE.exec(courseId.trim().toUpperCase());
	if (!match) return null;
	return { subject: match[1] ?? "", courseNumber: match[2] ?? "" };
}

export async function mapConcurrent<T, R>(
	items: readonly T[],
	concurrency: number,
	mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const workerCount = Math.max(1, Math.min(concurrency, items.length));

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (nextIndex < items.length) {
				const index = nextIndex;
				nextIndex++;
				results[index] = await mapper(items[index] as T, index);
			}
		}),
	);

	return results;
}

export function readString(
	record: Record<string, unknown>,
	key: string,
): string {
	const value = record[key];
	return typeof value === "string" ? value : "";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
