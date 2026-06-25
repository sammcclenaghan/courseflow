import { createServerFn } from "@tanstack/react-start";

export type { GroupedSections, Section } from "./section-types";

export const listSectionsByPidAndTerm = createServerFn({ method: "GET" })
	.validator((data: { pid: string; term: string }) => data)
	.handler(async ({ data }) => {
		const { listSectionsByPidAndTermFromDb } = await import(
			"./sections-db.server"
		);
		return listSectionsByPidAndTermFromDb(data.pid, data.term);
	});
