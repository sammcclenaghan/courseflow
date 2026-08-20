import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CalendarEvent } from "@/components/calendar/calendar-event";
import type { CalendarEvent as CalendarEventType } from "@/utils/scheduler-types";
import type { Section } from "@/utils/sections-types";

function section(sectionCode: string): Section {
	return {
		id: 1,
		term: "202609",
		crn: sectionCode,
		coursePid: "CSC110",
		subject: "CSC",
		courseNumber: "110",
		courseName: "Fundamentals of Programming",
		section: sectionCode,
		scheduleType: "Lecture",
		instructionalMethod: "In Person",
		frequency: "Every Week",
		time: "10:00 am - 11:20 am",
		days: "Mon",
		meetings: [],
		location: "ECS 123",
		dateRange: "Sep 01 - Dec 01",
		units: "1.5",
		additionalInformation: "",
		enrollmentActual: 0,
		enrollmentMaximum: 0,
		enrollmentSeatsAvailable: 0,
		waitlistCapacity: 0,
		waitlistActual: 0,
		waitlistSeatsAvailable: 0,
		createdAt: "",
		updatedAt: "",
	};
}

function event(
	id: string,
	sectionCode: string,
	start: Date,
	end: Date,
): CalendarEventType {
	return {
		id,
		title: sectionCode,
		start,
		end,
		color: "#005493",
		section: section(sectionCode),
	};
}

afterEach(cleanup);

describe("CalendarEvent", () => {
	it("splits the column between overlapping events", () => {
		const first = event(
			"first",
			"A01",
			new Date("2026-09-14T10:00:00"),
			new Date("2026-09-14T11:00:00"),
		);
		const second = event(
			"second",
			"B01",
			new Date("2026-09-14T10:30:00"),
			new Date("2026-09-14T11:30:00"),
		);

		render(<CalendarEvent event={first} allEvents={[first, second]} />);

		const card = screen.getByText("CSC 110 A01").parentElement;
		expect(card?.style.width).toBe("50%");
		expect(card?.style.left).toBe("0%");
	});

	it("uses the full column when nothing overlaps", () => {
		const first = event(
			"first",
			"A01",
			new Date("2026-09-14T10:00:00"),
			new Date("2026-09-14T11:00:00"),
		);
		const second = event(
			"second",
			"B01",
			new Date("2026-09-14T11:00:00"),
			new Date("2026-09-14T12:00:00"),
		);

		render(<CalendarEvent event={first} allEvents={[first, second]} />);

		const card = screen.getByText("CSC 110 A01").parentElement;
		expect(card?.style.width).toBe("100%");
		expect(card?.style.left).toBe("0%");
	});
});
