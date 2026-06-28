import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import type { Course } from "@/utils/catalog-types";
import type { SavedCourse } from "@/utils/scheduler-types";
import type { Section } from "@/utils/sections-types";
import { SelectedCoursesSidebar } from "./selected-courses-sidebar";

interface SchedulerCoursesSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	term: string;
	selectedCourses: SavedCourse[];
	onCourseRemove: (course: Course) => void;
	onSectionsUpdate: (course: Course, sections: Section[]) => void;
	onClearAll: () => void;
	share?: ReactNode;
}

export function SchedulerCoursesSheet({
	open,
	onOpenChange,
	term,
	selectedCourses,
	onCourseRemove,
	onSectionsUpdate,
	onClearAll,
	share,
}: SchedulerCoursesSheetProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="h-[80dvh] max-h-[80dvh]">
				<DrawerTitle className="sr-only">Timetable</DrawerTitle>
				{share ? (
					<div className="flex shrink-0 items-center justify-end gap-2 px-4 pt-1">
						{share}
					</div>
				) : null}
				<SelectedCoursesSidebar
					term={term}
					selectedCourses={selectedCourses}
					onCourseRemove={onCourseRemove}
					onSectionsUpdate={onSectionsUpdate}
					onClearAll={onClearAll}
				/>
			</DrawerContent>
		</Drawer>
	);
}
