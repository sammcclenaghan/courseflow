import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEnrollmentHtml } from "./uvicEnrollment.server.ts";

const fixtureRoot = resolve(process.cwd(), "tests/fixtures/uvic");

describe("parseEnrollmentHtml", () => {
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

	it("rejects negative values on fields that cannot be negative", () => {
		expect(
			parseEnrollmentHtml(`
<section>
  <span>Enrolment Actual:</span> <span>-90</span>
  <span>Enrolment Maximum:</span> <span>100</span>
  <span>Enrolment Seats Available:</span> <span>10</span>
  <span>Waitlist Capacity:</span> <span>25</span>
  <span>Waitlist Actual:</span> <span>2</span>
  <span>Waitlist Seats Available:</span> <span>23</span>
</section>`),
		).toBeNull();
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
