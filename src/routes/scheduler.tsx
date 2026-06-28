import { createFileRoute } from "@tanstack/react-router";
import { SchedulerPage } from "@/components/scheduler/scheduler-page";
import { scheduleQueries } from "@/queries/scheduler";

export const Route = createFileRoute("/scheduler")({
	loaderDeps: ({ search: { term } }) => ({ term }),
	loader: ({ context: { queryClient }, deps: { term } }) =>
		queryClient.ensureQueryData(scheduleQueries.mine(term)),
	component: SchedulerRoute,
});

function SchedulerRoute() {
	const { term } = Route.useSearch();

	return <SchedulerPage term={term} />;
}
