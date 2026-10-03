import { writeFileSync } from "node:fs";
import { z } from "zod";
import { openSearch } from "../src/catalog/banner.ts";
import { parseCourse } from "../src/catalog/kuali.ts";
import type { Course, Meeting, Section } from "../src/catalog/model.ts";

async function fetchSections(term: string): Promise<Section[]> {
	const search = await openSearch(term);
	const sections = await search();
	// A bad session looks like an empty term.
	if (sections.length === 0) throw new Error(`${term}: no sections`);

	// Pruning deletes whatever this misses, so a short fetch must not pass.
	const crns = new Set(sections.map((section) => section.crn));
	if (crns.size !== sections.length) {
		throw new Error(
			`${term}: ${crns.size} unique CRNs in ${sections.length} sections`,
		);
	}
	return sections;
}

const KUALI = "https://uvic.kuali.co/api/v1/catalog";

// The September calendars cover Fall and Spring.
const CALENDARS = {
	undergrad: "69bd9d92e76504efd3e57c74",
	grad: "69bd9ce520d6996bb3322765",
};

const courseIndex = z.array(z.object({ pid: z.string() }));

// The index only has codes and titles, so each course is its own request.
// One at a time: this runs a few times a year and needn't hurry.
async function fetchCourses(calendar: string): Promise<Course[]> {
	const index = courseIndex.parse(
		await fetchKuali(`${KUALI}/courses/${calendar}`),
	);
	const courses: Course[] = [];
	for (const { pid } of index) {
		const raw = await fetchKuali(`${KUALI}/course/${calendar}/${pid}`);
		try {
			courses.push(parseCourse(raw));
		} catch (error) {
			throw new Error(`course ${pid} in calendar ${calendar}`, {
				cause: error,
			});
		}
	}
	return courses;
}

// Across thousands of requests Kuali sometimes answers 500 or drops the
// connection, and the same request succeeds moments later.
async function fetchKuali(url: string): Promise<unknown> {
	for (let attempt = 1; ; attempt++) {
		try {
			const response = await fetch(url, {
				signal: AbortSignal.timeout(30_000),
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			if (attempt === 3) {
				throw new Error(`${url} failed 3 times`, { cause: error });
			}
		}
		await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
	}
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
		enrollment_updated_at: NOW,
		updated_at: NOW,
	};
	return upsert("sections", ["term", "crn"], row);
}

function upsertCourse(course: Course): string {
	const row = {
		pid: sql(course.pid),
		subject_code: sql(course.code),
		title: sql(course.title),
		description: sql(course.description ?? ""),
		credits: sql(course.credits ?? ""),
		hours_catalog_text: sql(course.hours ?? ""),
		notes: sql(course.notes.join("\n")),
		// Left as-is on existing courses, so the deployed app keeps showing
		// the old text until it reads requisites instead.
		pre_and_corequisites: sql(""),
		requisites: sql(
			JSON.stringify({
				prerequisites: course.prerequisites,
				preOrCorequisites: course.preOrCorequisites,
				corequisites: course.corequisites,
				recommendations: course.recommendations,
			}),
		),
		updated_at: NOW,
	};
	return upsert("courses", ["pid"], row, ["pre_and_corequisites"]);
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function upsert(
	table: string,
	key: string[],
	row: Record<string, string>,
	keep: string[] = [],
): string {
	const columns = Object.keys(row);
	const updates = columns
		.filter((column) => !key.includes(column) && !keep.includes(column))
		.map((column) => `${column} = excluded.${column}`);
	return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${Object.values(row).join(", ")}) ON CONFLICT(${key.join(", ")}) DO UPDATE SET ${updates.join(", ")};`;
}

// Usage, courses first so sections can link to them:
//   nub scripts/import.ts courses > .wrangler/courses.sql
//   nub scripts/import.ts sections 202701 > .wrangler/sections-202701.sql
//   nubx wrangler d1 execute course-flow-v4 --remote --file <each file>
const [mode, term] = process.argv.slice(2);
if (mode === "courses") {
	const courses = [];
	for (const calendar of Object.values(CALENDARS)) {
		courses.push(...(await fetchCourses(calendar)));
	}
	console.log(courses.map(upsertCourse).join("\n"));
	// Search is built from this file at build time, so it has to list the
	// same courses as D1.
	const index = courses
		.map(({ code, pid, title }) => ({ courseID: code, pid, title }))
		.sort((a, b) =>
			a.courseID.localeCompare(b.courseID, undefined, { numeric: true }),
		);
	writeFileSync(
		"data/import/courses.json",
		`${JSON.stringify(index, null, 2)}\n`,
	);
	console.error(`${courses.length} courses`);
} else if (mode === "sections" && term) {
	const sections = await fetchSections(term);
	const crns = sections.map((section) => sql(section.crn)).join(", ");
	// Deleting a section also removes it from saved schedules, which is what
	// we want for a cancelled section, and why fetchSections must be complete.
	console.log(
		[
			...sections.map(upsertSection),
			`DELETE FROM sections WHERE term = ${sql(term)} AND crn NOT IN (${crns});`,
		].join("\n"),
	);
	console.error(`${term}: ${sections.length} sections`);
} else {
	throw new Error("usage: import.ts courses | import.ts sections <term>");
}
