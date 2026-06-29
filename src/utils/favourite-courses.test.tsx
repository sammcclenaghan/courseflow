import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	FAVOURITE_COURSES_STORAGE_KEY,
	parseStoredFavouriteCourses,
	useFavouriteCourses,
} from "./favourite-courses";

const course = {
	pid: "12345",
	subjectCode: "CSC110",
	title: "Fundamentals of Programming I",
	credits: "1.5",
};

describe("favourite courses", () => {
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
		cleanup();
	});

	it("parses current course objects and legacy pid-only favourites", () => {
		const stored = parseStoredFavouriteCourses(
			JSON.stringify([
				{
					...course,
					favouritedAt: "2026-01-02T00:00:00.000Z",
				},
				"legacy-pid",
				{ pid: "missing-fields" },
			]),
		);

		expect(stored).toEqual([
			{
				...course,
				favouritedAt: "2026-01-02T00:00:00.000Z",
			},
			"legacy-pid",
		]);
	});

	it("stores full course data when toggling a favourite", () => {
		render(<FavouriteHarness />);

		fireEvent.click(screen.getByRole("button", { name: "toggle" }));

		const stored = parseStoredFavouriteCourses(
			window.localStorage.getItem(FAVOURITE_COURSES_STORAGE_KEY),
		);
		expect(stored).toHaveLength(1);
		expect(stored[0]).toMatchObject(course);
		expect(screen.getByTestId("count").textContent).toBe("1");
		expect(screen.getByTestId("is-favourite").textContent).toBe("yes");
	});
});

function FavouriteHarness() {
	const { favourites, isFavourite, toggleFavourite } = useFavouriteCourses();

	return (
		<div>
			<button type="button" onClick={() => toggleFavourite(course)}>
				toggle
			</button>
			<span data-testid="count">{favourites.length}</span>
			<span data-testid="is-favourite">
				{isFavourite(course.pid) ? "yes" : "no"}
			</span>
		</div>
	);
}
