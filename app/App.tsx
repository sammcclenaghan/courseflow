import { termName } from "#domain/term.ts";
import styles from "./App.module.css";
import { Search } from "./search/Search.tsx";
import { TERM_CODE } from "./term.ts";

export function App() {
  return (
    <div class={styles.page}>
      <header class={styles.header}>
        <strong>CourseFlow</strong>
        <span class={styles.term}>{termName(TERM_CODE)}</span>
        <Search />
      </header>
    </div>
  );
}
