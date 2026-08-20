import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NAV_ITEMS } from "@/components/nav-items";

afterEach(cleanup);

function harness(initial: string) {
	const rootRoute = createRootRoute({
		component: () => (
			<>
				<Outlet />
				<MobileTabBar />
			</>
		),
	});
	const routes = [
		createRoute({
			getParentRoute: () => rootRoute,
			path: "/",
			component: () => null,
		}),
		...NAV_ITEMS.map((item) =>
			createRoute({
				getParentRoute: () => rootRoute,
				path: item.to.slice(1),
				component: () => null,
			}),
		),
	];
	return createRouter({
		routeTree: rootRoute.addChildren(routes),
		history: createMemoryHistory({ initialEntries: [initial] }),
	});
}

describe("MobileTabBar", () => {
	it.each(NAV_ITEMS.map((item) => [item.to, item.label] as const))(
		"renders all three tabs and marks %s active",
		async (to, label) => {
			render(<RouterProvider router={harness(to)} />);

			// Every student surface is reachable from the bar. findBy* retries
			// until the in-memory router finishes its async load.
			for (const item of NAV_ITEMS) {
				await screen.findByRole("link", { name: item.label });
			}

			// The current route's tab reflects "you are here".
			const active = await screen.findByRole("link", { name: label });
			expect(active.getAttribute("aria-current")).toBe("page");
			expect(active.className).toContain("text-uvic-blue");
		},
	);

	it("keeps inactive tabs muted", async () => {
		render(<RouterProvider router={harness("/scheduler")} />);

		const explore = await screen.findByRole("link", { name: "Explore" });
		expect(explore.getAttribute("aria-current")).toBeNull();
		expect(explore.className).toContain("text-foreground/55");
	});
});
