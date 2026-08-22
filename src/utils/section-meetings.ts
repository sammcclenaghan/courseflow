import type { Section, SectionMeeting } from "./sections-types";

type LegacyMeetingFields = Pick<
	SectionMeeting,
	"frequency" | "time" | "days" | "location" | "dateRange" | "scheduleType"
>;

export function sectionMeetings(section: Section): SectionMeeting[] {
	if (section.meetings.length > 0) return section.meetings;

	const fallback = legacyMeeting(section);
	return fallback ? [fallback] : [];
}

export function legacyMeeting(
	fields: LegacyMeetingFields,
): SectionMeeting | null {
	if (fields.time === "" && fields.days === "") return null;

	return {
		frequency: fields.frequency,
		time: fields.time,
		days: fields.days,
		location: fields.location,
		dateRange: fields.dateRange,
		scheduleType: fields.scheduleType,
	};
}
