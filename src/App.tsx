import styles from "./App.module.css";
import { Calendar } from "./calendar/Calendar.tsx";
import { catalog } from "./catalog.ts";
import { health } from "./health.ts";
import { SelectedCourses } from "./schedule/SelectedCourses.tsx";
import { Search } from "./search/Search.tsx";

export function App() {
  const h = health.value;
  const c = catalog.value;
  return (
    <div class={styles.page}>
      <Calendar />
      <aside class={styles.sidebar}>
        <p class={styles.status}>
          {h.kind === "loading" && "Checking API…"}
          {h.kind === "error" && `API unreachable: ${h.reason}`}
          {h.kind === "ok" && h.data.message}
          {" · "}
          {c.kind === "loading" && "Loading catalog…"}
          {c.kind === "error" && `Catalog failed to load: ${c.reason}`}
          {c.kind === "ok" &&
            `${c.data.courses.length.toLocaleString()} courses loaded for ${c.data.term}`}
        </p>
        <SelectedCourses />
        <Search />
      </aside>
    </div>
  );
}
