import { cn } from "@/lib/utils";

const DAYS = [
	{ short: "Mon", key: 1 },
	{ short: "Tue", key: 2 },
	{ short: "Wed", key: 3 },
	{ short: "Thu", key: 4 },
	{ short: "Fri", key: 5 },
] as const;

interface MobileDayPickerProps {
	selectedDay: number;
	onDayChange: (day: number) => void;
	eventCountByDay?: Record<number, number>;
}

export function MobileDayPicker({
	selectedDay,
	onDayChange,
	eventCountByDay = {},
}: MobileDayPickerProps) {
	return (
		<div className="no-scrollbar flex snap-x scroll-px-4 gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-2">
			{DAYS.map(({ short, key }) => {
				const isActive = selectedDay === key;
				const count = eventCountByDay[key] ?? 0;

				return (
					<button
						key={key}
						type="button"
						onClick={() => onDayChange(key)}
						className={cn(
							"relative flex min-w-[56px] snap-start flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
							isActive
								? "bg-primary text-primary-foreground shadow-sm"
								: "bg-muted/60 text-muted-foreground active:bg-muted",
						)}
					>
						<span>{short}</span>
						{count > 0 && (
							<span
								className={cn(
									"text-[10px]",
									isActive
										? "text-primary-foreground/70"
										: "text-muted-foreground/60",
								)}
							>
								{count} class{count !== 1 ? "es" : ""}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
