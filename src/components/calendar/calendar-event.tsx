import { MapPin } from "lucide-react";
import { cn, hexToRgba } from "@/lib/utils";
import type { CalendarEvent as CalendarEventType } from "@/utils/schedule-types";

type EventPosition = {
	left: string;
	width: string;
	top: string;
	height: string;
};

function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function getOverlappingEvents(
	event: CalendarEventType,
	allEvents: CalendarEventType[],
): CalendarEventType[] {
	return allEvents.filter((candidate) => {
		if (candidate.id === event.id) return false;
		return (
			event.start < candidate.end &&
			event.end > candidate.start &&
			isSameDay(event.start, candidate.start)
		);
	});
}

function calculatePosition(
	event: CalendarEventType,
	allEvents: CalendarEventType[],
): EventPosition {
	const overlapping = getOverlappingEvents(event, allEvents);
	const group = [event, ...overlapping].sort((a, b) => {
		const diff = a.start.getTime() - b.start.getTime();
		if (diff !== 0) return diff;
		return a.id.localeCompare(b.id);
	});
	const position = group.indexOf(event);
	const total = overlapping.length + 1;

	return {
		left: `${(position * 100) / total}%`,
		width: `${100 / total}%`,
		top: `${(event.start.getMinutes() / 60) * 100}%`,
		height: `${((event.end.getTime() - event.start.getTime()) / 60_000 / 60) * 100}%`,
	};
}

export function CalendarEvent({
	event,
	allEvents,
	className,
}: {
	event: CalendarEventType;
	allEvents: CalendarEventType[];
	className?: string;
}) {
	const style = calculatePosition(event, allEvents);

	return (
		<div
			className={cn(
				"absolute flex flex-col overflow-hidden rounded-md py-1.5 pr-2.5 pl-3.5 text-foreground transition-shadow hover:shadow-md",
				className,
			)}
			style={{
				...style,
				backgroundColor: hexToRgba(event.color, 0.12),
			}}
		>
			<span
				aria-hidden="true"
				className="absolute inset-y-0 left-0 w-[3px]"
				style={{ backgroundColor: event.color }}
			/>
			<p className="truncate font-semibold text-xs">
				{event.section.subject} {event.section.courseNumber}{" "}
				{event.section.section}
			</p>
			<div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
				<MapPin className="h-3 w-3 shrink-0" />
				<span className="truncate">{event.section.location || "TBA"}</span>
			</div>
		</div>
	);
}
