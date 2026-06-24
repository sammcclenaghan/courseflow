import type {
	FetchOptions,
	ImportedSection,
	Meeting,
	ParsedCourseId,
} from "./catalogImport.types.ts";
import { fetchText } from "./uvicHttp.server.ts";
import { htmlToText } from "./uvicText.shared.ts";

export async function fetchSectionsForCourse(
	input: ParsedCourseId & { term: string; coursePid?: string },
	options: FetchOptions = {},
): Promise<ImportedSection[]> {
	const endpoint = new URL(
		"https://www.uvic.ca/BAN1P/bwckctlg.p_disp_listcrse",
	);
	endpoint.search = new URLSearchParams({
		term_in: input.term.trim(),
		subj_in: input.subject.trim().toUpperCase(),
		crse_in: input.courseNumber.trim(),
		schd_in: "",
	}).toString();

	const html = await fetchText(endpoint, {
		fetchFn: options.fetchFn,
		timeoutMs: options.timeoutMs,
		redirect: "manual",
		headers: { "User-Agent": "Mozilla/5.0" },
	});

	return parseBannerSections(html, input).map((section) => ({
		...section,
		coursePid: input.coursePid ?? section.coursePid,
	}));
}

export function parseBannerSections(
	html: string,
	input: ParsedCourseId & { term: string },
): ImportedSection[] {
	const titleMatches = findElements(html, "th", "ddtitle");
	const sections: ImportedSection[] = [];

	for (let index = 0; index < titleMatches.length; index++) {
		const title = htmlToText(titleMatches[index]?.innerHtml ?? "");
		if (title === "") continue;

		const nextStart = titleMatches[index + 1]?.start ?? html.length;
		const block = html.slice(titleMatches[index]?.end ?? 0, nextStart);
		const section = sectionFromTitle(title, input);
		parseSectionDetails(block, section);
		sections.push(section);
	}

	return sections;
}

function sectionFromTitle(
	title: string,
	input: ParsedCourseId & { term: string },
): ImportedSection {
	const parts = title.split(" - ").map((part) => part.trim());

	return {
		term: input.term,
		crn: parts[1] ?? "",
		coursePid: null,
		subject: input.subject,
		courseNumber: input.courseNumber,
		courseName: parts[0] ?? title,
		section: parts[3] ?? "",
		scheduleType: "",
		instructionalMethod: "",
		frequency: "",
		time: "",
		days: "",
		location: "",
		dateRange: "",
		units: "",
		additionalInformation: "",
		enrollmentActual: 0,
		enrollmentMaximum: 0,
		enrollmentSeatsAvailable: 0,
		waitlistCapacity: 0,
		waitlistActual: 0,
		waitlistSeatsAvailable: 0,
		meetings: [],
		enrollmentRefreshed: false,
	};
}

function parseSectionDetails(block: string, section: ImportedSection) {
	const withoutTables = removeClassElements(block, "table", "datadisplaytable");
	const lines = htmlToText(withoutTables)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	for (const line of lines) {
		const credits = /^(\d+(?:\.\d+)?)\s*Credits$/.exec(line);
		if (credits) section.units = credits[1] ?? "";

		const method = /^(.*)\s+Instructional Method$/.exec(line);
		if (method) section.instructionalMethod = method[1]?.trim() ?? "";
	}

	const info: string[] = [];
	for (const line of lines) {
		if (line.includes("Associated Term:")) break;
		if (line !== section.courseName) info.push(line);
	}
	section.additionalInformation = info.join(" ");

	section.meetings = extractMeetings(block);
	const first = section.meetings[0];
	if (first) {
		section.frequency = first.frequency;
		section.time = first.time;
		section.days = first.days;
		section.location = first.location;
		section.dateRange = first.dateRange;
		section.scheduleType = first.scheduleType;
	}
}

function extractMeetings(block: string): Meeting[] {
	const scheduleTable = findElements(block, "table", "datadisplaytable")[0];
	if (!scheduleTable) return [];

	const meetings: Meeting[] = [];
	for (const row of findTagInHtml(scheduleTable.innerHtml, "tr")) {
		const cells = findTagInHtml(row.innerHtml, "td").map((cell) =>
			htmlToText(cell.innerHtml).replaceAll("\n", " "),
		);

		if (cells.length >= 6) {
			meetings.push({
				frequency: cells[0] ?? "",
				time: cells[1] ?? "",
				days: cells[2] ?? "",
				location: cells[3] ?? "",
				dateRange: cells[4] ?? "",
				scheduleType: cells[5] ?? "",
			});
		}
	}

	return meetings;
}

type ElementMatch = {
	start: number;
	end: number;
	innerHtml: string;
};

function findElements(
	html: string,
	tagName: string,
	className: string,
): ElementMatch[] {
	return findTagInHtml(html, tagName).filter((element) =>
		hasClass(element.attributes, className),
	);
}

function removeClassElements(
	html: string,
	tagName: string,
	className: string,
): string {
	let output = html;
	const elements = findElements(html, tagName, className);
	for (let index = elements.length - 1; index >= 0; index--) {
		const element = elements[index];
		if (!element) continue;
		output = `${output.slice(0, element.start)} ${output.slice(element.end)}`;
	}
	return output;
}

type TagMatch = ElementMatch & { attributes: string };

function findTagInHtml(html: string, tagName: string): TagMatch[] {
	const pattern = new RegExp(
		`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
		"gi",
	);
	const matches: TagMatch[] = [];

	for (const match of html.matchAll(pattern)) {
		matches.push({
			start: match.index ?? 0,
			end: (match.index ?? 0) + (match[0]?.length ?? 0),
			attributes: match[1] ?? "",
			innerHtml: match[2] ?? "",
		});
	}

	return matches;
}

function hasClass(attributes: string, className: string): boolean {
	const classAttr = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/i.exec(
		attributes,
	);
	const classes = classAttr?.[1] ?? classAttr?.[2] ?? classAttr?.[3] ?? "";
	return classes
		.split(/\s+/)
		.some((candidate) => candidate.toLowerCase() === className.toLowerCase());
}
