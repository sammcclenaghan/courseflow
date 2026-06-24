import { describe, expect, it } from "vitest";
import { buildCatalogImportSql } from "./catalogImport.sql.ts";
import type { ImportedCourse, ImportedSection } from "./catalogImport.types.ts";

const course: ImportedCourse = {
	pid: "pid-1",
	subjectCode: "CSC230",
	title: "Intro ' Architecture",
	description: "Description",
	credits: "1.5",
	hoursCatalogText: "3-1.5-0",
	notes: "",
	preAndCorequisites: "CSC 115",
};

const section: ImportedSection = {
	term: "202609",
	crn: "12345",
	coursePid: "pid-1",
	subject: "CSC",
	courseNumber: "230",
	courseName: "Intro Architecture",
	section: "A01",
	scheduleType: "Lecture",
	instructionalMethod: "Face-to-face",
	frequency: "Every Week",
	time: "10:00 am - 11:20 am",
	days: "MR",
	location: "Elliott 168",
	dateRange: "Sep 01, 2026 - Dec 01, 2026",
	units: "1.500",
	additionalInformation: "",
	enrollmentActual: 10,
	enrollmentMaximum: 20,
	enrollmentSeatsAvailable: 10,
	waitlistCapacity: 5,
	waitlistActual: 1,
	waitlistSeatsAvailable: 4,
	meetings: [
		{
			frequency: "Every Week",
			time: "10:00 am - 11:20 am",
			days: "MR",
			location: "Elliott 168",
			dateRange: "Sep 01, 2026 - Dec 01, 2026",
			scheduleType: "Lecture",
		},
	],
	enrollmentRefreshed: true,
};

describe("buildCatalogImportSql", () => {
	it("builds D1-safe upserts for courses and sections", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [section],
			term: "202609",
			wrapTransaction: true,
		});

		expect(sql).toContain("BEGIN TRANSACTION;");
		expect(sql).toContain("DELETE FROM sections WHERE term = '202609'");
		expect(sql).toContain("Intro '' Architecture");
		expect(sql).toContain("ON CONFLICT(pid) DO UPDATE SET");
		expect(sql).toContain("ON CONFLICT(term, crn) DO UPDATE SET");
		expect(sql).toContain('"scheduleType":"Lecture"');
		expect(sql).toContain("COMMIT;");
	});
});
