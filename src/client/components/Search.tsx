import { catalog } from "../catalog.ts";
import { displayCode } from "../format.ts";
import { addCourse, addedCodes } from "../schedule.ts";
import { query, results } from "../search.ts";

export function Search() {
  const typed = query.value.trim() !== "";
  return (
    <section>
      <label>
        Search courses{" "}
        <input
          type="search"
          autocomplete="off"
          value={query.value}
          onInput={(e) => {
            query.value = e.currentTarget.value;
          }}
        />
      </label>
      {typed && catalog.value.kind === "loading" && <p>Loading courses…</p>}
      {typed && catalog.value.kind === "ok" && results.value.length === 0 && (
        <p>No courses match “{query.value.trim()}”.</p>
      )}
      <ul>
        {results.value.map((course) => {
          const added = addedCodes.value.has(course.code);
          return (
            <li key={course.code}>
              {displayCode(course.code)} · {course.title}{" "}
              <button
                type="button"
                disabled={added}
                aria-label={`Add ${displayCode(course.code)}`}
                onClick={() => addCourse(course)}
              >
                {added ? "Added" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
