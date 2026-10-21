import { type Course, displayCode } from "#domain/course.ts";
import type { Term } from "#domain/term.ts";
import { conflictsOf, isAdded, toggleCourse } from "../schedule.ts";
import button from "../ui/button.module.css";
import { MeetingTime } from "../ui/MeetingTime.tsx";
import { pluralType } from "../ui/plural.ts";
import styles from "./CourseDetail.module.css";

/**
 * The highlighted search result: its add button, and when its sections meet,
 * with sections that meet at the same times counted together.
 */
export function CourseDetail({ course, term }: { course: Course; term: Term }) {
  const added = isAdded(course);
  const clashes = added ? conflictsOf(course) : [];
  const types = Map.groupBy(course.sections, (section) => section.type);
  return (
    <div class={styles.detail}>
      <header class={styles.header}>
        <div class={styles.name}>
          <strong>{displayCode(course.code)}</strong>
          <span>{course.title}</span>
        </div>
        <button
          type="button"
          class={added ? button.secondary : button.primary}
          onClick={() => toggleCourse(course)}
        >
          {added ? "Remove from schedule" : "Add to schedule"}
        </button>
      </header>
      {clashes.length > 0 && (
        <p class={styles.conflict}>
          Conflicts with {clashes.map((c) => displayCode(c.code)).join(", ")}
        </p>
      )}
      {[...types].map(([type, sections]) => {
        // Sections meeting at exactly the same times and dates share a row.
        const times = Map.groupBy(sections, (section) =>
          JSON.stringify(section.meetings),
        );
        return (
          <section key={type} class={styles.type}>
            <h3>{pluralType(type)}</h3>
            {[...times.values()].map((same) => (
              <div key={same[0].crn} class={styles.times}>
                <span class={styles.meetings}>
                  {same[0].meetings.length === 0 ? (
                    <span class={styles.muted}>No set time</span>
                  ) : (
                    same[0].meetings.map((meeting) => (
                      <MeetingTime
                        key={JSON.stringify(meeting)}
                        meeting={meeting}
                        term={term}
                        aligned
                      />
                    ))
                  )}
                </span>
                <span class={styles.muted}>
                  {same.length} {same.length === 1 ? "section" : "sections"}
                </span>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
