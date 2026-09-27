import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSection } from "./banner";

const dir = "tests/fixtures/banner";
const read = (file: string) =>
	JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
const goldens = readdirSync(dir).filter((file) =>
	file.endsWith(".golden.json"),
);

describe("parseSection", () => {
	for (const golden of goldens) {
		it(golden.replace(".golden.json", ""), () => {
			const raw = read(golden.replace(".golden.json", ".json"));
			expect(parseSection(raw)).toEqual(read(golden));
		});
	}
});
