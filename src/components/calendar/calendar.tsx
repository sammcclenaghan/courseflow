import type { CalendarEvent } from "@/utils/scheduler-types";
import { CalendarBody } from "./calendar-body";

export function Calendar({ events }: { events: CalendarEvent[] }) {
	return (
		<div className="flex h-full flex-col">
			<CalendarBody events={events} />
		</div>
	);
}
