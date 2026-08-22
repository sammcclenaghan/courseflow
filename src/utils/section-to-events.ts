import {
	addDays,
	setLocalTime,
	startOfWeekSunday,
} from "@/components/calendar/calendar-date";
import { COURSE_COLORS, DAY_MAP } from "@/utils/constants";
import type { CalendarEvent, SavedCourse } from "@/utils/scheduler-types";
import { sectionMeetings } from "@/utils/section-meetings";
import type { Section } from "@/utils/sections-types";

export { sectionMeetings } from "@/utils/section-meetings";

export function parseTime(timeStr: string) {
	const match = timeStr.match(
		/^\s*(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)\s*$/i,
	);
	if (!match) return null;

	let startHour = Number.parseInt(match[1], 10);
	const startMin = Number.parseInt(match[2], 10);
	const startPeriod = match[3].toLowerCase();
	let endHour = Number.parseInt(match[4], 10);
	const endMin = Number.parseInt(match[5], 10);
	const endPeriod = match[6].toLowerCase();
	if (
		startHour < 1 ||
		startHour > 12 ||
		endHour < 1 ||
		endHour > 12 ||
		startMin > 59 ||
		endMin > 59
	) {
		return null;
	}

	if (startPeriod === "pm" && startHour !== 12) startHour += 12;
	if (startPeriod === "am" && startHour === 12) startHour = 0;
	if (endPeriod === "pm" && endHour !== 12) endHour += 12;
	if (endPeriod === "am" && endHour === 12) endHour = 0;
	if (endHour * 60 + endMin <= startHour * 60 + startMin) return null;

	return { startHour, startMin, endHour, endMin };
}

export function parseDays(daysStr: string): number[] {
	const days = new Set<number>();
	for (const character of daysStr.toUpperCase()) {
		const day = DAY_MAP[character];
		if (day !== undefined) days.add(day);
	}
	return [...days];
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
	const weekStart = startOfWeekSunday(referenceDate);
	const color = COURSE_COLORS[colorIndex % COURSE_COLORS.length];

	return sectionMeetings(section).flatMap((meeting, meetingIndex) => {
		const time = parseTime(meeting.time);
		if (!time) return [];

		const days = parseDays(meeting.days);
		if (days.length === 0) return [];

		const scheduleType = meeting.scheduleType || section.scheduleType;

		return days.map((day) => {
			const dayDate = addDays(weekStart, day);
			const start = setLocalTime(dayDate, time.startHour, time.startMin);
			const end = setLocalTime(dayDate, time.endHour, time.endMin);

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
