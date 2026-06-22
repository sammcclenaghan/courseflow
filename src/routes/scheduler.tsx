import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scheduler")({
	component: SchedulerPlaceholder,
});

function SchedulerPlaceholder() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
			<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
				Timetable
			</p>
			<h1 className="mt-4 font-semibold text-3xl tracking-tight">
				Weekly schedule
			</h1>
			<p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
				The drag-to-build timetable view will land here next.
			</p>
		</section>
	);
}
