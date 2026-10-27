import { computed, signal } from "@preact/signals";
import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";
import type { Course } from "../catalog/courses.ts";
import type { Requisite } from "../catalog/requisites.ts";
import type { TermSections } from "../catalog/terms.ts";
import { add, schedules } from "./schedule.ts";
import { byType, formatDays, formatTime, termName } from "./sections.ts";

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

function Search() {
  const course = results.value[selected.value];
  return (
    <main>
      <select
        value={term.value}
        onChange={(event) => {
          term.value = event.currentTarget.value;
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
      <h2>Schedule</h2>
      <ul>
        {schedule.value.map(({ code, crns }) => (
          <li key={code}>
            {code}{" "}
            {sections[term.value][code]
              .filter((section) => crns.includes(section.crn))
              .map((section) => section.number)
              .join(" ")}
          </li>
        ))}
      </ul>
    </main>
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
        <Route path="/" component={Search} />
        <Route path="/courses/:code" component={CoursePage} />
      </Router>
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
