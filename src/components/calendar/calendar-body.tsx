import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent as CalendarEventType } from "@/utils/schedule-types";
import { CalendarEvent } from "./calendar-event";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const HOURS = Array.from({ length: 13 }, (_, index) => {
	const hour = 8 + index;
	if (hour === 12) return "12 PM";
	return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
});

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

export function CalendarBody({
	events,
	overlay,
}: {
	events: CalendarEventType[];
	overlay?: ReactNode;
}) {
	const weekStart = startOfWeek(new Date());
	const monday = addDays(weekStart, 1);
	const weekDays = Array.from({ length: 5 }, (_, index) =>
		addDays(monday, index),
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex shrink-0 border-b border-border/60">
				<div className="w-16 shrink-0" />
				{DAYS.map((day, index) => (
					<div
						key={day}
						className={cn(
							"flex-1 py-3 text-center font-medium text-muted-foreground text-sm",
							index > 0 && "border-l border-border/40",
						)}
					>
						{day}
					</div>
				))}
			</div>

			<div className="relative flex-1 overflow-hidden pt-2">
				<div
					className="grid h-full"
					style={{ gridTemplateRows: "repeat(13, 1fr)" }}
				>
					{HOURS.map((label, timeIndex) => {
						const hour = 8 + timeIndex;
						return (
							<div
								key={label}
								className="grid border-border/30 border-b"
								style={{ gridTemplateColumns: "64px repeat(5, 1fr)" }}
							>
								<div className="flex w-16 items-start justify-end pr-3 text-[11px] text-muted-foreground/70">
									<span>{label}</span>
								</div>
								{weekDays.map((day, dayIndex) => {
									const dayEvents = events.filter((event) => {
										const eventDay = event.start.getDay();
										const currentDay = day.getDay();
										return (
											eventDay === currentDay && event.start.getHours() === hour
										);
									});

									return (
										<div
											key={day.toISOString()}
											className={cn(
												"relative",
												dayIndex > 0 && "border-border/30 border-l",
											)}
										>
											{dayEvents.map((event) => (
												<CalendarEvent
													key={event.id}
													event={event}
													allEvents={events}
												/>
											))}
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
				{overlay}
			</div>
		</div>
	);
}
