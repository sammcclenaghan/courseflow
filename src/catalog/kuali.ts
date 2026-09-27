import { JSDOM } from "jsdom";
import { z } from "zod";
import type { Course } from "./model";

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
		title: z.string().min(1),
		description: z.string().optional(),
		supplementalNotes: z.string().optional(),
		credits,
		hoursCatalogText: z.string().optional(),
	})
	.transform((raw) => ({
		pid: raw.pid,
		code: raw.__catalogCourseId,
		title: raw.title,
		description: textBlocks(raw.description ?? "").join("\n") || null,
		notes: textBlocks(raw.supplementalNotes ?? ""),
		credits: raw.credits,
		hours: raw.hoursCatalogText || null,
	}));

export function parseCourse(raw: unknown): Course {
	return kualiCourse.parse(raw);
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
