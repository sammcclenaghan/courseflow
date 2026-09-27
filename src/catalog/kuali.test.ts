import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCourse } from "./kuali";

const dir = "tests/fixtures/kuali";
const read = (file: string) =>
	JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const goldens = readdirSync(dir).filter((file) =>
	file.endsWith(".golden.json"),
);

describe("parseCourse", () => {
	for (const golden of goldens) {
		it(golden.replace(".golden.json", ""), () => {
			const raw = read(golden.replace(".golden.json", ".json"));
			expect(parseCourse(raw)).toEqual(read(golden));
		});
	}
});
