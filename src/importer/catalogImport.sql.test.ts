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
		expect(sql).toContain("Intro '' Architecture");
		expect(sql).toContain("ON CONFLICT(pid) DO UPDATE SET");
		expect(sql).toContain("ON CONFLICT(term, crn) DO UPDATE SET");
		expect(sql).toContain('"scheduleType":"Lecture"');
		expect(sql).toContain("COMMIT;");
	});

	it("prunes only stale CRNs instead of deleting every section for imported courses", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [section],
			term: "202609",
		});

		// The old blanket delete cascaded into schedule_sections and wiped
		// users' saved schedules on every import.
		expect(sql).not.toContain("course_pid IN (");
		expect(sql).toContain(
			"DELETE FROM sections WHERE term = '202609' AND course_pid = 'pid-1' AND crn NOT IN ('12345');",
		);
	});

	it("prunes after upserting so surviving sections are never transiently deleted", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [section],
			term: "202609",
		});

		const upsertIndex = sql.indexOf("ON CONFLICT(term, crn) DO UPDATE SET");
		const pruneIndex = sql.indexOf("DELETE FROM sections");
		expect(upsertIndex).toBeGreaterThan(-1);
		expect(pruneIndex).toBeGreaterThan(upsertIndex);
	});

	it("does not delete sections for a course with no fetched sections", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [],
			term: "202609",
		});

		expect(sql).not.toContain("DELETE FROM sections");
		expect(sql).toContain("ON CONFLICT(pid) DO UPDATE SET");
	});

	it("does not prune based on sections from another term or without a course pid", () => {
		const otherTermSection: ImportedSection = {
			...section,
			term: "202701",
			crn: "99999",
		};
		const orphanSection: ImportedSection = {
			...section,
			crn: "55555",
			coursePid: null,
		};
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [otherTermSection, orphanSection],
			term: "202609",
		});

		expect(sql).not.toContain("DELETE FROM sections");
	});

	it("stamps enrollment freshness for refreshed sections and updates counts on conflict", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [section],
			term: "202609",
		});

		expect(sql).toContain(
			"CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.enrollment_actual ELSE enrollment_actual END",
		);
		expect(sql).toContain(
			"enrollment_updated_at = COALESCE(excluded.enrollment_updated_at, enrollment_updated_at)",
		);
		// Refreshed section: the insert carries a real timestamp, not NULL.
		const insertValues = sql.slice(
			sql.indexOf("INSERT INTO sections"),
			sql.indexOf("ON CONFLICT(term, crn)"),
		);
		expect(insertValues).toContain("strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),");
	});

	it("inserts NULL freshness for unrefreshed sections so existing counts are retained", () => {
		const sql = buildCatalogImportSql({
			courses: [course],
			sections: [{ ...section, enrollmentRefreshed: false }],
			term: "202609",
		});

		const insertValues = sql.slice(
			sql.indexOf("INSERT INTO sections"),
			sql.indexOf("ON CONFLICT(term, crn)"),
		);
		expect(insertValues).toContain("NULL,\n  ");
		expect(insertValues).not.toContain(
			"strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),\n  '[",
		);
	});
});
