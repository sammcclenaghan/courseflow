import { describe, expect, it } from "vitest";
import {
	groupSections,
	mapSection,
	type SectionRow,
} from "./sections-domain.server";

const baseRow = {
	id: 1,
	term: "202609",
	crn: "12345",
	course_pid: "csc-100",
	subject: "CSC",
	course_number: "100",
	course_name: "Intro to Computing",
	section: "A01",
	schedule_type: "Lecture",
	instructional_method: "Face to Face",
	frequency: "Every Week",
	time: "10:30 am - 11:20 am",
	days: "MWF",
	location: "ECS 123",
	date_range: "Sep 03, 2026 - Dec 04, 2026",
	units: "1.5",
	additional_information: "",
	enrollment_actual: 10,
	enrollment_maximum: 50,
	enrollment_seats_available: 40,
	waitlist_capacity: 20,
	waitlist_actual: 0,
	waitlist_seats_available: 20,
	meetings: null,
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
} satisfies SectionRow;

describe("section mapping", () => {
	it("maps database section rows to API shape", () => {
		expect(mapSection(baseRow)).toMatchObject({
			id: 1,
			term: "202609",
			crn: "12345",
			coursePid: "csc-100",
			courseNumber: "100",
			courseName: "Intro to Computing",
			scheduleType: "Lecture",
			instructionalMethod: "Face to Face",
			dateRange: "Sep 03, 2026 - Dec 04, 2026",
			enrollmentSeatsAvailable: 40,
			waitlistSeatsAvailable: 20,
		});
	});

	it("uses parsed multi-meeting JSON when present", () => {
		const section = mapSection({
			...baseRow,
			meetings: JSON.stringify([
				{
					frequency: "Every Week",
					time: "10:30 am - 11:20 am",
					days: "MWF",
					location: "ECS 123",
					dateRange: "Sep 03, 2026 - Dec 04, 2026",
					scheduleType: "Lecture",
				},
				{
					frequency: "Every Week",
					time: "1:30 pm - 2:20 pm",
					days: "R",
					location: "ECS 124",
					dateRange: "Sep 03, 2026 - Dec 04, 2026",
					scheduleType: "Lecture",
				},
			]),
		});

		expect(section.meetings).toHaveLength(2);
		expect(section.meetings[1]).toMatchObject({
			time: "1:30 pm - 2:20 pm",
			days: "R",
			location: "ECS 124",
		});
	});

	it("falls back to legacy time and days fields when meeting JSON is invalid", () => {
		const section = mapSection({ ...baseRow, meetings: "not-json" });

		expect(section.meetings).toEqual([
			{
				frequency: "Every Week",
				time: "10:30 am - 11:20 am",
				days: "MWF",
				location: "ECS 123",
				dateRange: "Sep 03, 2026 - Dec 04, 2026",
				scheduleType: "Lecture",
			},
		]);
	});

	it("groups mapped sections by schedule type", () => {
		const grouped = groupSections([
			baseRow,
			{ ...baseRow, id: 2, crn: "12346", schedule_type: "Lab" },
			{ ...baseRow, id: 3, crn: "12347", schedule_type: "Tutorial" },
			{ ...baseRow, id: 4, crn: "12348", schedule_type: "Seminar" },
		]);

		expect(grouped.lectures.map((section) => section.crn)).toEqual(["12345"]);
		expect(grouped.labs.map((section) => section.crn)).toEqual(["12346"]);
		expect(grouped.tutorials.map((section) => section.crn)).toEqual(["12347"]);
		expect(grouped.other.map((section) => section.crn)).toEqual(["12348"]);
	});
});
