import type { CalendarEvent } from "@/utils/scheduler-types";

type TimedEvent = Pick<CalendarEvent, "id" | "start" | "end">;

export type EventColumnLayout = {
	column: number;
	columnCount: number;
};

export function eventsOverlap(first: TimedEvent, second: TimedEvent): boolean {
	return (
		isSameDay(first.start, second.start) &&
		first.start < second.end &&
		first.end > second.start
	);
}

export function getEventColumnLayout(
	event: TimedEvent,
	allEvents: readonly TimedEvent[],
): EventColumnLayout {
	const dayEvents = allEvents
		.filter((candidate) => isSameDay(event.start, candidate.start))
		.sort(compareEvents);
	const group = findOverlapGroup(event, dayEvents);

	if (group.length === 0) {
		return { column: 0, columnCount: 1 };
	}

	const laneEndTimes: number[] = [];
	const eventColumns = new Map<string, number>();

	for (const candidate of group) {
		const startTime = candidate.start.getTime();
		let column = laneEndTimes.findIndex((endTime) => endTime <= startTime);
		if (column === -1) column = laneEndTimes.length;

		laneEndTimes[column] = candidate.end.getTime();
		eventColumns.set(candidate.id, column);
	}

	return {
		column: eventColumns.get(event.id) ?? 0,
		columnCount: Math.max(1, laneEndTimes.length),
	};
}

function findOverlapGroup(
	target: TimedEvent,
	sortedEvents: readonly TimedEvent[],
): TimedEvent[] {
	let group: TimedEvent[] = [];
	let groupEnd = Number.NEGATIVE_INFINITY;

	for (const event of sortedEvents) {
		const start = event.start.getTime();
		if (group.length > 0 && start >= groupEnd) {
			if (group.some((candidate) => candidate.id === target.id)) return group;
			group = [];
		}

		group.push(event);
		groupEnd = Math.max(groupEnd, event.end.getTime());
	}

	return group.some((candidate) => candidate.id === target.id) ? group : [];
}

function compareEvents(first: TimedEvent, second: TimedEvent): number {
	const startDifference = first.start.getTime() - second.start.getTime();
	if (startDifference !== 0) return startDifference;

	const endDifference = first.end.getTime() - second.end.getTime();
	if (endDifference !== 0) return endDifference;

	return first.id.localeCompare(second.id);
}

function isSameDay(first: Date, second: Date): boolean {
	return (
		first.getFullYear() === second.getFullYear() &&
		first.getMonth() === second.getMonth() &&
		first.getDate() === second.getDate()
	);
}
