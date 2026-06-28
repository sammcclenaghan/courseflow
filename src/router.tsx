import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { RouterContext } from "@/router-context";
import { routeTree } from "@/routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				retry: 1,
			},
		},
	});

	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		// TanStack Query owns freshness for route loaders that use ensureQueryData.
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

export type { RouterContext };
