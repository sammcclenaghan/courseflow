import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

interface SectionRow {
	id: number;
	term: string;
	crn: string;
	course_pid: string | null;
	subject: string;
	course_number: string;
	course_name: string;
	section: string;
	schedule_type: string;
	instructional_method: string;
	frequency: string;
	time: string;
	days: string;
	location: string;
	date_range: string;
	units: string;
	additional_information: string;
	enrollment_actual: number;
	enrollment_maximum: number;
	enrollment_seats_available: number;
	waitlist_capacity: number;
	waitlist_actual: number;
	waitlist_seats_available: number;
	meetings: string | null;
	created_at: string;
	updated_at: string;
}

export const Route = createFileRoute("/api/v1/sections/$pid/$term")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { results } = await env.DB.prepare(
					`SELECT * FROM sections
WHERE course_pid = ? AND term = ?
ORDER BY schedule_type, crn`,
				)
					.bind(params.pid, params.term)
					.all<SectionRow>();

				const grouped = {
					lectures: [],
					labs: [],
					tutorials: [],
					other: [],
				} as {
					lectures: ReturnType<typeof mapSection>[];
					labs: ReturnType<typeof mapSection>[];
					tutorials: ReturnType<typeof mapSection>[];
					other: ReturnType<typeof mapSection>[];
				};

				for (const section of results.map(mapSection)) {
					switch (section.scheduleType) {
						case "Lecture":
							grouped.lectures.push(section);
							break;
						case "Lab":
							grouped.labs.push(section);
							break;
						case "Tutorial":
							grouped.tutorials.push(section);
							break;
						default:
							grouped.other.push(section);
					}
				}

				return Response.json(grouped);
			},
		},
	},
});

function mapSection(row: SectionRow) {
	return {
		id: row.id,
		term: row.term,
		crn: row.crn,
		coursePid: row.course_pid,
		subject: row.subject,
		courseNumber: row.course_number,
		courseName: row.course_name,
		section: row.section,
		scheduleType: row.schedule_type,
		instructionalMethod: row.instructional_method,
		frequency: row.frequency,
		time: row.time,
		days: row.days,
		meetings: meetingsForSection(row),
		location: row.location,
		dateRange: row.date_range,
		units: row.units,
		additionalInformation: row.additional_information,
		enrollmentActual: row.enrollment_actual,
		enrollmentMaximum: row.enrollment_maximum,
		enrollmentSeatsAvailable: row.enrollment_seats_available,
		waitlistCapacity: row.waitlist_capacity,
		waitlistActual: row.waitlist_actual,
		waitlistSeatsAvailable: row.waitlist_seats_available,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function meetingsForSection(row: SectionRow) {
	if (row.meetings) {
		try {
			const meetings = JSON.parse(row.meetings) as unknown;
			if (Array.isArray(meetings) && meetings.length > 0) return meetings;
		} catch {
			// Fall back to legacy fields.
		}
	}

	if (row.time === "" && row.days === "") return [];
	return [
		{
			frequency: row.frequency,
			time: row.time,
			days: row.days,
			location: row.location,
			dateRange: row.date_range,
			scheduleType: row.schedule_type,
		},
	];
}
