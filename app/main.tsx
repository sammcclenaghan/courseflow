import { computed, signal } from "@preact/signals";
import { render } from "preact";
import { LocationProvider, Route, Router } from "preact-iso";
import type { Course } from "../catalog/courses.ts";

const courses: Course[] = await (await fetch("/data/courses.json")).json();

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
      {course.description.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
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
      {course.description.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
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
