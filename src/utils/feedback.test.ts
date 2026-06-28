import { describe, expect, it } from "vitest";
import { parseFeedbackSubmission } from "./feedback-sanitizer";
import type { FeedbackSubmission } from "./feedback-types";

describe("parseFeedbackSubmission", () => {
	const baseMessage = "love the scheduler";

	it("rejects empty messages", () => {
		const result = parseFeedbackSubmission({ message: "   ", mood: "love" }, 0);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.status).toBe(400);
		expect(result.message).toBe("message is required");
	});

	it("rejects unknown moods", () => {
		const result = parseFeedbackSubmission(
			{ message: baseMessage, mood: "ecstatic" },
			0,
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.status).toBe(400);
		expect(result.message).toBe("invalid mood");
	});

	it("rejects oversized request bodies", () => {
		const result = parseFeedbackSubmission(
			{ message: baseMessage },
			128 * 1024,
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.status).toBe(413);
	});

	it("parses a full submission and sanitises scheduler + client", () => {
		const result = parseFeedbackSubmission(
			{
				message: baseMessage,
				mood: "love",
				page: "/scheduler?term=202609",
				search: { term: "202609", tab: "week" },
				scheduler: {
					term: "202609",
					courseCount: 1,
					totalSections: 1,
					totalCredits: 1.5,
					selectedCourses: [
						{
							pid: "CSC110",
							subjectCode: "CSC110",
							title: "Fundamentals of Programming",
							credits: 1.5,
							term: "202609",
							sections: [
								{
									crn: "12345",
									subject: "CSC",
									courseNumber: "110",
									sectionCode: "A01",
									scheduleType: "Lecture",
									term: "202609",
									frequency: "Mon Wed Fri",
									time: "9:30 am - 10:20 am",
									days: "MWF",
									location: "CLE A107",
									dateRange: "Sep 3 - Dec 2",
								},
							],
						},
					],
					calendarEvents: [
						{
							id: "12345-0-1",
							title: "CSC 110 (Lecture)",
							start: "2026-09-07T16:30:00.000Z",
							end: "2026-09-07T17:20:00.000Z",
							color: "#1f6feb",
							crn: "12345",
							subject: "CSC",
							courseNumber: "110",
							sectionCode: "A01",
							scheduleType: "Lecture",
							dayOfWeek: 1,
						},
					],
				},
				client: {
					userAgent: "Mozilla/5.0",
					language: "en-CA",
					platform: "MacIntel",
					screenWidth: 2560,
					screenHeight: 1440,
					viewportWidth: 1440,
					viewportHeight: 900,
					devicePixelRatio: 2,
					timezone: "America/Vancouver",
					referrer: "https://example.com",
					online: true,
					connection: { effectiveType: "4g", downlink: 10, rtt: 50 },
					touchSupport: false,
				},
			},
			1024,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const submission: FeedbackSubmission = result.submission;
		expect(submission.message).toBe(baseMessage);
		expect(submission.mood).toBe("love");
		expect(submission.page).toBe("/scheduler?term=202609");
		expect(submission.search.term).toBe("202609");
		expect(submission.scheduler?.courseCount).toBe(1);
		expect(submission.scheduler?.selectedCourses[0]?.subjectCode).toBe(
			"CSC110",
		);
		expect(submission.scheduler?.selectedCourses[0]?.sections[0]?.crn).toBe(
			"12345",
		);
		expect(submission.scheduler?.calendarEvents[0]?.crn).toBe("12345");
		expect(submission.client.timezone).toBe("America/Vancouver");
	});

	it("strips disallowed scheduler field types", () => {
		const result = parseFeedbackSubmission(
			{
				message: baseMessage,
				page: "/scheduler",
				scheduler: {
					term: "202609",
					courseCount: 0,
					totalSections: 0,
					totalCredits: 0,
					selectedCourses: [null, { pid: "CSC110" }],
					calendarEvents: [null, { id: "x" }],
				},
			},
			1024,
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.submission.scheduler?.selectedCourses).toEqual([
			{
				pid: "CSC110",
				subjectCode: "",
				title: "",
				credits: 0,
				term: "",
				sections: [],
			},
		]);
		expect(result.submission.scheduler?.calendarEvents).toEqual([
			{
				id: "x",
				title: "",
				start: "",
				end: "",
				color: "",
				crn: "",
				subject: "",
				courseNumber: "",
				sectionCode: "",
				scheduleType: "",
				dayOfWeek: 0,
			},
		]);
	});
});
