import { computed, signal } from "@preact/signals";
import { render } from "preact";
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

function App() {
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
            {course.code} {course.title}
          </li>
        ))}
      </ul>
    </main>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
