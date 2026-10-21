import { useComputed, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { displayCode } from "#domain/course.ts";
import { searchCourses } from "#domain/search.ts";
import { termName } from "#domain/term.ts";
import { courseState, toggleCourse, whyBlocked } from "../schedule.ts";
import { TERM_CODE, term } from "../term.ts";
import button from "../ui/button.module.css";
import styles from "./Search.module.css";

const TERM_NAME = termName(TERM_CODE);

/**
 * The "Search courses" button, and the dialog it opens. "/" opens it too.
 * ↑↓ move through the results and ↵ adds or removes the highlighted course.
 */
export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useSignal("");
  const active = useSignal(0);
  const results = useComputed(() =>
    typeof term.value === "string"
      ? []
      : searchCourses(term.value.courses, query.value),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTyping(event.target)) return;
      event.preventDefault();
      dialog.current?.showModal();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Keep the highlighted result in view as the arrow keys move it.
  useEffect(() => {
    document
      .getElementById(`result-${active.value}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active.value]);

  const onKeyDown = (event: KeyboardEvent) => {
    const last = results.value.length - 1;
    if (event.key === "ArrowDown")
      active.value = Math.min(active.value + 1, last);
    else if (event.key === "ArrowUp")
      active.value = Math.max(active.value - 1, 0);
    else if (event.key === "Enter" && results.value[active.value])
      toggleCourse(results.value[active.value]);
    else return;
    event.preventDefault();
  };

  const typed = query.value.trim();
  return (
    <>
      <button
        type="button"
        class={button.secondary}
        onClick={() => dialog.current?.showModal()}
      >
        <SearchIcon />
        Search courses
        <kbd class={styles.key}>/</kbd>
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboards close a dialog with Esc. */}
      <dialog
        ref={dialog}
        class={styles.dialog}
        aria-label="Search courses"
        // A click on the backdrop lands on the dialog itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        // Opened with "/", there's nothing to hand focus back to, so it would
        // stay on the hidden input and swallow the next "/".
        onClose={(event) => {
          const focused = document.activeElement;
          if (
            focused instanceof HTMLElement &&
            event.currentTarget.contains(focused)
          )
            focused.blur();
        }}
      >
        <div class={styles.panel}>
          <label class={styles.field}>
            <SearchIcon />
            <input
              // Not type="search": its Esc clears the text instead of closing.
              type="text"
              inputmode="search"
              enterkeyhint="search"
              autocomplete="off"
              spellcheck={false}
              placeholder="Course code or title"
              role="combobox"
              aria-expanded={results.value.length > 0}
              aria-controls="search-results"
              aria-activedescendant={
                results.value.length > 0 ? `result-${active.value}` : undefined
              }
              value={query.value}
              onInput={(event) => {
                query.value = event.currentTarget.value;
                active.value = 0;
              }}
              onKeyDown={onKeyDown}
            />
            <kbd class={styles.key}>esc</kbd>
          </label>
          {term.value === "loading" ? (
            <p class={styles.message}>Loading the {TERM_NAME} timetable…</p>
          ) : term.value === "failed" ? (
            <p class={styles.message}>
              The {TERM_NAME} timetable didn't load. Refresh to try again.
            </p>
          ) : !typed ? (
            <p class={styles.message}>Search the {TERM_NAME} timetable</p>
          ) : results.value.length === 0 ? (
            <p class={styles.message}>
              No {TERM_NAME} courses match “{typed}”
              <span>
                Try a course code like CSC 110, or a word from the title.
              </span>
            </p>
          ) : (
            <div id="search-results" role="listbox" class={styles.results}>
              {results.value.map((course, i) => {
                const state = courseState(course);
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the input's ↑↓ and ↵ drive the list.
                  <div
                    key={course.code}
                    id={`result-${i}`}
                    role="option"
                    // Focus stays in the input, which points here with
                    // aria-activedescendant.
                    tabIndex={-1}
                    aria-selected={i === active.value}
                    aria-disabled={state === "blocked"}
                    class={styles.result}
                    data-state={state}
                    onMouseMove={() => {
                      active.value = i;
                    }}
                    onClick={() => toggleCourse(course)}
                  >
                    <span class={styles.text}>
                      <strong>{displayCode(course.code)}</strong>
                      <span>{course.title}</span>
                    </span>
                    {state === "added" && (
                      <span class={styles.status}>Added</span>
                    )}
                    {state === "blocked" && (
                      <span class={styles.status}>{whyBlocked(course)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

// Typing "/" into a field types it, rather than opening search.
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
