import { MapPin } from "lucide-react";
import { cn, hexToRgba } from "@/lib/utils";
import type { CalendarEvent as CalendarEventType } from "@/utils/scheduler-types";
import { getEventColumnLayout } from "./calendar-event-layout";

type EventPosition = {
	left: string;
	width: string;
	top: string;
	height: string;
};

function calculatePosition(
	event: CalendarEventType,
	allEvents: CalendarEventType[],
): EventPosition {
	const { column, columnCount } = getEventColumnLayout(event, allEvents);

	return {
		left: `${(column * 100) / columnCount}%`,
		width: `${100 / columnCount}%`,
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
				"absolute flex flex-col overflow-hidden rounded-md py-1.5 pr-2.5 pl-3.5 text-foreground",
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
