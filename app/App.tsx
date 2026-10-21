import { termName } from "#domain/term.ts";
import { Calendar } from "./calendar/Calendar.tsx";
import { SelectedCourses } from "./courses/SelectedCourses.tsx";
import { Search } from "./search/Search.tsx";
import { TERM_CODE } from "./term.ts";

export function App() {
  return (
    <div class="flex min-h-dvh flex-col gap-4 bg-surface-subtle p-4">
      <header class="flex items-center gap-3">
        <strong>CourseFlow</strong>
        <span class="mr-auto text-muted">{termName(TERM_CODE)}</span>
        <Search />
      </header>
      {/* Narrow screens stack. Phones get their own design later. */}
      <main class="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-4 max-[900px]:grid-cols-1">
        <Calendar />
        <SelectedCourses />
      </main>
    </div>
  );
}
