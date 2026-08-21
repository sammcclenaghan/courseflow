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

  The wall is scenery, not a control: no pointer handlers, no hit targets,
  nothing that moves under the cursor. Explore is where you go to look a course
  up. Cells are bare <i> elements — see .catalog-wall in styles.css.
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
