import { displayCode } from "../../catalog/code.ts";
import { catalog } from "../catalog.ts";
import { removeCourse, selectedCourses } from "../schedule.ts";

export function SelectedCourses() {
  const courses = selectedCourses.value;
  const c = catalog.value;
  // Notes are a June snapshot, so they always say how old they are.
  const notesAsOf =
    c.kind === "ok" && c.data.notesAsOf
      ? new Date(c.data.notesAsOf).toLocaleDateString("en-CA", {
          month: "long",
          year: "numeric",
        })
      : null;
  return (
    <section>
      <h2>Selected courses</h2>
      {courses.length === 0 && <p>No courses added yet.</p>}
      <ul>
        {courses.map(({ course, sections, colour }) => (
          <li key={course.code}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                marginRight: 6,
                borderRadius: 2,
                background: `var(--color-course-${colour}-ring)`,
              }}
            />
            <strong>{displayCode(course.code)}</strong> {course.title}{" "}
            <button
              type="button"
              aria-label={`Remove ${displayCode(course.code)}`}
              onClick={() => removeCourse(course.code)}
            >
              Remove
            </button>
            <ul>
              {sections.map((s) => (
                <li key={s.crn}>
                  {s.number} · {s.type} · CRN {s.crn}
                  {s.title !== course.title && ` · ${s.title}`}
                  {s.note && (
                    <p>
                      Note as of {notesAsOf}: {s.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
