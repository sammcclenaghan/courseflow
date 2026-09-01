import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { scheduleQueries } from "@/queries/scheduler";
import { expandSavedSchedule } from "@/utils/scheduler-domain";
import type { CalendarEvent, SavedCourse } from "@/utils/scheduler-types";
import { coursesToEvents } from "@/utils/section-to-events";
import type { Section } from "@/utils/sections-types";
import type {
	FeedbackClientMeta,
	FeedbackSchedulerSnapshot,
	SerializableCalendarEvent,
	SerializableScheduledSection,
	SerializableSelectedCourse,
} from "./feedback-types";

function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function readNavigatorConnection(): FeedbackClientMeta["connection"] {
	if (!isBrowser()) return undefined;
	const connection = (
		navigator as Navigator & {
			connection?: {
				effectiveType?: string;
				downlink?: number;
				rtt?: number;
			};
		}
	).connection;
	if (!connection) return undefined;
	return {
		effectiveType: connection.effectiveType,
		downlink: connection.downlink,
		rtt: connection.rtt,
	};
}

function readUserAgentPlatform(): string {
	if (!isBrowser()) return "";
	const nav = navigator as Navigator & {
		userAgentData?: { platform?: string };
	};
	return navigator.platform || nav.userAgentData?.platform || "";
}

export function readFeedbackClientMeta(): FeedbackClientMeta {
	if (!isBrowser()) {
		return {
			userAgent: "",
			language: "",
			platform: "",
			screenWidth: 0,
			screenHeight: 0,
			viewportWidth: 0,
			viewportHeight: 0,
			devicePixelRatio: 1,
			timezone: "",
			referrer: "",
			online: true,
			touchSupport: false,
		};
	}

	return {
		userAgent: navigator.userAgent,
		language: navigator.language,
		platform: readUserAgentPlatform(),
		screenWidth: window.screen?.width ?? 0,
		screenHeight: window.screen?.height ?? 0,
		viewportWidth: window.innerWidth,
		viewportHeight: window.innerHeight,
		devicePixelRatio: window.devicePixelRatio,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		referrer: document.referrer,
		online: navigator.onLine,
		connection: readNavigatorConnection(),
		touchSupport:
			"ontouchstart" in window ||
			navigator.maxTouchPoints > 0 ||
			(window.matchMedia?.("(pointer: coarse)").matches ?? false),
	};
}

function serialiseSection(
	section: Section,
	term: string,
): SerializableScheduledSection {
	return {
		crn: section.crn,
		subject: section.subject,
		courseNumber: section.courseNumber,
		sectionCode: section.section,
		scheduleType: section.scheduleType,
		term,
		frequency: section.frequency,
		time: section.time,
		days: section.days,
		location: section.location,
		dateRange: section.dateRange,
	};
}

function serialiseCalendarEvent(
	event: CalendarEvent,
): SerializableCalendarEvent {
	return {
		id: event.id,
		title: event.title,
		start: event.start.toISOString(),
		end: event.end.toISOString(),
		color: event.color,
		crn: event.section.crn,
		subject: event.section.subject,
		courseNumber: event.section.courseNumber,
		sectionCode: event.section.section,
		scheduleType: event.section.scheduleType,
		dayOfWeek: event.start.getDay(),
	};
}

// Catalog credits are strings ("1.5", "3"); non-numeric values count as 0.
function parseCredits(value: string | number): number {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function serialiseSelectedCourse(
	saved: SavedCourse,
): SerializableSelectedCourse {
	return {
		pid: saved.course.pid,
		subjectCode: saved.course.subjectCode,
		title: saved.course.title,
		credits: parseCredits(saved.course.credits),
		term: saved.term,
		sections: saved.sections.map((section) =>
			serialiseSection(section, saved.term),
		),
	};
}

export function serialiseScheduler(
	term: string,
	savedCourses: SavedCourse[],
	calendarEvents: CalendarEvent[],
): FeedbackSchedulerSnapshot {
	const totalSections = savedCourses.reduce(
		(sum, course) => sum + course.sections.length,
		0,
	);
	const totalCredits = savedCourses.reduce(
		(sum, course) => sum + parseCredits(course.course.credits),
		0,
	);

	return {
		term,
		courseCount: savedCourses.length,
		totalSections,
		totalCredits: Math.round(totalCredits * 100) / 100,
		selectedCourses: savedCourses.map(serialiseSelectedCourse),
		calendarEvents: calendarEvents.map(serialiseCalendarEvent),
	};
}

export function readCurrentSearch(): Record<string, string> {
	if (!isBrowser()) return {};
	const params = new URLSearchParams(window.location.search);
	const out: Record<string, string> = {};
	for (const [key, value] of params.entries()) {
		out[key] = value;
	}
	return out;
}

/**
 * Hook that produces the scheduler payload for the feedback endpoint.
 * It reads the active term from the URL, the saved schedule from the
 * query cache, and materialises it into both a serialised course list
 * and the derived calendar events.
 */
export function useSchedulerSnapshot(): {
	term: string | null;
	serialized: FeedbackSchedulerSnapshot | null;
} {
	const location = useLocation();
	const term = useMemo(() => {
		const fromSearch =
			location.search && (location.search as Record<string, unknown>).term;
		if (typeof fromSearch === "string" && fromSearch.length > 0)
			return fromSearch;
		if (Array.isArray(fromSearch) && typeof fromSearch[0] === "string")
			return fromSearch[0];
		return null;
	}, [location.search]);

	const scheduleQuery = useQuery({
		...scheduleQueries.mine(term ?? ""),
		enabled: term !== null,
	});

	return useMemo(() => {
		if (!term) return { term: null, serialized: null };
		const savedCourses = expandSavedSchedule(term, scheduleQuery.data);
		const events = coursesToEvents(savedCourses);
		return {
			term,
			serialized: serialiseScheduler(term, savedCourses, events),
		};
	}, [term, scheduleQuery.data]);
}
