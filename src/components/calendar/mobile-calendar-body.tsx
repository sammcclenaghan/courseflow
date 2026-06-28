import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { cn, hexToRgba } from "@/lib/utils";
import type { CalendarEvent } from "@/utils/scheduler-types";

const HOURS = Array.from({ length: 13 }, (_, i) => {
	const hour = 8 + i;
	if (hour === 12) return "12 PM";
	return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
});

const HOUR_HEIGHT = 72; // px per hour slot — generous for touch
const GUTTER_WIDTH = 56; // px

interface MobileCalendarBodyProps {
	events: CalendarEvent[];
	selectedDay: number;
}

export function MobileCalendarBody({
	events,
	selectedDay,
}: MobileCalendarBodyProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const dayEvents = useMemo(
		() => events.filter((e) => e.start.getDay() === selectedDay),
		[events, selectedDay],
	);

	useEffect(() => {
		if (!scrollRef.current) return;
		const firstEvent = [...dayEvents].sort(
			(a, b) => a.start.getTime() - b.start.getTime(),
		)[0];
		const scrollToHour = firstEvent
			? Math.max(firstEvent.start.getHours() - 8, 0)
			: 0;
		scrollRef.current.scrollTo({
			top: scrollToHour * HOUR_HEIGHT,
			behavior: "smooth",
		});
	}, [dayEvents]);

	const totalHeight = HOURS.length * HOUR_HEIGHT;

	return (
		<div ref={scrollRef} className="overscroll-contain flex-1 overflow-y-auto">
			<div className="flex" style={{ height: totalHeight }}>
				{/* Time gutter */}
				<div
					className="relative shrink-0"
					style={{ width: GUTTER_WIDTH }}
					aria-hidden="true"
				>
					{HOURS.map((label, i) => (
						<span
							key={label}
							className="text-[11px] text-muted-foreground/60 tabular-nums absolute right-3"
							style={{ top: i * HOUR_HEIGHT - 6 }}
						>
							{label}
						</span>
					))}
				</div>

				{/* Event column */}
				<div className="relative flex-1">
					{HOURS.map((label, i) => (
						<div
							key={label}
							className="border-border/30 absolute inset-x-0 border-t"
							style={{ top: i * HOUR_HEIGHT }}
						/>
					))}

					{/* Events live in an inner positioned wrapper so we can reserve a right edge */}
					<div className="absolute inset-y-0 left-0 right-3">
						{dayEvents.length === 0 && (
							<div className="absolute inset-x-0 top-6 rounded-xl border border-dashed border-border/60 bg-background/50 px-4 py-6 text-center">
								<p className="text-muted-foreground text-sm">
									No classes scheduled
								</p>
								<p className="mt-1 text-muted-foreground/60 text-xs">
									Pick a different day or add courses to your timetable
								</p>
							</div>
						)}

						{dayEvents.map((event) => (
							<MobileEventBlock
								key={event.id}
								event={event}
								allDayEvents={dayEvents}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

interface MobileEventBlockProps {
	event: CalendarEvent;
	allDayEvents: CalendarEvent[];
}

function MobileEventBlock({ event, allDayEvents }: MobileEventBlockProps) {
	const startMinutes =
		(event.start.getHours() - 8) * 60 + event.start.getMinutes();
	const durationMinutes =
		(event.end.getTime() - event.start.getTime()) / (1000 * 60);
	const top = (startMinutes / 60) * HOUR_HEIGHT;
	const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 44);

	const overlapping = allDayEvents.filter(
		(e) => e.id !== event.id && event.start < e.end && event.end > e.start,
	);
	const group = [event, ...overlapping].sort((a, b) => {
		const diff = a.start.getTime() - b.start.getTime();
		if (diff !== 0) return diff;
		return a.id.localeCompare(b.id);
	});
	const position = group.indexOf(event);
	const total = overlapping.length + 1;
	const widthPercent = 100 / total;
	const leftPercent = position * widthPercent;

	const isCompact = height < 56;

	return (
		<div
			className={cn(
				"absolute flex flex-col overflow-hidden rounded-xl py-1.5 pr-2.5 pl-3.5",
				"transition-shadow active:shadow-lg",
			)}
			style={{
				top,
				height,
				left: `${leftPercent}%`,
				width: `calc(${widthPercent}% - 4px)`,
				marginLeft: leftPercent === 0 ? 0 : 2,
				backgroundColor: hexToRgba(event.color, 0.14),
			}}
		>
			<span
				aria-hidden="true"
				className="absolute inset-y-0 left-0 w-[3px]"
				style={{ backgroundColor: event.color }}
			/>
			<p className="text-[13px] font-semibold leading-tight text-foreground truncate">
				{event.section.subject} {event.section.courseNumber}{" "}
				<span className="text-foreground/60">{event.section.section}</span>
			</p>
			{!isCompact && (
				<div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
					<MapPin className="size-3 shrink-0" />
					<span className="truncate">{event.section.location || "TBA"}</span>
				</div>
			)}
			<p className="text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">
				{formatTimeRange(event.start, event.end)}
			</p>
		</div>
	);
}

function formatTimeRange(start: Date, end: Date) {
	return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatTime(date: Date) {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const period = hours >= 12 ? "pm" : "am";
	const hour12 = hours % 12 === 0 ? 12 : hours % 12;
	const minuteStr =
		minutes === 0 ? "" : `:${minutes.toString().padStart(2, "0")}`;
	return `${hour12}${minuteStr}${period}`;
}
