import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { scheduleQueryKey } from "@/queries/scheduler";
import {
	sharedScheduleQueries,
	sharedScheduleQueryKey,
} from "@/queries/sharing";
import { getTermLabel } from "@/utils/constants";
import { buildSavedCourses } from "@/utils/scheduler-domain";
import type { SavedCourse } from "@/utils/scheduler-types";
import { coursesToEvents } from "@/utils/section-to-events";
import { copySharedScheduleToMine } from "@/utils/sharing.functions";

export const Route = createFileRoute("/share/$shareId")({
	loader: ({ context: { queryClient }, params: { shareId } }) =>
		queryClient.ensureQueryData(sharedScheduleQueries.byShareId(shareId)),
	component: SharedSchedulePage,
});

function SharedSchedulePage() {
	const { shareId } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const [isCopying, setIsCopying] = useState(false);

	const sharedQuery = useQuery(sharedScheduleQueries.byShareId(shareId));

	useEffect(() => {
		if (!sharedQuery.data) return;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const socket = new WebSocket(
			`${protocol}//${window.location.host}/api/v1/shared-schedules/${shareId}/events`,
		);

		const handleMessage = (event: MessageEvent) => {
			if (event.data === "pong") return;
			queryClient.invalidateQueries({
				queryKey: sharedScheduleQueryKey(shareId),
			});
		};

		socket.addEventListener("message", handleMessage);

		return () => {
			socket.removeEventListener("message", handleMessage);
			socket.close();
		};
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
		setIsCopying(true);
		try {
			const schedule = await copySharedScheduleToMine({ data: { shareId } });
			queryClient.setQueryData(
				scheduleQueryKey(schedule.schedule.term),
				schedule,
			);
			await navigate({
				to: "/scheduler",
				search: { term: schedule.schedule.term },
			});
		} catch (error) {
			console.error("Failed to copy shared schedule", error);
			setIsCopying(false);
		}
	}

	if (sharedQuery.isLoading) {
		return (
			<section className="flex flex-1 items-center justify-center px-6 py-24">
				<p className="flex items-center gap-2 text-muted-foreground text-sm">
					<Loader2 className="size-4 animate-spin" /> Loading…
				</p>
			</section>
		);
	}

	if (sharedQuery.isError || !sharedQuery.data) {
		return (
			<section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
				<h1 className="font-semibold text-lg tracking-tight">
					This link is unavailable
				</h1>
				<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
					Sharing may have been turned off.
				</p>
				<Button asChild variant="outline" className="mt-5">
					<Link to="/scheduler" preload="intent">
						Open your scheduler
					</Link>
				</Button>
			</section>
		);
	}

	const termLabel = getTermLabel(sharedQuery.data.schedule.term);

	return (
		<div className="app-fill-height flex w-full flex-col overflow-hidden">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
				<div className="flex items-baseline gap-2">
					<h1 className="font-semibold text-base tracking-tight md:text-lg">
						{termLabel}
					</h1>
					<span className="text-muted-foreground text-xs">Shared schedule</span>
				</div>
				<Button size="sm" onClick={copySchedule} disabled={isCopying}>
					{isCopying ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Copy className="size-4" />
					)}
					{isCopying ? "Copying…" : "Copy to my schedule"}
				</Button>
			</header>

			<div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
				<main className="relative min-w-0 flex-1">
					<Calendar events={events} />
				</main>
				<aside
					className={cn(
						"flex shrink-0 flex-col border-border/60 bg-background",
						isMobile ? "border-t" : "w-72 border-l",
					)}
				>
					<ScrollArea className="min-h-0 flex-1">
						<ul className="divide-y divide-border/60">
							{savedCourses.length === 0 ? (
								<li className="px-4 py-8 text-center text-sm text-muted-foreground">
									No courses
								</li>
							) : (
								savedCourses.map((savedCourse) => (
									<CourseListItem
										key={savedCourse.course.pid}
										savedCourse={savedCourse}
									/>
								))
							)}
						</ul>
					</ScrollArea>
				</aside>
			</div>
		</div>
	);
}

function CourseListItem({ savedCourse }: { savedCourse: SavedCourse }) {
	return (
		<li className="px-4 py-3">
			<p className="font-medium text-sm">{savedCourse.course.subjectCode}</p>
			<p className="mt-0.5 text-xs leading-snug text-muted-foreground">
				{savedCourse.course.title}
			</p>
		</li>
	);
}
