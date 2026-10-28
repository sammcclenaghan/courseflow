import { computed, signal } from "@preact/signals";
import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";
import type { Course } from "../catalog/courses.ts";
import type { Requisite } from "../catalog/requisites.ts";
import type { TermSections } from "../catalog/terms.ts";
import { addDays, formatDate, monday, today } from "./dates.ts";
import {
  add,
  type Conflict,
  canChoose,
  choose,
  conflicts,
  conflictsOn,
  type Entry,
  missingTypes,
  type Occurrence,
  occurrences,
  openingWeek,
  picked,
  schedules,
  withChoice,
} from "./schedule.ts";
import {
  byType,
  formatDays,
  formatMeeting,
  formatTime,
  termName,
} from "./sections.ts";

const json = async (path: string) => (await fetch(path)).json();

const [courses, terms]: [Course[], string[]] = await Promise.all([
  json("/data/courses.json"),
  json("/data/terms.json"),
]);
// Each term is a small file, so all of them load up front and switching
// terms is instant.
const sections: Record<string, TermSections> = Object.fromEntries(
  await Promise.all(
    terms.map(async (code) => [code, await json(`/data/terms/${code}.json`)]),
  ),
);

// The latest term fetched, which is the next one to register for.
const term = signal(terms[terms.length - 1]);

const schedule = computed(() => schedules.value[term.value] ?? []);

// The course whose sections are open for picking.
const editing = signal<string | null>(null);

// The Monday picked with the arrows, or null to open on openingWeek.
const week = signal<string | null>(null);

const scheduleConflicts = computed(() =>
  conflicts(schedule.value, sections[term.value]),
);

const name = ({ code, section }: Occurrence) => `${code} ${section.number}`;

// The other side of each conflict an occurrence is in.
const against = (
  found: Conflict[],
  isIt: (occurrence: Occurrence) => boolean,
) => found.flatMap(([a, b]) => (isIt(a) ? [b] : isIt(b) ? [a] : []));

const shownWeek = computed(
  () =>
    week.value ?? openingWeek(schedule.value, sections[term.value], today()),
);

function addToSchedule(code: string) {
  const offered = sections[term.value][code];
  if (offered) add(term.value, code, offered);
}

const query = signal("");

const squash = (text: string) => text.replaceAll(" ", "").toLowerCase();

const results = computed(() => {
  const text = query.value.trim().toLowerCase();
  if (text === "") return [];
  return courses
    .filter(
      (course) =>
        squash(course.code).includes(squash(text)) ||
        course.title.toLowerCase().includes(text),
    )
    .slice(0, 50);
});

// A position in results, so typing starts again at the best match.
const selected = signal(0);

// Separate components, so typing a search doesn't redraw the schedule.
function Home() {
  return (
    <main>
      <Search />
      <Schedule />
    </main>
  );
}

function Search() {
  const course = results.value[selected.value];
  return (
    <>
      <select
        value={term.value}
        onChange={(event) => {
          term.value = event.currentTarget.value;
          week.value = null;
        }}
      >
        {terms.map((code) => (
          <option key={code} value={code}>
            {termName(code)}
          </option>
        ))}
      </select>
      <input
        type="search"
        placeholder="Search courses"
        value={query.value}
        onInput={(event) => {
          query.value = event.currentTarget.value;
          selected.value = 0;
        }}
        onKeyDown={(event) => {
          const last = results.value.length - 1;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            selected.value = Math.min(selected.value + 1, last);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            selected.value = Math.max(selected.value - 1, 0);
          } else if (event.key === "Enter" && course) {
            addToSchedule(course.code);
          }
        }}
      />
      <ul>
        {results.value.map((result, index) => (
          <li key={result.code}>
            <button
              type="button"
              aria-current={index === selected.value}
              // Keeps focus in the search box, so the arrows still work.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                selected.value = index;
              }}
            >
              {index === selected.value && "→ "}
              {result.code} {result.title}
            </button>
          </li>
        ))}
      </ul>
      {course && <Preview course={course} />}
    </>
  );
}

function Schedule() {
  return (
    <>
      <h2>Schedule</h2>
      <ul>
        {schedule.value.map((entry) => {
          const others = new Set(
            against(
              scheduleConflicts.value,
              (occurrence) => occurrence.code === entry.code,
            ).map(name),
          );
          return (
            <li key={entry.code}>
              {entry.code}{" "}
              {picked(entry, sections[term.value])
                .map((section) => section.number)
                .join(" ")}
              {others.size > 0 && ` — conflicts with ${[...others].join(", ")}`}{" "}
              <button
                type="button"
                onClick={() => {
                  editing.value =
                    editing.value === entry.code ? null : entry.code;
                }}
              >
                {editing.value === entry.code ? "Done" : "Change sections"}
              </button>
              {editing.value === entry.code && <Picker entry={entry} />}
            </li>
          );
        })}
      </ul>
      <Calendar />
    </>
  );
}

