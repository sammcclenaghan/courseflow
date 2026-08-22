import { describe, expect, it } from "vitest";
import { asRecord, isRecord, isUuid } from "./validation";

describe("validation helpers", () => {
	it("accepts objects but not arrays or null as records", () => {
		expect(isRecord({ key: "value" })).toBe(true);
		expect(isRecord([])).toBe(false);
		expect(isRecord(null)).toBe(false);
		expect(asRecord("value")).toBeNull();
	});

	it("accepts supported UUID versions and rejects malformed values", () => {
		expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
		expect(isUuid("123e4567-e89b-02d3-a456-426614174000")).toBe(false);
		expect(isUuid("not-a-uuid")).toBe(false);
	});
});
