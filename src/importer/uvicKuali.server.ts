import { isRecord, readString } from "./catalogImport.shared.ts";
import type { FetchOptions, ImportedCourse } from "./catalogImport.types.ts";
import { fetchJson } from "./uvicHttp.server.ts";
import { htmlToStructuredText, htmlToText } from "./uvicText.shared.ts";

const DEFAULT_CATALOG_ID = "69bd9d92e76504efd3e57c74";

export type KualiFetchOptions = FetchOptions & {
	catalogId?: string;
};

export async function fetchCourseInfo(
	pid: string,
	options: KualiFetchOptions = {},
): Promise<ImportedCourse> {
	const catalogId = options.catalogId ?? DEFAULT_CATALOG_ID;
	const endpoint = `https://uvic.kuali.co/api/v1/catalog/course/${catalogId}/${encodeURIComponent(pid)}`;
	const raw = await fetchJson(endpoint, {
		fetchFn: options.fetchFn,
		timeoutMs: options.timeoutMs,
		headers: { "User-Agent": "course-flow-v4-importer/1.0" },
	});

	return courseFromKuali(raw);
}

export function courseFromKuali(raw: unknown): ImportedCourse {
	if (!isRecord(raw)) {
		throw new Error("Kuali course response must be an object");
	}

	return {
		pid: readString(raw, "pid"),
		subjectCode: readString(raw, "__catalogCourseId"),
		title: readString(raw, "title"),
		description: htmlToText(readString(raw, "description")),
		credits: parseCredits(raw.credits),
		hoursCatalogText: readString(raw, "hoursCatalogText"),
		notes: htmlToText(readString(raw, "supplementalNotes")),
		preAndCorequisites: parsePrerequisites(raw.preAndCorequisites),
	};
}

function parseCredits(value: unknown): string {
	const normalized = isRecord(value) ? value.value : value;
	if (typeof normalized === "number" && Number.isFinite(normalized)) {
		return Number.isInteger(normalized)
			? String(normalized)
			: String(normalized).replace(/0+$/, "").replace(/\.$/, "");
	}
	return typeof normalized === "string" ? normalized.trim() : "";
}

function parsePrerequisites(value: unknown): string {
	if (typeof value === "string") {
		return htmlToStructuredText(value) || htmlToText(value);
	}
	if (value === null || value === undefined) return "";
	return JSON.stringify(value);
}
