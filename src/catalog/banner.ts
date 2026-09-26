import { z } from "zod";
import type { Section } from "./model";

// Every value seen across Summer 2026, Fall 2026 and Spring 2027, plus
// Seminar, which Banner's own lookup lists.
const scheduleType = z.enum([
	"Lecture",
	"Lab",
	"Lecture Topic",
	"Tutorial",
	"Seminar",
	"Practicum",
	"Gradable Lab",
	"Work Term",
	"Individually Supervised Study",
]);

const instructionalMethod = z.enum([
	"Face-to-face",
	"Fully Online",
	"Blended",
	"Online with some face-to-face",
	"Course with Field Component",
	"Multi-Access",
	"Work Term and Exchange Courses",
]);

// One section from Banner 9's searchResults. The formats are the ones seen
// across every section in Summer 2026, Fall 2026 and Spring 2027; anything
// else fails loudly instead of being imported wrong.
const bannerSection = z
	.object({
		term: z.string().regex(/^\d{6}$/),
		courseReferenceNumber: z.string().regex(/^\d{5}$/),
		subject: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?$/),
		courseNumber: z.string().regex(/^\d{3}[A-Z]?$/),
		sequenceNumber: z.string().regex(/^[A-Z]\d{2}$/),
		courseTitle: z.string().min(1),
		scheduleTypeDescription: scheduleType,
		instructionalMethodDescription: instructionalMethod,
		partOfTerm: z.string().regex(/^(\d|\d[A-Z]|[A-Z]\d)$/),
		creditHours: z.number().nonnegative().nullable(),
		linkIdentifier: z
			.string()
			.regex(/^[A-Z]\d$/)
			.nullable(),
		crossList: z
			.string()
			.regex(/^[0-9A-Z]{2}$/)
			.nullable(),
		crossListAvailable: z.number().int().nullable(),
	})
	.transform((raw) => ({
		term: raw.term,
		crn: raw.courseReferenceNumber,
		subject: raw.subject,
		courseNumber: raw.courseNumber,
		section: raw.sequenceNumber,
		title: raw.courseTitle,
		scheduleType: raw.scheduleTypeDescription,
		instructionalMethod: raw.instructionalMethodDescription,
		partOfTerm: raw.partOfTerm,
		credits: raw.creditHours,
		linkId: raw.linkIdentifier,
		crossList: raw.crossList,
		crossListAvailable: raw.crossListAvailable,
	}));

export function parseSection(raw: unknown): Section {
	return bannerSection.parse(raw);
}
