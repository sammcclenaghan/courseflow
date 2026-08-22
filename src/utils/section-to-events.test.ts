import { describe, expect, it } from "vitest";
import { parseDays, parseTime, sectionToEvents } from "./section-to-events";
import type { Section } from "./sections-types";

const baseSection: Section = {
	id: 1,
	term: "202609",
	crn: "12345",
	coursePid: "csc-110",
	subject: "CSC",
	courseNumber: "110",
	courseName: "Fundamentals of Programming I",
	section: "A01",
	scheduleType: "Lecture",
	instructionalMethod: "Face to Face",
	frequency: "Every Week",
	time: "10:30 am - 11:20 am",
	days: "MWF",
	meetings: [],
	location: "ECS 123",
	dateRange: "Sep 09, 2026 - Dec 04, 2026",
	units: "1.5",
	additionalInformation: "",
	enrollmentActual: 10,
	enrollmentMaximum: 50,
	enrollmentSeatsAvailable: 40,
	waitlistCapacity: 20,
	waitlistActual: 0,
	waitlistSeatsAvailable: 20,
	createdAt: "",
	updatedAt: "",
};

describe("parseTime", () => {
	it("converts 12-hour ranges including midnight and noon", () => {
		expect(parseTime("12:00 am - 1:05 pm")).toEqual({
			startHour: 0,
			startMin: 0,
			endHour: 13,
			endMin: 5,
		});
		expect(parseTime("11:30 am - 12:20 pm")).toEqual({
			startHour: 11,
			startMin: 30,
			endHour: 12,
			endMin: 20,
		});
	});

	it("rejects malformed, impossible, and non-increasing ranges", () => {
		expect(parseTime("TBA")).toBeNull();
		expect(parseTime("13:00 pm - 2:00 pm")).toBeNull();
		expect(parseTime("10:75 am - 11:20 am")).toBeNull();
		expect(parseTime("2:00 pm - 1:00 pm")).toBeNull();
	});
});

describe("parseDays", () => {
	it("maps UVic day codes, ignores noise, and removes duplicates", () => {
		expect(parseDays("mWFRM?")).toEqual([1, 3, 5, 4]);
	});
});

describe("sectionToEvents", () => {
	it("turns legacy meeting fields into one event per scheduled day", () => {
		const events = sectionToEvents(
			baseSection,
			new Date("2026-09-16T17:45:00"),
			0,
		);

		expect(events).toHaveLength(3);
		expect(events.map((event) => event.id)).toEqual([
			"12345-0-1",
			"12345-0-3",
			"12345-0-5",
		]);
		expect(events[0]).toMatchObject({
			title: "CSC 110 (Lecture)",
			color: "#3b82f6",
		});
		expect(events[0]?.start).toEqual(new Date("2026-09-14T10:30:00"));
		expect(events[2]?.end).toEqual(new Date("2026-09-18T11:20:00"));
	});

	it("uses structured meetings instead of the legacy fallback", () => {
		const section: Section = {
			...baseSection,
			time: "8:00 am - 9:00 am",
			days: "M",
			meetings: [
				{
					frequency: "Every Week",
					time: "1:30 pm - 2:20 pm",
					days: "TR",
					location: "ECS 125",
					dateRange: baseSection.dateRange,
					scheduleType: "Lab",
				},
			],
		};

		const events = sectionToEvents(section, new Date("2026-09-16T17:45:00"), 1);

		expect(events).toHaveLength(2);
		expect(events[0]?.title).toBe("CSC 110 (Lab)");
		expect(events[0]?.start.getHours()).toBe(13);
		expect(events[0]?.color).toBe("#10b981");
	});

	it("omits unscheduled and invalid meeting data", () => {
		expect(
			sectionToEvents(
				{ ...baseSection, time: "", days: "" },
				new Date("2026-09-16T17:45:00"),
				0,
			),
		).toEqual([]);
		expect(
			sectionToEvents(
				{ ...baseSection, time: "TBA" },
				new Date("2026-09-16T17:45:00"),
				0,
			),
		).toEqual([]);
	});
});
