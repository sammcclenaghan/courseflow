import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { Button } from "@/components/ui/button";
import { getTermLabel } from "@/utils/constants";
import { buildSavedCourses } from "@/utils/schedule-data";
import {
	scheduleQueryKey,
	sharedScheduleQueries,
	sharedScheduleQueryKey,
} from "@/utils/schedule-queries";
import { copySharedScheduleToMine } from "@/utils/schedules";
import { coursesToEvents } from "@/utils/section-to-events";

export const Route = createFileRoute("/share/$shareId")({
	loader: ({ context: { queryClient }, params: { shareId } }) =>
		queryClient.ensureQueryData(sharedScheduleQueries.byShareId(shareId)),
	component: SharedSchedulePage,
});

function SharedSchedulePage() {
	const { shareId } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [copyState, setCopyState] = useState<"idle" | "copying" | "done">(
		"idle",
	);

	const sharedQuery = useQuery(sharedScheduleQueries.byShareId(shareId));

	useEffect(() => {
		if (!sharedQuery.data) return;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const socket = new WebSocket(
			`${protocol}//${window.location.host}/api/v1/shared-schedules/${shareId}/events`,
		);

		socket.addEventListener("message", (event) => {
			if (event.data === "pong") return;
			queryClient.invalidateQueries({
				queryKey: sharedScheduleQueryKey(shareId),
			});
		});

		return () => socket.close();
	}, [queryClient, shareId, sharedQuery.data]);

	const savedCourses = useMemo(() => {
		if (!sharedQuery.data) return [];
		return buildSavedCourses(
			sharedQuery.data.schedule.term,
			sharedQuery.data.sections,
		);
	}, [sharedQuery.data]);
	const events = useMemo(() => coursesToEvents(savedCourses), [savedCourses]);

	async function copySchedule() {
		setCopyState("copying");
		try {
			const schedule = await copySharedScheduleToMine({ data: { shareId } });
			queryClient.setQueryData(
				scheduleQueryKey(schedule.schedule.term),
				schedule,
			);
			setCopyState("done");
			await navigate({
				to: "/scheduler",
				search: { term: schedule.schedule.term },
			});
		} catch (error) {
			console.error("Failed to copy shared schedule", error);
			setCopyState("idle");
		}
	}

	if (sharedQuery.isLoading) {
		return (
			<section className="flex flex-1 items-center justify-center px-6 py-24">
				<p className="flex items-center gap-2 text-muted-foreground text-sm">
					<Loader2 className="size-4 animate-spin" /> Loading shared schedule…
				</p>
			</section>
		);
	}

	if (sharedQuery.isError || !sharedQuery.data) {
		return (
			<section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
				<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
					Shared schedule
				</p>
				<h1 className="mt-4 font-semibold text-3xl tracking-tight">
					This share link is unavailable
				</h1>
				<p className="mt-4 text-muted-foreground text-sm leading-relaxed">
					The owner may have turned off sharing or regenerated their link.
				</p>
				<Button asChild className="mt-6">
					<Link to="/scheduler">Open your scheduler</Link>
				</Button>
			</section>
		);
	}

	const termLabel = getTermLabel(sharedQuery.data.schedule.term);

	return (
		<div className="flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col overflow-hidden">
			<header className="flex flex-wrap items-center justify-between gap-3 border-border/60 border-b px-5 py-4">
				<div>
					<p className="font-medium text-[11px] text-muted-foreground tracking-[0.24em] uppercase">
						Live shared timetable
					</p>
					<h1 className="mt-1 font-semibold text-xl tracking-tight">
						{termLabel}
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => sharedQuery.refetch()}
						disabled={sharedQuery.isFetching}
					>
						<RefreshCw className="size-4" />
						Refresh
					</Button>
					<Button
						size="sm"
						onClick={copySchedule}
						disabled={copyState === "copying"}
					>
						{copyState === "copying" ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Copy className="size-4" />
						)}
						Copy schedule
					</Button>
				</div>
			</header>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<main className="min-w-0 flex-1">
					<Calendar events={events} />
				</main>
				<aside className="w-80 shrink-0 overflow-auto border-border/60 border-l p-4 max-lg:hidden">
					<h2 className="font-semibold text-sm">Courses</h2>
					<ul className="mt-4 space-y-3">
						{savedCourses.map((savedCourse) => (
							<li
								key={savedCourse.course.pid}
								className="rounded-lg border border-border/60 bg-card p-3"
							>
								<p className="font-semibold text-sm">
									{savedCourse.course.subjectCode}
								</p>
								<p className="mt-1 text-muted-foreground text-xs">
									{savedCourse.course.title}
								</p>
								<p className="mt-2 text-muted-foreground text-xs">
									CRNs:{" "}
									{savedCourse.sections
										.map((section) => section.crn)
										.join(", ")}
								</p>
							</li>
						))}
					</ul>
				</aside>
			</div>
		</div>
	);
}
