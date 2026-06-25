import type {
	GroupedSections,
	Section,
	SectionMeeting,
} from "./sections-types";

export type {
	GroupedSections,
	Section,
	SectionMeeting,
} from "./sections-types";

export type SectionRow = {
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
};

export function groupSections(rows: SectionRow[]): GroupedSections {
	const grouped: GroupedSections = {
		lectures: [],
		labs: [],
		tutorials: [],
		other: [],
	};

	for (const section of rows.map(mapSection)) {
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

	return grouped;
}

export function mapSection(row: SectionRow): Section {
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

function meetingsForSection(row: SectionRow): SectionMeeting[] {
	if (row.meetings) {
		try {
			const parsed: unknown = JSON.parse(row.meetings);
			const meetings = parseMeetings(parsed);
			if (meetings.length > 0) return meetings;
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

function parseMeetings(value: unknown): SectionMeeting[] {
	if (!Array.isArray(value)) return [];

	return value.filter(isSectionMeeting);
}

function isSectionMeeting(value: unknown): value is SectionMeeting {
	if (!isRecord(value)) return false;

	return (
		typeof value.frequency === "string" &&
		typeof value.time === "string" &&
		typeof value.days === "string" &&
		typeof value.location === "string" &&
		typeof value.dateRange === "string" &&
		typeof value.scheduleType === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
