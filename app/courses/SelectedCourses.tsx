import { useSignal } from "@preact/signals";
import { type Course, displayCode } from "#domain/course.ts";
import type { Section } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import {
  clearSchedule,
  courses,
  pick,
  sectionState,
  toggleCourse,
  whyBlocked,
} from "../schedule.ts";
import { openSearch } from "../search/Search.tsx";
import { term } from "../term.ts";
import button from "../ui/button.module.css";
import { MeetingTime } from "../ui/MeetingTime.tsx";
import styles from "./SelectedCourses.module.css";

/** Every schedule type in Banner's data; anything new shows its own name. */
const PLURALS: Record<string, string> = {
  Lecture: "Lectures",
  "Lecture Topic": "Lecture topics",
  Lab: "Labs",
  "Gradable Lab": "Gradable labs",
  Tutorial: "Tutorials",
  Seminar: "Seminars",
  Practicum: "Practicums",
  "Work Term": "Work terms",
};

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
    <aside class={styles.panel} aria-label="Selected courses">
      <header class={styles.header}>
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
        <div class={styles.empty}>
          <span>Courses you add show up here</span>
          <button type="button" class={button.secondary} onClick={openSearch}>
            Search courses
          </button>
        </div>
      ) : (
        <div class={styles.list}>
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
  return (
    <section class={styles.course}>
      <div class={styles.courseHeader}>
        <button
          type="button"
          class={styles.courseToggle}
          aria-expanded={open}
          onClick={onToggle}
        >
          <span class={styles.courseName}>
            <strong>{code}</strong>
            <span>{course.title}</span>
          </span>
          <Icon path="m6 9 6 6 6-6" class={styles.chevron} />
        </button>
        <button
          type="button"
          class={button.icon}
          aria-label={`Remove ${code}`}
          onClick={() => toggleCourse(course)}
        >
          <Icon path="M18 6 6 18M6 6l12 12" />
        </button>
      </div>
      {open && (
        <div class={styles.groups}>
          {[...Map.groupBy(course.sections, (s) => s.type)].map(
            ([type, sections]) => (
              <div key={type}>
                <div class={styles.groupLabel}>{PLURALS[type] ?? type}</div>
                <div class={styles.sections}>
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

/** One section to pick: picked, pickable, or faded with why it can't fit. */
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
  return (
    <button
      type="button"
      class={styles.section}
      data-state={state}
      data-full={full}
      aria-pressed={state === "picked"}
      disabled={state === "blocked"}
      onClick={() => pick(course, section)}
    >
      <span class={styles.number}>{section.number}</span>
      <span class={styles.seats}>
        {enrolled}
        <span>/{capacity}</span>
      </span>
      <span class={styles.meetings}>
        {section.meetings.length === 0 ? (
          <span class={styles.muted}>No set time</span>
        ) : (
          section.meetings.map((meeting, i) => (
            <MeetingTime key={i} meeting={meeting} term={term} />
          ))
        )}
      </span>
      <span
        class={styles.bar}
        title={`${enrolled} of ${capacity} seats taken`}
        style={{
          "--taken": `${capacity ? Math.min(100, (enrolled / capacity) * 100) : 0}%`,
        }}
      />
      {state === "blocked" && (
        <span class={styles.reason}>{whyBlocked(course, section)}</span>
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
