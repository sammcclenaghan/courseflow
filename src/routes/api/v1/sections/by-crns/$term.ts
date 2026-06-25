import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { mapSection, type SectionRow } from "@/utils/sections-domain.server";

const MAX_CRNS = 100;

export const Route = createFileRoute("/api/v1/sections/by-crns/$term")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const url = new URL(request.url);
				const crns = (url.searchParams.get("crns") ?? "")
					.split(",")
					.map((part) => part.trim())
					.filter(Boolean);

				if (crns.length === 0) {
					return Response.json(
						{ error: "crns query parameter is required" },
						{ status: 400 },
					);
				}

				if (crns.length > MAX_CRNS) {
					return Response.json(
						{ error: "too many CRNs requested" },
						{ status: 400 },
					);
				}

				const placeholders = crns.map(() => "?").join(", ");
				const { results } = await env.DB.prepare(
					`SELECT * FROM sections WHERE term = ? AND crn IN (${placeholders})`,
				)
					.bind(params.term, ...crns)
					.all<SectionRow>();

				const orderByCrn = new Map(crns.map((crn, index) => [crn, index]));
				return Response.json(
					results
						.map(mapSection)
						.sort(
							(a, b) =>
								(orderByCrn.get(a.crn) ?? 0) - (orderByCrn.get(b.crn) ?? 0),
						),
				);
			},
		},
	},
});
