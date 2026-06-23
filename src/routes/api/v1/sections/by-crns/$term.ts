import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

const MAX_CRNS = 100;

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

export const Route = createFileRoute("/api/v1/sections/by-crns/$term")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const url = new URL(request.url);
				const crns = (url.searchParams.get("crns") ?? "")
					.split(",")
					.map((part) => part.trim())
					.filter(Boolean);

				if (crns.length === 0) {
					return Response.json(
						{ error: "crns query parameter is required" },
						{ status: 400 },
					);
				}

				if (crns.length > MAX_CRNS) {
					return Response.json(
						{ error: "too many CRNs requested" },
						{ status: 400 },
					);
				}

				const placeholders = crns.map(() => "?").join(", ");
				const { results } = await env.DB.prepare(
					`SELECT * FROM sections WHERE term = ? AND crn IN (${placeholders})`,
				)
					.bind(params.term, ...crns)
					.all<SectionRow>();

				const orderByCrn = new Map(crns.map((crn, index) => [crn, index]));
				return Response.json(
					results
						.map(mapSection)
						.sort(
							(a, b) =>
								(orderByCrn.get(a.crn) ?? 0) - (orderByCrn.get(b.crn) ?? 0),
						),
				);
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
