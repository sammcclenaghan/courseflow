import { useMemo, useState } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { MobileCalendarBody } from "@/components/calendar/mobile-calendar-body";
import { useMediaQuery } from "@/lib/use-media-query";
import type { Course, CourseSearchResult } from "@/utils/catalog-types";
import type { CalendarEvent, SavedCourse } from "@/utils/scheduler-types";
import type { Section } from "@/utils/sections-types";
import { MobileDayPicker } from "./mobile-day-picker";
import { MobileScheduleHeader } from "./mobile-schedule-header";
import { ScheduleSharePanel } from "./schedule-share-panel";
import { SchedulerCoursesSheet } from "./scheduler-courses-sheet";
import { SchedulerSearchSheet } from "./scheduler-search-sheet";

interface MobileSchedulerShellProps {
	term: string;
	selectedCourses: SavedCourse[];
	events: CalendarEvent[];
	onCourseSelect: (result: CourseSearchResult) => void;
	onCourseRemove: (course: Course) => void;
	onSectionsUpdate: (course: Course, sections: Section[]) => void;
	onClearAll: () => void;
}

export function MobileSchedulerShell({
	term,
	selectedCourses,
	events,
	onCourseSelect,
	onCourseRemove,
	onSectionsUpdate,
	onClearAll,
}: MobileSchedulerShellProps) {
	// Portrait tablets get the full-width week grid; phones keep the single-day
	// view. (The desktop 3-column layout only kicks in at ≥1024px.)
	const isWeekView = useMediaQuery("(min-width: 768px)");

	const [searchOpen, setSearchOpen] = useState(false);
	const [coursesOpen, setCoursesOpen] = useState(false);
	const [selectedDay, setSelectedDay] = useState(() => {
		const today = new Date().getDay();
		// Default to today if weekday, otherwise Monday
		return today >= 1 && today <= 5 ? today : 1;
	});

	const selectedPids = useMemo(
		() => new Set(selectedCourses.map((sc) => sc.course.pid)),
		[selectedCourses],
	);

	const eventCountByDay = useMemo(() => {
		const counts: Record<number, number> = {};
		for (const e of events) {
			const day = e.start.getDay();
			counts[day] = (counts[day] ?? 0) + 1;
		}
		return counts;
	}, [events]);

	return (
		<div className="app-fill-height flex w-full flex-col overflow-hidden bg-background">
			{/* Compact header */}
			<MobileScheduleHeader
				courseCount={selectedCourses.length}
				onSearchOpen={() => setSearchOpen(true)}
				onCoursesOpen={() => setCoursesOpen(true)}
			/>

			{isWeekView ? (
				/* Portrait tablet: full-width Mon–Fri week grid */
				<div className="min-h-0 flex-1 px-2 pb-2">
					<Calendar events={events} />
				</div>
			) : (
				<>
					{/* Day picker chips */}
					<MobileDayPicker
						selectedDay={selectedDay}
						onDayChange={setSelectedDay}
						eventCountByDay={eventCountByDay}
					/>

					{/* Single-day timeline */}
					<MobileCalendarBody events={events} selectedDay={selectedDay} />
				</>
			)}

			{/* Bottom sheets */}
			<SchedulerSearchSheet
				term={term}
				open={searchOpen}
				onOpenChange={setSearchOpen}
				onCourseSelect={onCourseSelect}
				selectedPids={selectedPids}
				onCourseRemove={(pid) => {
					const sc = selectedCourses.find((c) => c.course.pid === pid);
					if (sc) onCourseRemove(sc.course);
				}}
			/>

			<SchedulerCoursesSheet
				open={coursesOpen}
				onOpenChange={setCoursesOpen}
				term={term}
				selectedCourses={selectedCourses}
				onCourseRemove={onCourseRemove}
				onSectionsUpdate={onSectionsUpdate}
				onClearAll={onClearAll}
				share={
					<ScheduleSharePanel
						term={term}
						disabled={selectedCourses.length === 0}
					/>
				}
			/>
		</div>
	);
}
