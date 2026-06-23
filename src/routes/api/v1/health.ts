import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/health")({
	server: {
		handlers: {
			GET: async () => {
				const result = await env.DB.prepare("SELECT 1 AS ok").first<{
					ok: number;
				}>();

				return Response.json({
					ok: result?.ok === 1,
					database: "connected",
				});
			},
		},
	},
});
