import { describe, expect, it } from "vitest";
import {
	MAX_SCHEDULE_CRNS,
	normalizeScheduleCrns,
	ScheduleRequestError,
} from "./scheduler-shared";

describe("schedule helpers", () => {
	it("normalizes CRNs by trimming blanks and removing duplicates", () => {
		expect(normalizeScheduleCrns([" 12345 ", "", "12345", "67890"])).toEqual([
			"12345",
			"67890",
		]);
	});

	it("rejects non-array CRN payloads", () => {
		expect(() => normalizeScheduleCrns("12345")).toThrow(ScheduleRequestError);
	});

	it("rejects non-string CRNs", () => {
		expect(() => normalizeScheduleCrns(["12345", 67890])).toThrow(
			ScheduleRequestError,
		);
	});

	it("rejects schedules above the CRN limit", () => {
		expect(() =>
			normalizeScheduleCrns(
				Array.from({ length: MAX_SCHEDULE_CRNS + 1 }, (_, index) =>
					String(index),
				),
			),
		).toThrow("too many CRNs requested");
	});
});
