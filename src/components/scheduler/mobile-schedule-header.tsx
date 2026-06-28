import { BookOpen, Search } from "lucide-react";
import { TERMS } from "@/utils/constants";

interface MobileScheduleHeaderProps {
	term: string;
	onTermChange: (term: string) => void;
	courseCount: number;
	onSearchOpen: () => void;
	onCoursesOpen: () => void;
}

export function MobileScheduleHeader({
	term,
	onTermChange,
	courseCount,
	onSearchOpen,
	onCoursesOpen,
}: MobileScheduleHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-2 px-4 py-3">
			<div className="flex items-center gap-2">
				<label
					htmlFor="mobile-term"
					className="font-medium text-muted-foreground text-xs"
				>
					Term
				</label>
				<select
					id="mobile-term"
					value={term}
					onChange={(event) => onTermChange(event.target.value)}
					className="h-8 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:border-uvic-blue"
				>
					{TERMS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-label={`Open timetable drawer with ${courseCount} selected courses`}
					onClick={onCoursesOpen}
					className="relative flex h-8 items-center gap-1.5 rounded-lg bg-muted/80 px-3 text-xs font-medium text-foreground transition-colors active:bg-muted"
				>
					<BookOpen className="size-3.5" />
					<span>Timetable</span>
					{courseCount > 0 && (
						<span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
		</div>
	);
}
