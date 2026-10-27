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

function Search() {
  return (
    <main>
      <input
        type="search"
        placeholder="Search courses"
        value={query.value}
        onInput={(event) => {
          query.value = event.currentTarget.value;
        }}
      />
      <ul>
        {results.value.map((course) => (
          <li key={course.code}>
            <a href={`/courses/${course.code}`}>
              {course.code} {course.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
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
