import { describe, expect, it } from "vitest";
import { eventsOverlap, getEventColumnLayout } from "./calendar-event-layout";

function event(id: string, start: string, end: string) {
	return { id, start: new Date(start), end: new Date(end) };
}

describe("calendar event conflicts", () => {
	it("detects intersecting intervals on the same day", () => {
		const first = event("first", "2026-09-14T10:00:00", "2026-09-14T11:00:00");
		const second = event(
			"second",
			"2026-09-14T10:30:00",
			"2026-09-14T11:30:00",
		);

		expect(eventsOverlap(first, second)).toBe(true);
	});

	it("does not treat touching boundaries or matching times on another day as conflicts", () => {
		const first = event("first", "2026-09-14T10:00:00", "2026-09-14T11:00:00");
		const touching = event(
			"touching",
			"2026-09-14T11:00:00",
			"2026-09-14T12:00:00",
		);
		const tomorrow = event(
			"tomorrow",
			"2026-09-15T10:30:00",
			"2026-09-15T11:30:00",
		);

		expect(eventsOverlap(first, touching)).toBe(false);
		expect(eventsOverlap(first, tomorrow)).toBe(false);
	});

	it("uses one consistent two-column layout for transitive overlaps", () => {
		const first = event("first", "2026-09-14T09:00:00", "2026-09-14T10:00:00");
		const second = event(
			"second",
			"2026-09-14T09:30:00",
			"2026-09-14T10:30:00",
		);
		const third = event("third", "2026-09-14T10:00:00", "2026-09-14T11:00:00");
		const events = [first, second, third];

		expect(getEventColumnLayout(first, events)).toEqual({
			column: 0,
			columnCount: 2,
		});
		expect(getEventColumnLayout(second, events)).toEqual({
			column: 1,
			columnCount: 2,
		});
		expect(getEventColumnLayout(third, events)).toEqual({
			column: 0,
			columnCount: 2,
		});
	});

	it("allocates a lane for every simultaneously active event", () => {
		const first = event("first", "2026-09-14T09:00:00", "2026-09-14T11:00:00");
		const second = event(
			"second",
			"2026-09-14T09:15:00",
			"2026-09-14T10:45:00",
		);
		const third = event("third", "2026-09-14T09:30:00", "2026-09-14T10:00:00");
		const events = [third, first, second];

		expect(getEventColumnLayout(first, events).columnCount).toBe(3);
		expect(getEventColumnLayout(second, events)).toEqual({
			column: 1,
			columnCount: 3,
		});
		expect(getEventColumnLayout(third, events)).toEqual({
			column: 2,
			columnCount: 3,
		});
	});
});
