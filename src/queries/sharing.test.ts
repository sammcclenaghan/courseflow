import { describe, expect, it } from "vitest";
import { sharedScheduleQueries } from "./sharing";

describe("sharedScheduleQueries", () => {
	it("refetches on window focus, overriding the app-wide default", () => {
		// Shared views have no push channel; focus refetch is what keeps a
		// viewer's copy current after the owner edits their schedule.
		expect(sharedScheduleQueries.byShareId("abc").refetchOnWindowFocus).toBe(
			true,
		);
	});
});
