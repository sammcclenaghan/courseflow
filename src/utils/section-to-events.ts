import { COURSE_COLORS, DAY_MAP } from "@/utils/constants";
import type { CalendarEvent, SavedCourse } from "@/utils/scheduler-types";
import type { Section, SectionMeeting } from "@/utils/sections-types";

export function sectionMeetings(section: Section): SectionMeeting[] {
	if (section.meetings.length > 0) return section.meetings;

	if (section.time === "" && section.days === "") return [];
	return [
		{
			frequency: section.frequency,
			time: section.time,
			days: section.days,
			location: section.location,
			dateRange: section.dateRange,
			scheduleType: section.scheduleType,
		},
	];
}

function startOfWeek(date: Date) {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - start.getDay());
	return start;
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function setTime(date: Date, hour: number, minute: number) {
	const next = new Date(date);
	next.setHours(hour, minute, 0, 0);
	return next;
}

function parseTime(timeStr: string) {
	const match = timeStr.match(
		/(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i,
	);
	if (!match) return null;

	let startHour = Number.parseInt(match[1], 10);
	const startMin = Number.parseInt(match[2], 10);
	const startPeriod = match[3].toLowerCase();
	let endHour = Number.parseInt(match[4], 10);
	const endMin = Number.parseInt(match[5], 10);
	const endPeriod = match[6].toLowerCase();

	if (startPeriod === "pm" && startHour !== 12) startHour += 12;
	if (startPeriod === "am" && startHour === 12) startHour = 0;
	if (endPeriod === "pm" && endHour !== 12) endHour += 12;
	if (endPeriod === "am" && endHour === 12) endHour = 0;

	return { startHour, startMin, endHour, endMin };
}

function parseDays(daysStr: string): number[] {
	return daysStr
		.split("")
		.map((character) => DAY_MAP[character])
		.filter((day): day is number => day !== undefined);
}

export function formatSectionSchedule(section: Section): string {
	return sectionMeetings(section)
		.map((meeting) => [meeting.days, meeting.time].filter(Boolean).join(" "))
		.filter(Boolean)
		.join(" · ");
}

export function sectionToEvents(
	section: Section,
	referenceDate: Date,
	colorIndex: number,
): CalendarEvent[] {
	const weekStart = startOfWeek(referenceDate);
	const color = COURSE_COLORS[colorIndex % COURSE_COLORS.length];

	return sectionMeetings(section).flatMap((meeting, meetingIndex) => {
		const time = parseTime(meeting.time);
		if (!time) return [];

		const days = parseDays(meeting.days);
		if (days.length === 0) return [];

		const scheduleType = meeting.scheduleType || section.scheduleType;

		return days.map((day) => {
			const dayDate = addDays(weekStart, day);
			const start = setTime(dayDate, time.startHour, time.startMin);
			const end = setTime(dayDate, time.endHour, time.endMin);

			return {
				id: `${section.crn}-${meetingIndex}-${day}`,
				title: `${section.subject} ${section.courseNumber} (${scheduleType})`,
				start,
				end,
				color,
				section,
			};
		});
	});
}

export function coursesToEvents(
	courses: SavedCourse[],
	referenceDate: Date = new Date(),
): CalendarEvent[] {
	return courses.flatMap((savedCourse, colorIndex) =>
		savedCourse.sections.flatMap((section) =>
			sectionToEvents(section, referenceDate, colorIndex),
		),
	);
}
