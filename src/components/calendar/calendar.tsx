import type { ReactNode } from "react";
import type { CalendarEvent } from "@/utils/schedule-types";
import { CalendarBody } from "./calendar-body";

export function Calendar({
	events,
	overlay,
}: {
	events: CalendarEvent[];
	overlay?: ReactNode;
}) {
	return (
		<div className="flex h-full flex-col">
			<CalendarBody events={events} overlay={overlay} />
		</div>
	);
}
