import { describe, expect, it } from "vitest";
import { buildLegacyScheduleMigrationInput } from "./legacy-schedule-migration";

const token = "123e4567-e89b-12d3-a456-426614174000";

describe("buildLegacyScheduleMigrationInput", () => {
	it("groups legacy saved course CRNs by supported term", () => {
		const input = buildLegacyScheduleMigrationInput(
			token,
			JSON.stringify([
				{
					term: "202609",
					sections: [{ crn: " 12345 " }, { crn: "23456" }],
				},
				{
					term: "202609",
					sections: [{ crn: "12345" }, { crn: "34567" }],
				},
				{
					term: "202701",
					sections: [{ crn: "45678" }],
				},
			]),
		);

		expect(input).toEqual({
			legacyToken: token,
			schedules: [
				{ term: "202609", crns: ["12345", "23456", "34567"] },
				{ term: "202701", crns: ["45678"] },
			],
		});
	});

	it("ignores invalid tokens, malformed JSON, and unsupported terms", () => {
		expect(buildLegacyScheduleMigrationInput("not-a-token", "[]")).toBeNull();
		expect(buildLegacyScheduleMigrationInput(token, "not-json")).toBeNull();
		expect(
			buildLegacyScheduleMigrationInput(
				token,
				JSON.stringify([{ term: "202501", sections: [{ crn: "12345" }] }]),
			),
		).toBeNull();
	});
});
