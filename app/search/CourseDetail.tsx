import { type Course, displayCode } from "#domain/course.ts";
import type { Term } from "#domain/term.ts";
import { conflictsOf, isAdded, toggleCourse } from "../schedule.ts";
import { button } from "../ui/button.ts";
import { MeetingTime } from "../ui/MeetingTime.tsx";
import { pluralType } from "../ui/plural.ts";

/**
 * The highlighted search result: its add button, and when its sections meet,
 * with sections that meet at the same times counted together.
 */
export function CourseDetail({ course, term }: { course: Course; term: Term }) {
  const added = isAdded(course);
  const clashes = added ? conflictsOf(course) : [];
  const types = Map.groupBy(course.sections, (section) => section.type);
  return (
    <div class="flex max-w-160 flex-col gap-4 py-5.5 pr-4 pl-6 text-sm">
      <header class="mb-2 flex items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col">
          <strong class="font-semibold text-md">
            {displayCode(course.code)}
          </strong>
          <span class="text-muted">{course.title}</span>
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
        <p class="-mt-3 font-medium text-conflict-solid">
          Conflicts with {clashes.map((c) => displayCode(c.code)).join(", ")}
        </p>
      )}
      {[...types].map(([type, sections]) => {
        // Sections meeting at exactly the same times and dates share a row.
        const times = Map.groupBy(sections, (section) =>
          JSON.stringify(section.meetings),
        );
        return (
          <section key={type} class="flex flex-col gap-1.5">
            <h3 class="text-muted">{pluralType(type)}</h3>
            {[...times.values()].map((same) => (
              <div key={same[0].crn} class="flex items-start gap-3">
                <span class="mr-auto flex flex-col gap-1">
                  {same[0].meetings.length === 0 ? (
                    <span class="text-muted">No set time</span>
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
                <span class="text-muted">
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
