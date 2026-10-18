import styles from "./App.module.css";
import { Calendar } from "./calendar/Calendar.tsx";
import { SelectedCourses } from "./schedule/SelectedCourses.tsx";
import { Search } from "./search/Search.tsx";

export function App() {
  return (
    <div class={styles.page}>
      <Calendar />
      <aside class={styles.sidebar}>
        <SelectedCourses />
        <Search />
      </aside>
    </div>
  );
}