function Picker({ entry }: { entry: Entry }) {
  const termSections = sections[term.value];
  const offered = termSections[entry.code];
  const picks = picked(entry, termSections);
  const missing = missingTypes(picks, offered);
  const lead = offered[0].type;
  const types = [...new Set(offered.map((section) => section.type))];
  return (
    <>
      {types.map((type) => (
        <section key={type}>
          <h4>
            {type}
            {missing.includes(type) && " — pick one"}
          </h4>
          <ul>
            {offered
              .filter((section) => section.type === type)
              .map((section) => {
                const isPicked = picks.includes(section);
                const allowed = canChoose(section, picks, offered);
                const lectures = offered
                  .filter((s) => s.type === lead && s.group === section.group)
                  .map((s) => s.number);
                const others =
                  allowed && !isPicked
                    ? against(
                        conflicts(
                          withChoice(
                            schedule.value,
                            entry.code,
                            section,
                            termSections,
                          ),
                          termSections,
                        ),
                        (occurrence) => occurrence.section === section,
                      ).map(name)
                    : [];
                return (
                  <li key={section.crn}>
                    <button
                      type="button"
                      disabled={isPicked || !allowed}
                      onClick={() =>
                        choose(term.value, entry.code, section, termSections)
                      }
                    >
                      {isPicked && "✓ "}
                      {section.number} ·{" "}
                      {section.meetings.map(formatMeeting).join("; ") || "TBA"}
                    </button>
                    {!allowed && ` — goes with ${lectures.join(", ")}`}
                    {others.length > 0 &&
                      ` — conflicts with ${[...new Set(others)].join(", ")}`}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </>
  );
}

function Calendar() {
  const start = shownWeek.value;
  if (!start) return null;
  const termSections = sections[term.value];
  const days = [0, 1, 2, 3, 4, 5, 6]
    .map((offset) => addDays(start, offset))
    .map((date) => {
      const day = occurrences(schedule.value, termSections, date);
      return { date, day, found: conflictsOn(day) };
    })
    // Weekends only when something meets on them, which is rare.
    .filter(({ day }, index) => index < 5 || day.length > 0);
  const unscheduled = schedule.value.flatMap((entry) =>
    picked(entry, termSections)
      .filter((section) => section.meetings.every((meeting) => !meeting.time))
      .map((section) => `${entry.code} ${section.number}`),
  );
  return (
    <section>
      <h2>Week of {formatDate(start)}</h2>
      <button
        type="button"
        onClick={() => {
          week.value = addDays(start, -7);
        }}
      >
        Previous
      </button>
      <button
        type="button"
        onClick={() => {
          week.value = monday(today());
        }}
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => {
          week.value = addDays(start, 7);
        }}
      >
        Next
      </button>
      {days.map(({ date, day, found }) => (
        <section key={date}>
          <h3>{formatDate(date)}</h3>
          <ul>
            {day.map((occurrence) => {
              const others = against(found, (other) => other === occurrence);
              return (
                <li key={`${occurrence.section.crn} ${occurrence.time.start}`}>
                  {name(occurrence)} {formatTime(occurrence.time)}
                  {others.length > 0 &&
                    ` — conflicts with ${others.map(name).join(", ")}`}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {unscheduled.length > 0 && (
        <section>
          <h3>Unscheduled</h3>
          <ul>
            {unscheduled.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function Preview({ course }: { course: Course }) {
  return (
    <section>
      <h2>
        {course.code} {course.title}
      </h2>
      <a href={`/courses/${course.code}`}>Expand</a>
      <button
        type="button"
        disabled={
          !sections[term.value][course.code] ||
          schedule.value.some((entry) => entry.code === course.code)
        }
        onClick={() => addToSchedule(course.code)}
      >
        Add to schedule
      </button>
      <dl>
        {course.units && (
          <>
            <dt>Units</dt>
            <dd>{course.units}</dd>
          </>
        )}
        {course.hours && (
          <>
            <dt>Hours</dt>
            <dd>{course.hours}</dd>
          </>
        )}
      </dl>
      <CourseRequisites course={course} />
      <CourseSections course={course} />
      {course.description.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <CourseNotes course={course} />
    </section>
  );
}

function CourseSections({ course }: { course: Course }) {
  const offered = sections[term.value][course.code];
  if (!offered) return <p>Not offered in {termName(term.value)}</p>;
  return (
    <>
      {byType(offered).map(({ type, count, slots }) => (
        <section key={type}>
          <h3>{type}</h3>
          <ul>
            {slots.map((slot) => (
              <li key={JSON.stringify(slot)}>
                {formatDays(slot.days)} {formatTime(slot.time)}
              </li>
            ))}
          </ul>
          <p>
            {count} {count === 1 ? "section" : "sections"}
          </p>
        </section>
      ))}
    </>
  );
}

function CourseNotes({ course }: { course: Course }) {
  if (course.notes.length === 0) return null;
  return (
    <section>
      <h3>Notes</h3>
      <ul>
        {course.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}

function CourseRequisites({ course }: { course: Course }) {
  const kinds = [
    ["Prerequisites", course.prerequisites],
    ["Pre- or corequisites", course.preOrCorequisites],
    ["Corequisites", course.corequisites],
  ] as const;
  return (
    <>
      {kinds
        .filter(([, items]) => items.length > 0)
        .map(([heading, items]) => (
          <section key={heading}>
            <h3>{heading}</h3>
            <Requisites items={items} />
          </section>
        ))}
    </>
  );
}

function Requisites({ items }: { items: Requisite[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {"course" in item ? (
            <a href={`/courses/${item.course}`}>{item.course}</a>
          ) : "text" in item ? (
            item.text
          ) : (
            <>
              {item.label}
              <Requisites items={item.items} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function CoursePage({ code }: { code: string }) {
  const course = courses.find((course) => course.code === code);
  if (!course) return <p>No course {code}</p>;
  return (
    <main>
      <a href="/">Search</a>
      <h1>
        {course.code} {course.title}
      </h1>
      <CourseRequisites course={course} />
      {course.description.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <CourseNotes course={course} />
    </main>
  );
}

function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/courses/:code" component={CoursePage} />
      </Router>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
