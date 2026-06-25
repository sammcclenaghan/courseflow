import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { SchedulerPage } from "@/components/scheduler/scheduler-page";
import { DEFAULT_TERM } from "@/utils/constants";
import { scheduleQueries } from "@/utils/schedule-queries";

const schedulerSearchSchema = z.object({
	term: z.string().default(DEFAULT_TERM).catch(DEFAULT_TERM),
});

export const Route = createFileRoute("/scheduler")({
	validateSearch: schedulerSearchSchema,
	search: {
		middlewares: [stripSearchParams({ term: DEFAULT_TERM })],
	},
	loaderDeps: ({ search: { term } }) => ({ term }),
	loader: ({ context: { queryClient }, deps: { term } }) =>
		queryClient.ensureQueryData(scheduleQueries.mine(term)),
	component: SchedulerRoute,
});

function SchedulerRoute() {
	const { term } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<SchedulerPage
			term={term}
			onTermChange={(nextTerm) => {
				void navigate({
					search: (previous) => ({ ...previous, term: nextTerm }),
				});
			}}
		/>
	);
}
