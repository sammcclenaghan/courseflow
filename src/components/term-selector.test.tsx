import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { TermSelector } from "@/components/term-selector";
import { DEFAULT_TERM, normalizeTerm } from "@/utils/constants";

const TERM_STORAGE_KEY = "courseflow:selected-term";

const rootSearchSchema = z.object({
	term: z
		.string()
		.default(DEFAULT_TERM)
		.catch(DEFAULT_TERM)
		.transform((term) => normalizeTerm(term)),
});

function harness(initial: string) {
	const rootRoute = createRootRoute({
		validateSearch: rootSearchSchema,
		component: () => <TermSelector />,
	});
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => null,
	});
	const schedulerRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "scheduler",
		component: () => null,
	});
	return createRouter({
		routeTree: rootRoute.addChildren([indexRoute, schedulerRoute]),
		history: createMemoryHistory({ initialEntries: [initial] }),
	});
}

async function getTermSelect() {
	const select = await screen.findByRole("combobox", { name: "Select term" });
	if (!(select instanceof HTMLSelectElement)) {
		throw new Error("Term selector did not render as a select element");
	}
	return select;
}

beforeEach(() => {
	const storage = new Map<string, string>();
	Object.defineProperty(window, "localStorage", {
		configurable: true,
		value: {
			clear: () => storage.clear(),
			getItem: (key: string) => storage.get(key) ?? null,
			removeItem: (key: string) => storage.delete(key),
			setItem: (key: string, value: string) => storage.set(key, value),
		},
	});
});

afterEach(() => {
	window.localStorage.clear();
	cleanup();
});

describe("TermSelector", () => {
	it("reads the current term from TanStack Router search state", async () => {
		const router = harness("/");
		render(<RouterProvider router={router} />);
		const select = await getTermSelect();

		await router.navigate({ to: "/", search: { term: "202701" } });

		await waitFor(() => {
			expect(select.value).toBe("202701");
		});
	});

	it("writes term changes to search state and persisted preference", async () => {
		const router = harness("/");
		render(<RouterProvider router={router} />);

		const select = await getTermSelect();
		fireEvent.change(select, { target: { value: "202701" } });

		await waitFor(() => {
			expect(router.state.location.search.term).toBe("202701");
		});
		expect(window.localStorage.getItem(TERM_STORAGE_KEY)).toBe("202701");
	});

	it("updates the current route instead of navigating home", async () => {
		const router = harness("/scheduler?term=202609");
		render(<RouterProvider router={router} />);

		const select = await getTermSelect();
		fireEvent.change(select, { target: { value: "202701" } });

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/scheduler");
			expect(router.state.location.search.term).toBe("202701");
		});
	});
});
