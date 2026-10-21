import { useSignal } from "@preact/signals";
import { type Course, displayCode } from "#domain/course.ts";
import type { Section } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import {
  clearSchedule,
  conflictingCrns,
  conflictsOf,
  courses,
  pick,
  sectionState,
  toggleCourse,
  whyBlocked,
} from "../schedule.ts";
import { openSearch } from "../search/Search.tsx";
import { term } from "../term.ts";
import { button } from "../ui/button.ts";
import { MeetingTime } from "../ui/MeetingTime.tsx";
import { pluralType } from "../ui/plural.ts";

/** The added courses, each with every section to pick from. */
export function SelectedCourses() {
  const collapsed = useSignal(new Set<string>());
  if (typeof term.value === "string") return null;
  const loaded = term.value;

  const toggle = (code: string) => {
    const next = new Set(collapsed.value);
    if (!next.delete(code)) next.add(code);
    collapsed.value = next;
  };

  return (
    <aside
      // Beside a long calendar, the panel stays in view and scrolls itself.
      class="sticky top-4 flex max-h-[calc(100dvh-32px)] flex-col rounded-panel bg-surface text-sm shadow-ring max-[900px]:static max-[900px]:max-h-none"
      aria-label="Selected courses"
    >
      <header class="flex h-header shrink-0 items-center justify-between border-line border-b pr-[13px] pl-[25px] text-muted">
        <span>Selected courses</span>
        {courses.value.length > 0 && (
          <button
            type="button"
            class={button.secondary}
            onClick={clearSchedule}
          >
            Clear
          </button>
        )}
      </header>
      {courses.value.length === 0 ? (
        <div class="flex flex-col items-center gap-3 px-4 py-12 text-muted">
          <span>Courses you add show up here</span>
          <button type="button" class={button.secondary} onClick={openSearch}>
            Search courses
          </button>
        </div>
      ) : (
        <div class="min-h-0 flex-1 overflow-y-auto px-3">
          {courses.value.map((course) => (
            <CourseSections
              key={course.code}
              course={course}
              term={loaded}
              open={!collapsed.value.has(course.code)}
              onToggle={() => toggle(course.code)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function CourseSections({
  course,
  term,
  open,
  onToggle,
}: {
  course: Course;
  term: Term;
  open: boolean;
  onToggle: () => void;
}) {
  const code = displayCode(course.code);
  const clashes = conflictsOf(course);
  return (
    <section class="border-line not-first:border-t">
      <div class="flex items-start gap-1 pr-1.5 pl-[13px]">
        <button
          type="button"
          class="group flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-3.5 text-left"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span class="flex min-w-0 flex-1 flex-col">
            <strong class="font-semibold text-md">{code}</strong>
            <span class="text-muted">{course.title}</span>
            {clashes.length > 0 && (
              <span class="mt-1 font-medium text-conflict-solid">
                Conflicts with{" "}
                {clashes.map((c) => displayCode(c.code)).join(", ")}
              </span>
            )}
          </span>
          <Icon
            path="m6 9 6 6 6-6"
            class="mt-0.5 shrink-0 text-muted group-aria-expanded:rotate-180"
          />
        </button>
        <button
          type="button"
          class={`${button.icon} mt-3 text-muted`}
          aria-label={`Remove ${code}`}
          onClick={() => toggleCourse(course)}
        >
          <Icon path="M18 6 6 18M6 6l12 12" />
        </button>
      </div>
      {open && (
        <div class="flex flex-col gap-3.5 pb-4">
          {[...Map.groupBy(course.sections, (s) => s.type)].map(
            ([type, sections]) => (
              <div key={type}>
                <div class="mb-1.5 px-[13px] text-muted">
                  {pluralType(type)}
                </div>
                <div class="flex flex-col gap-1.5">
                  {sections.map((section) => (
                    <SectionOption
                      key={section.crn}
                      course={course}
                      section={section}
                      term={term}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One section to pick: picked (red if it conflicts), pickable, or faded with
 * why picking it would make a conflict.
 */
function SectionOption({
  course,
  section,
  term,
}: {
  course: Course;
  section: Section;
  term: Term;
}) {
  const state = sectionState(course, section);
  const { enrolled, capacity } = section.seats;
  const full = capacity > 0 && enrolled >= capacity;
  const taken = capacity ? Math.min(100, (enrolled / capacity) * 100) : 0;
  // One look per card, in order of what matters most.
  const look = conflictingCrns.value.has(section.crn)
    ? "border-conflict-solid bg-conflict-fill"
    : state === "picked"
      ? "cursor-default border-ink bg-surface-subtle"
      : state === "blocked"
        ? "cursor-not-allowed border-dashed border-line bg-surface-subtle text-faint"
        : "border-line bg-surface hover:border-faint";
  // Full sections stay pickable, just muted, as in the design.
  const muted = full && state !== "blocked";
  return (
    <button
      type="button"
      class={`grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-control border p-3 text-left text-sm ${look} ${muted ? "text-muted" : ""}`}
      aria-pressed={state === "picked"}
      disabled={state === "blocked"}
      onClick={() => pick(course, section)}
    >
      <span class="font-semibold">{section.number}</span>
      <span class="justify-self-end tabular-nums">
        {enrolled}
        <span class="text-faint">/{capacity}</span>
      </span>
      <span class="flex min-w-0 flex-col gap-1">
        {section.meetings.length === 0 ? (
          <span class="text-faint">No set time</span>
        ) : (
          section.meetings.map((meeting, i) => (
            <MeetingTime key={i} meeting={meeting} term={term} />
          ))
        )}
      </span>
      <span
        class="h-1 w-14 justify-self-end overflow-clip rounded-full bg-line"
        title={`${enrolled} of ${capacity} seats taken`}
      >
        <span
          class={`block h-full rounded-full ${full || state === "blocked" ? "bg-muted" : "bg-ink"}`}
          style={{ width: `${taken}%` }}
        />
      </span>
      {state === "blocked" && (
        <span class="col-span-full text-muted">
          {whyBlocked(course, section)}
        </span>
      )}
    </button>
  );
}

const Icon = ({ path, class: className }: { path: string; class?: string }) => (
  <svg
    class={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);
