import { JSDOM } from "jsdom";
import { z } from "zod";
import type { Course, Requirement } from "./model";

const { document } = new JSDOM().window;

// Kuali sends credit amounts as strings or numbers, e.g. "1.5", ".75", 0,
// and "to be determined" for two GEOG theses.
const amount = z.union([
	z
		.union([z.string().regex(/^\d*\.?\d+$/), z.number().nonnegative()])
		.transform((value) => String(Number(value))),
	z.literal("to be determined"),
]);

const range = z.object({ min: amount, max: amount });

const credits = z.union([
	z
		.object({
			chosen: z.literal("fixed"),
			credits: range,
			value: z.unknown().optional(),
		})
		.refine((c) => c.credits.min === c.credits.max, {
			message: "fixed credits must have min equal to max",
		})
		// Two courses have no value and a 0/0 range; Banner gives one of them
		// 1.5, so it means unset, not zero.
		.transform((c) => (c.value === undefined ? null : c.credits.min)),
	z
		.object({ chosen: z.literal("range"), credits: range })
		.transform((c) => `${c.credits.min}–${c.credits.max}`),
	z
		.object({ chosen: z.literal("multiple"), value: z.array(amount).min(2) })
		.transform((c) => c.value.join(" or ")),
]);

// One course from Kuali's catalog API. Formats are the ones seen across the
// September 2026 undergraduate and graduate calendars.
const kualiCourse = z
	.object({
		pid: z.string().regex(/^[\w-]+$/),
		__catalogCourseId: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?\d{3}[A-Z]?$/),
		title: z.string().trim().min(1),
		description: z.string().optional(),
		supplementalNotes: z.string().optional(),
		credits,
		hoursCatalogText: z.string().optional(),
		preAndCorequisites: z.string().optional(),
		preOrCorequisites: z.string().optional(),
		corequisites: z.string().optional(),
		recommendations: z.string().optional(),
	})
	.transform((raw) => ({
		pid: raw.pid,
		code: raw.__catalogCourseId,
		title: raw.title,
		description: textBlocks(raw.description ?? "").join("\n") || null,
		notes: textBlocks(raw.supplementalNotes ?? ""),
		credits: raw.credits,
		hours: raw.hoursCatalogText || null,
		prerequisites: requirements(raw.preAndCorequisites),
		preOrCorequisites: requirements(raw.preOrCorequisites),
		corequisites: requirements(raw.corequisites),
		recommendations: textBlocks(raw.recommendations ?? ""),
	}));

export function parseCourse(raw: unknown): Course {
	return kualiCourse.parse(raw);
}

// Kuali renders requisites as nested lists: a group is an <li> with a
// "Complete … of the following" <span> and a <ul> of children, and a rule
// is an <li data-test="ruleView-…"> holding a course list or free text.
function requirements(html: string | undefined): Requirement | null {
	if (html === undefined) return null;
	const root = document.createElement("div");
	root.innerHTML = html;
	// ENSH326's corequisites are a placeholder Kuali never filled in.
	if (root.textContent?.trim() === "Rule Not Selected") return null;
	const list = root.querySelector("ul");
	if (!list) throw new Error(`requisites without a list: ${html}`);
	const items = children(list);
	return items.length === 1 ? items[0] : { type: "all", items };
}

// Kuali sometimes wraps a nested group in a <div> with an empty header span.
function children(list: Element): Requirement[] {
	return (
		[...list.children]
			.flatMap((child) => {
				if (child.tagName === "LI") return [requirement(child)];
				if (child.tagName === "DIV") {
					return [...child.querySelectorAll(":scope > li")].map(requirement);
				}
				throw new Error(`unexpected <${child.tagName}> in a requisite list`);
			})
			// ENGR121 and SOCI430A each have an empty "Complete all of:" list.
			.filter((item) => item.type !== "courses" || item.courses.length > 0)
	);
}

function requirement(item: Element): Requirement {
	const test = item.getAttribute("data-test");
	if (test?.startsWith("ruleView-")) {
		const result = item.querySelector(`:scope > [data-test="${test}-result"]`);
		if (!result) throw new Error(`rule ${test} has no result`);
		return rule(result);
	}
	const header = text(item.querySelector(":scope > span"));
	const list = item.querySelector(":scope > ul");
	if (!list) throw new Error(`group "${header}" has no list`);
	const items = children(list);
	if (header === "Complete all of the following") return { type: "all", items };
	const some = header.match(/^Complete (\d+) of the following$/);
	if (some) return { type: "some", count: Number(some[1]), items };
	throw new Error(`unknown group wording: "${header}"`);
}

// Every course-list wording in the calendars. The grade and count sit in
// their own <span>s, so they're matched after the header is flattened.
const COURSE_LISTS: [RegExp, Timing][] = [
	[/^Complete (?<need>all|\d+) of:$/, "completed"],
	[/^Complete (?<units>[\d.]+) units from:$/, "completed"],
	// IGOV693 leaves out "units": "Complete 1.5 of:" two 1.5-unit courses.
	[/^Complete (?<units>\d+\.\d+) of:$/, "completed"],
	[/^Completed or concurrently enrolled in (?<need>all|\d+) of:$/, "either"],
	[/^Concurrently enrolled in(?: (?<need>\d+) of)?:$/, "concurrent"],
	[
		/^Earn a minimum grade of (?<grade>[A-D][+-]?) in each of the following:$/,
		"completed",
	],
	[
		/^Earned a minimum grade of (?<grade>[A-D][+-]?) in (?<need>\d+) of:$/,
		"completed",
	],
	[
		/^Completed with a minimum GPA of (?<gpa>[\d.]+) all of the following:$/,
		"completed",
	],
];

type Timing = "completed" | "concurrent" | "either";

function rule(result: Element): Requirement {
	const list = result.querySelector("ul");
	if (!list) return { type: "text", text: text(result) };

	// Codes come from the link text: many links point at retired courses
	// that aren't in either calendar.
	const courses = [...list.querySelectorAll(":scope > li a")].map((a) =>
		text(a),
	);
	const flattened = result.cloneNode(true) as Element;
	flattened.querySelector("ul")?.remove();
	let header = text(flattened);

	// PAAS228 and PAAS229 leave the count out ("… grade of B in of:"). With
	// one course, 1 is the only reading.
	if (header.endsWith(" in of:")) {
		if (courses.length !== 1) throw new Error(`no count: "${header}"`);
		header = header.replace(/ in of:$/, " in 1 of:");
	}

	for (const [pattern, timing] of COURSE_LISTS) {
		const groups = header.match(pattern)?.groups;
		if (!groups) continue;
		return {
			type: "courses",
			need: groups.units
				? { units: Number(groups.units) }
				: groups.need && groups.need !== "all"
					? Number(groups.need)
					: "all",
			timing,
			minGrade: groups.grade ?? null,
			minGpa: groups.gpa ? Number(groups.gpa) : null,
			courses,
		};
	}
	throw new Error(`unknown course-list wording: "${header}"`);
}

function text(element: Element | null): string {
	return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

// The text of each list item, or else each paragraph, or else the whole
// fragment, one line per <br>.
function textBlocks(html: string): string[] {
	const root = document.createElement("div");
	root.innerHTML = html;
	for (const br of root.querySelectorAll("br")) br.replaceWith("\n");
	const items = root.querySelectorAll("li");
	const paragraphs = root.querySelectorAll("p");
	const blocks =
		items.length > 0
			? [...items]
			: paragraphs.length > 0
				? [...paragraphs]
				: [root];
	return blocks
		.flatMap((block) => (block.textContent ?? "").split("\n"))
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean);
}
