import { createFileRoute } from "@tanstack/react-router";
import { listSectionsByPidAndTermFromDb } from "@/utils/sections-db.server";

export const Route = createFileRoute("/api/v1/sections/$pid/$term")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				return Response.json(
					await listSectionsByPidAndTermFromDb(params.pid, params.term),
				);
			},
		},
	},
});
