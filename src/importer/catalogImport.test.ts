import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCourseEntries, parseCourseId } from "./catalogImport.shared.ts";
import { parseBannerSections } from "./uvicBanner.server.ts";
import { parseEnrollmentHtml } from "./uvicEnrollment.server.ts";
import { courseFromKuali } from "./uvicKuali.server.ts";

const fixtureRoot = resolve(process.cwd(), "tests/fixtures/uvic");

describe("UVic importer", () => {
	it("normalizes course index entries and deduplicates pids", () => {
		const entries = parseCourseEntries([
			{ courseID: "CSC230", pid: "pid-1", title: "Architecture" },
			{ __catalogCourseId: "SENG265", pid: "pid-2", title: "Software" },
			{ courseID: "CSC230", pid: "pid-1", title: "Duplicate" },
			{ courseID: "BAD" },
		]);

		expect(entries).toEqual([
			{ courseId: "CSC230", pid: "pid-1", title: "Architecture" },
			{ courseId: "SENG265", pid: "pid-2", title: "Software" },
		]);
	});

	it("parses compact catalog course ids", () => {
		expect(parseCourseId("CSC230")).toEqual({
			subject: "CSC",
			courseNumber: "230",
		});
		expect(parseCourseId("ENGR120A")).toEqual({
			subject: "ENGR",
			courseNumber: "120A",
		});
		expect(parseCourseId("ED-D101")).toEqual({
			subject: "ED-D",
			courseNumber: "101",
		});
		expect(parseCourseId("ED-P781")).toEqual({
			subject: "ED-P",
			courseNumber: "781",
		});
		expect(parseCourseId("CSC 230")).toBeNull();
	});

	it("maps Kuali course JSON into the database shape", () => {
		const course = courseFromKuali({
			pid: "HJeY5kOpXN",
			__catalogCourseId: "CSC230",
			title: "Introduction to Computer Architecture",
			description: "<p>Machine organization &amp; assembly.</p>",
			credits: { value: 1.5 },
			hoursCatalogText: "3-1.5-0",
			supplementalNotes: "<p>Notes</p>",
			preAndCorequisites: "<ul><li>CSC 115</li><li>MATH 122</li></ul>",
		});

		expect(course).toMatchObject({
			pid: "HJeY5kOpXN",
			subjectCode: "CSC230",
			title: "Introduction to Computer Architecture",
			description: "Machine organization & assembly.",
			credits: "1.5",
			hoursCatalogText: "3-1.5-0",
			notes: "Notes",
		});
		expect(course.preAndCorequisites).toContain("• CSC 115");
	});

	it("parses Banner section HTML and preserves all meeting rows", () => {
		const html = readFileSync(
			resolve(fixtureRoot, "sections_csc230.html"),
			"utf8",
		);
		const sections = parseBannerSections(html, {
			term: "202501",
			subject: "CSC",
			courseNumber: "230",
		});

		expect(sections.length).toBeGreaterThan(1);
		expect(sections[0]).toMatchObject({
			term: "202501",
			crn: "20698",
			courseName: "Introduction to Computer Architecture",
			section: "A01",
			subject: "CSC",
			courseNumber: "230",
			scheduleType: "Lecture",
			days: "MR",
			time: "10:00 am - 11:20 am",
			location: "Elliott Building 168",
			frequency: "Every Week",
			instructionalMethod: "Face-to-face",
			units: "1.500",
		});
		expect(sections[0]?.meetings).toEqual([
			expect.objectContaining({
				days: "MR",
				time: "10:00 am - 11:20 am",
				scheduleType: "Lecture",
			}),
		]);
	});

	it("parses multi-meeting sections", () => {
		const html = `<table>
<tr><th CLASS="ddtitle"><a href="/x">Organic Chemistry Lab - 31000 - CHEM 233 - B01</a></th></tr>
<tr><td CLASS="dddefault">
<table CLASS="datadisplaytable"><caption class="captiontext">Scheduled Meeting Times</caption>
<tr><th CLASS="ddheader">Type</th><th CLASS="ddheader">Time</th><th CLASS="ddheader">Days</th><th CLASS="ddheader">Where</th><th CLASS="ddheader">Date Range</th><th CLASS="ddheader">Schedule Type</th></tr>
<tr><td CLASS="dddefault">Every Week</td><td CLASS="dddefault">2:30 pm - 3:20 pm</td><td CLASS="dddefault">T</td><td CLASS="dddefault">Elliott 060</td><td CLASS="dddefault">Jan 06, 2025 - Apr 04, 2025</td><td CLASS="dddefault">Lab</td></tr>
<tr><td CLASS="dddefault">Every Week</td><td CLASS="dddefault">3:30 pm - 5:20 pm</td><td CLASS="dddefault">R</td><td CLASS="dddefault">Elliott 062</td><td CLASS="dddefault">Jan 06, 2025 - Apr 04, 2025</td><td CLASS="dddefault">Lab</td></tr>
</table>
</td></tr>
</table>`;

		const sections = parseBannerSections(html, {
			term: "202501",
			subject: "CHEM",
			courseNumber: "233",
		});

		expect(sections).toHaveLength(1);
		expect(sections[0]?.meetings).toHaveLength(2);
		expect(sections[0]?.meetings[1]).toMatchObject({
			days: "R",
			time: "3:30 pm - 5:20 pm",
			location: "Elliott 062",
		});
		expect(sections[0]).toMatchObject({ days: "T", time: "2:30 pm - 3:20 pm" });
	});

	it("parses enrollment HTML", () => {
		const html = readFileSync(
			resolve(fixtureRoot, "enrollment_20698.html"),
			"utf8",
		);

		expect(parseEnrollmentHtml(html)).toEqual({
			enrollmentActual: 90,
			enrollmentMaximum: 100,
			enrollmentSeatsAvailable: 10,
			waitlistCapacity: 40,
			waitlistActual: 0,
			waitlistSeatsAvailable: 40,
		});
	});

	it("parses negative seats available without drifting into the next field", () => {
		expect(
			parseEnrollmentHtml(`
<section>
  <span>Enrolment Actual:</span> <span>105</span>
  <span>Enrolment Maximum:</span> <span>100</span>
  <span>Enrolment Seats Available:</span> <span>-5</span>
  <span>Waitlist Capacity:</span> <span>25</span>
  <span>Waitlist Actual:</span> <span>2</span>
  <span>Waitlist Seats Available:</span> <span>23</span>
</section>`),
		).toEqual({
			enrollmentActual: 105,
			enrollmentMaximum: 100,
			enrollmentSeatsAvailable: -5,
			waitlistCapacity: 25,
			waitlistActual: 2,
			waitlistSeatsAvailable: 23,
		});
	});

	it("accepts Banner's Enrollment spelling variant", () => {
		expect(
			parseEnrollmentHtml(`
<section>
  <span>Enrollment Actual:</span> <span>30</span>
  <span>Enrollment Maximum:</span> <span>30</span>
  <span>Enrollment Seats Available:</span> <span>0</span>
  <span>Waitlist Capacity:</span> <span>25</span>
  <span>Waitlist Actual:</span> <span>2</span>
  <span>Waitlist Seats Available:</span> <span>23</span>
</section>`),
		).toEqual({
			enrollmentActual: 30,
			enrollmentMaximum: 30,
			enrollmentSeatsAvailable: 0,
			waitlistCapacity: 25,
			waitlistActual: 2,
			waitlistSeatsAvailable: 23,
		});
	});
});
