import { z } from "zod";
import { parseSection } from "../src/catalog/banner.ts";
import type { Meeting, Section } from "../src/catalog/model.ts";

const BANNER = "https://banner.uvic.ca/StudentRegistrationSsb/ssb";

// Pinned because Banner formats dates by Accept-Language, and "*" gives the
// MM/DD/YYYY that parseSection expects.
const HEADERS = { "Accept-Language": "*" };

const searchPage = z.object({
	totalCount: z.number().int(),
	data: z.array(z.unknown()),
});

async function fetchSections(term: string): Promise<Section[]> {
	// Picking a term starts a session; the search runs against its cookies.
	const session = await fetch(`${BANNER}/term/search?mode=search`, {
		method: "POST",
		headers: HEADERS,
		body: new URLSearchParams({ term }),
	});
	const headers = {
		...HEADERS,
		Cookie: session.headers
			.getSetCookie()
			.map((cookie) => cookie.split(";")[0])
			.join("; "),
	};
	await fetch(`${BANNER}/classSearch/resetDataForm`, {
		method: "POST",
		headers,
	});

	// Banner caps a page at 500 sections, whatever pageMaxSize asks for.
	const sections: Section[] = [];
	let total = Number.POSITIVE_INFINITY;
	while (sections.length < total) {
		const query = new URLSearchParams({
			txt_term: term,
			pageOffset: String(sections.length),
			pageMaxSize: "500",
		});
		const response = await fetch(
			`${BANNER}/searchResults/searchResults?${query}`,
			{ headers },
		);
		const page = searchPage.parse(await response.json());
		total = page.totalCount;
		// A bad session looks like an empty term: totalCount 0, no data.
		if (page.data.length === 0) {
			throw new Error(
				`${term}: no sections at offset ${sections.length} of ${total}`,
			);
		}
		sections.push(...page.data.map(parseSection));
	}

	// Pruning deletes whatever this misses, so a short fetch must not pass.
	const crns = new Set(sections.map((section) => section.crn));
	if (crns.size !== total) {
		throw new Error(`${term}: ${crns.size} unique CRNs, expected ${total}`);
	}
	return sections;
}

// The app still reads the formatted strings Banner 8 gave us. This bridge
// goes away once it reads Section directly (#52).
function legacyMeeting(section: Section, meeting: Meeting) {
	return {
		frequency: "Every Week",
		time:
			meeting.start === null || meeting.end === null
				? "TBA"
				: `${clock(meeting.start)} - ${clock(meeting.end)}`,
		days: meeting.days.map((day) => "UMTWRFS"[day]).join(""),
		location: "",
		dateRange: `${longDate(meeting.startDate)} - ${longDate(meeting.endDate)}`,
		scheduleType: section.scheduleType,
	};
}

// 570 → "9:30 am"
function clock(minutes: number): string {
	const hour = Math.floor(minutes / 60);
	const minute = String(minutes % 60).padStart(2, "0");
	return `${hour % 12 || 12}:${minute} ${hour < 12 ? "am" : "pm"}`;
}

const MONTHS = "JanFebMarAprMayJunJulAugSepOctNovDec";

// "2027-01-06" → "Jan 06, 2027"
function longDate(iso: string): string {
	const [year, month, day] = iso.split("-");
	const name = MONTHS.slice((Number(month) - 1) * 3, Number(month) * 3);
	return `${name} ${day}, ${year}`;
}

function sql(value: string | number | null): string {
	if (value === null) return "NULL";
	if (typeof value === "number") return String(value);
	return `'${value.replaceAll("'", "''")}'`;
}

function upsertSection(section: Section): string {
	const meetings = section.meetings.map((m) => legacyMeeting(section, m));
	const first = meetings[0];
	const row = {
		term: sql(section.term),
		crn: sql(section.crn),
		// Null until Kuali has the course, as with graduate courses today.
		course_pid: `(SELECT pid FROM courses WHERE subject_code = ${sql(section.subject + section.courseNumber)})`,
		subject: sql(section.subject),
		course_number: sql(section.courseNumber),
		course_name: sql(section.title),
		section: sql(section.section),
		schedule_type: sql(section.scheduleType),
		instructional_method: sql(section.instructionalMethod),
		frequency: sql(first?.frequency ?? ""),
		time: sql(first?.time ?? ""),
		days: sql(first?.days ?? ""),
		location: sql(""),
		date_range: sql(first?.dateRange ?? ""),
		units: sql(section.credits?.toFixed(3) ?? ""),
		additional_information: sql(""),
		enrollment_actual: sql(section.seats.enrolled),
		enrollment_maximum: sql(section.seats.capacity),
		enrollment_seats_available: sql(section.seats.available),
		waitlist_capacity: sql(section.waitlist.capacity),
		waitlist_actual: sql(section.waitlist.enrolled),
		waitlist_seats_available: sql(section.waitlist.available),
		meetings: sql(JSON.stringify(meetings)),
		enrollment_updated_at: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
		updated_at: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
	};
	const columns = Object.keys(row);
	const updates = columns
		.filter((column) => column !== "term" && column !== "crn")
		.map((column) => `${column} = excluded.${column}`);
	return `INSERT INTO sections (${columns.join(", ")}) VALUES (${Object.values(row).join(", ")}) ON CONFLICT(term, crn) DO UPDATE SET ${updates.join(", ")};`;
}

// Usage:
//   nub scripts/import.ts 202701 > .wrangler/import.sql
//   nubx wrangler d1 execute course-flow-v4 --remote --file .wrangler/import.sql
const term = process.argv[2];
const sections = await fetchSections(term);
const crns = sections.map((section) => sql(section.crn)).join(", ");
// Deleting a section also removes it from saved schedules, which is what we
// want for a cancelled section, and why fetchSections must be complete.
console.log(
	[
		...sections.map(upsertSection),
		`DELETE FROM sections WHERE term = ${sql(term)} AND crn NOT IN (${crns});`,
	].join("\n"),
);
console.error(`${term}: ${sections.length} sections`);
