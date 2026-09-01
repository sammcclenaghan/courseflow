import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	CATALOG_COURSE_COUNT,
	CATALOG_SKELETON,
} from "@/catalog/catalog-shape";
import type { CourseSearchResult } from "@/utils/catalog-types";

/*
  Every course UVic offers, one cell each. Before the catalog payload arrives
  each cell carries just its subject code, so the wall is already the right
  shape and density on first paint; once the real courses land the cells fill
  in with their own codes and the ones running this term light up.

  The wall stays pointer-events-none — no hit targets, nothing to click, and
  Explore remains where you go to look a course up. But it reacts to presence:
  a single window pointermove listener maps the cursor to a cell index and
  lights a small neighborhood, and an interval sparks random cells, both by
  toggling a class straight on the DOM so React never re-renders the ~3.7k
  nodes. Cells are bare <i> elements — see .catalog-wall in styles.css.
*/

// How far past the CSS cell width we will stretch cells to close the gap in
// the last row. Much more than this and the wall stops reading as a dense
// field and starts reading as sparse columns.
const CELL_STRETCH = 1.25;

/*
  3,761 is prime, so no grid divides it evenly — whatever the column count, the
  last row comes up short. But the size of that gap swings wildly with the
  count: 48 columns leaves 31 cells of dead space, 46 leaves 11. So rather than
  letting the width alone decide, pick the count in the usable range that ends
  the catalog as flush as possible.
*/
function fitColumns(width: number, cellWidth: number) {
	const most = Math.floor(width / cellWidth);
	const fewest = Math.max(2, Math.floor(width / (cellWidth * CELL_STRETCH)));
	let best = most;
	let smallestGap = Number.POSITIVE_INFINITY;

	for (let columns = fewest; columns <= most; columns++) {
		const gap = (columns - (CATALOG_COURSE_COUNT % columns)) % columns;
		if (gap < smallestGap) {
			best = columns;
			smallestGap = gap;
		}
	}

	return best;
}

export function CatalogWall({
	courses,
	offeredPids,
	label,
}: {
	courses: readonly CourseSearchResult[] | null;
	offeredPids: ReadonlySet<string> | null;
	label: string;
}) {
	const wallRef = useRef<HTMLDivElement>(null);
	const [columns, setColumns] = useState<number | null>(null);

	// The cell width lives in CSS (it changes with the breakpoint), so read it
	// back from there rather than keeping a second copy of the density here.
	useEffect(() => {
		const wall = wallRef.current;
		if (!wall) return;

		const measure = () => {
			const cellWidth = Number.parseFloat(
				getComputedStyle(wall).getPropertyValue("--wall-cell"),
			);
			if (!wall.clientWidth || !cellWidth) return;
			setColumns(fitColumns(wall.clientWidth, cellWidth));
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(wall);
		return () => observer.disconnect();
	}, []);

	// Presence effects: light cells under the cursor and spark random ones.
	// Class toggles go straight to the DOM; a React state path here would
	// re-render 3.7k nodes per pointer frame.
	useEffect(() => {
		const wall = wallRef.current;
		if (!wall || !columns) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const cells = wall.children;
		const litUntil = new Map<number, number>();

		const light = (index: number, holdMs: number) => {
			const cell = cells[index] as HTMLElement | undefined;
			if (!cell) return;
			cell.classList.add("lit");
			const previous = litUntil.get(index);
			if (previous) window.clearTimeout(previous);
			litUntil.set(
				index,
				window.setTimeout(() => {
					cell.classList.remove("lit");
					litUntil.delete(index);
				}, holdMs),
			);
		};

		let frame = 0;
		let pointerX = 0;
		let pointerY = 0;
		let framePending = false;

		const applyPointer = () => {
			framePending = false;
			const rect = wall.getBoundingClientRect();
			const x = pointerX - rect.left;
			const y = pointerY - rect.top;
			if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;

			const rows = Math.ceil(cells.length / columns);
			const column = Math.floor(x / (rect.width / columns));
			const row = Math.floor(y / (rect.height / rows));

			// A diamond of radius 2 around the cursor, each cell fading out on
			// its own clock so the trail dissolves instead of snapping off.
			for (let dr = -2; dr <= 2; dr++) {
				for (let dc = -2; dc <= 2; dc++) {
					if (Math.abs(dr) + Math.abs(dc) > 2) continue;
					const r = row + dr;
					const c = column + dc;
					if (r < 0 || c < 0 || c >= columns) continue;
					const index = r * columns + c;
					if (index >= cells.length) continue;
					light(index, 500 + Math.random() * 500);
				}
			}
		};

		const onPointerMove = (event: PointerEvent) => {
			pointerX = event.clientX;
			pointerY = event.clientY;
			if (!framePending) {
				framePending = true;
				frame = requestAnimationFrame(applyPointer);
			}
		};

		window.addEventListener("pointermove", onPointerMove, { passive: true });

		const sparkle = window.setInterval(() => {
			for (let i = 0; i < 3; i++) {
				light(
					Math.floor(Math.random() * cells.length),
					900 + Math.random() * 1400,
				);
			}
		}, 400);

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.clearInterval(sparkle);
			cancelAnimationFrame(frame);
			for (const [index, timeout] of litUntil) {
				window.clearTimeout(timeout);
				(cells[index] as HTMLElement | undefined)?.classList.remove("lit");
			}
		};
	}, [columns]);

	// Only the column count re-renders this component, so a resize is the only
	// thing that ever touches these ~3.7k nodes again.
	const cells = useMemo(
		() =>
			courses
				? courses.map((course) => (
						<i
							key={course.pid}
							className={offeredPids?.has(course.pid) ? "on" : undefined}
						>
							{course.subjectCode}
						</i>
					))
				: CATALOG_SKELETON.map((cell) => <i key={cell.id}>{cell.subject}</i>),
		[courses, offeredPids],
	);

	return (
		<div
			ref={wallRef}
			className="catalog-wall pointer-events-none h-full w-full select-none"
			style={
				columns ? ({ "--wall-columns": columns } as CSSProperties) : undefined
			}
			role="img"
			aria-label={label}
		>
			{cells}
		</div>
	);
}
