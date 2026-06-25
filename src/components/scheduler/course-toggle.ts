import { type LucideIcon, Plus, X } from "lucide-react";
import type { CourseSearchResult } from "@/utils/course-types";

export interface CourseToggle {
	/** Icon for the add/remove affordance. */
	Icon: LucideIcon;
	/** Accessible label describing the tap action. */
	ariaLabel: string;
	/** Whether the course is already in the timetable. */
	isAdded: boolean;
}

/**
 * Single source of truth for the add/remove toggle so the desktop sidebar
 * (course-search) and the mobile sheet (scheduler-search-sheet) can't drift
 * apart on which icon/label shows for an added vs. not-added course. Each
 * surface renders its own chrome (a dedicated button on desktop, a full-width
 * row on mobile) but derives the toggle's meaning from here.
 */
export function getCourseToggle(
	course: CourseSearchResult,
	alreadyAdded: boolean,
): CourseToggle {
	return alreadyAdded
		? {
				Icon: X,
				ariaLabel: `Remove ${course.subjectCode} from timetable`,
				isAdded: true,
			}
		: {
				Icon: Plus,
				ariaLabel: `Add ${course.subjectCode} to timetable`,
				isAdded: false,
			};
}
