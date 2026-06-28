import { BookOpen, Search } from "lucide-react";

interface MobileScheduleHeaderProps {
	courseCount: number;
	onSearchOpen: () => void;
	onCoursesOpen: () => void;
}

export function MobileScheduleHeader({
	courseCount,
	onSearchOpen,
	onCoursesOpen,
}: MobileScheduleHeaderProps) {
	return (
		<div className="flex items-center justify-end gap-2 px-4 py-3">
			<button
				type="button"
				aria-label={`Open timetable drawer with ${courseCount} selected courses`}
				onClick={onCoursesOpen}
				className="relative flex h-8 items-center gap-1.5 rounded-lg bg-muted/80 px-3 text-xs font-medium text-foreground transition-colors active:bg-muted"
			>
				<BookOpen className="size-3.5" />
				<span>Timetable</span>
				{courseCount > 0 && (
					<span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[10px] text-primary-foreground">
						{courseCount}
					</span>
				)}
			</button>

			<button
				type="button"
				aria-label="Open course search"
				onClick={onSearchOpen}
				className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors active:bg-primary/90"
			>
				<Search className="size-3.5" />
				<span>Add</span>
			</button>
		</div>
	);
}
