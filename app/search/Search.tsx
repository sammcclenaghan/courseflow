import { useComputed, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { displayCode } from "#domain/course.ts";
import { searchCourses } from "#domain/search.ts";
import { termName } from "#domain/term.ts";
import { courses, isAdded, toggleCourse } from "../schedule.ts";
import { TERM_CODE, term } from "../term.ts";
import { button } from "../ui/button.ts";
import { CourseDetail } from "./CourseDetail.tsx";

const TERM_NAME = termName(TERM_CODE);

/** Queries to try on an empty search, each one finding something. */
const SUGGESTIONS = [
  "CSC 110",
  "psychology",
  "data structures",
  "indigenous language",
];

// A key in a hint; touch screens have no keys to hint at.
const KEY =
  "min-w-5 rounded-key bg-surface px-[5px] py-px text-center font-medium font-sans text-muted text-sm shadow-[0_0_0_1px_var(--color-line)] pointer-coarse:hidden";

// A message in place of results; its second line is a muted hint.
const MESSAGE = "flex flex-col gap-1 px-2.5 py-2 *:text-muted";

let openDialog: (() => void) | undefined;

/** Opens search from anywhere, like the empty schedule's button. */
export const openSearch = () => openDialog?.();

/**
 * The "Search courses" button, and the dialog it opens. "/" opens it too.
 * Results are on the left and the highlighted one's details on the right;
 * ↑↓ move through the results and ↵ adds or removes the highlighted course.
 */
export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const query = useSignal("");
  const active = useSignal(0);
  const results = useComputed(() =>
    typeof term.value === "string"
      ? []
      : searchCourses(term.value.courses, query.value),
  );

  useEffect(() => {
    openDialog = () => dialog.current?.showModal();
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

  const search = (text: string) => {
    query.value = text;
    active.value = 0;
  };

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
  const highlighted = typed ? results.value[active.value] : undefined;
  const count = courses.value.length;
  return (
    <>
      <button
        type="button"
        class={button.secondary}
        onClick={() => dialog.current?.showModal()}
      >
        <SearchIcon size={16} />
        Search courses
        <kbd class={KEY}>/</kbd>
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboards close a dialog with Esc. */}
      <dialog
        ref={dialog}
        class="mx-auto mt-20 h-[min(620px,100%-112px)] max-h-none w-[min(900px,100%-32px)] max-w-none rounded-panel bg-surface p-0 text-ink text-sm shadow-dialog backdrop:bg-ink/25"
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
        <div class="flex h-full flex-col">
          <label class="flex h-13.5 shrink-0 items-center gap-2.5 border-line border-b pr-3.5 pl-4 text-muted">
            <SearchIcon size={18} />
            <input
              ref={input}
              // 16px stops iOS zooming in on focus.
              class="min-w-0 flex-1 px-0.5 text-ink text-lg outline-none placeholder:text-muted"
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
                highlighted ? `result-${active.value}` : undefined
              }
              value={query.value}
              onInput={(event) => search(event.currentTarget.value)}
              onKeyDown={onKeyDown}
            />
            <kbd class={KEY}>esc</kbd>
          </label>

          <div class="flex min-h-0 flex-1">
            {/* Too narrow for two panes, the results take the width. */}
            <div class="w-90 shrink-0 overflow-y-auto px-4 py-2 max-[720px]:w-auto max-[720px]:flex-1">
              {term.value === "loading" ? (
                <p class={MESSAGE}>Loading the {TERM_NAME} timetable…</p>
              ) : term.value === "failed" ? (
                <p class={MESSAGE}>
                  The {TERM_NAME} timetable didn't load. Refresh to try again.
                </p>
              ) : !typed ? (
                <div>
                  <span class="block px-2.5 py-1 text-muted">Try</span>
                  <div class="flex flex-wrap gap-1.5 py-1">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        class="h-control cursor-pointer rounded-full bg-fill px-2.5 text-sm"
                        onClick={() => {
                          search(suggestion);
                          input.current?.focus();
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.value.length === 0 ? (
                <p class={MESSAGE}>
                  No {TERM_NAME} courses match “{typed}”
                  <span>
                    Try a course code like CSC 110, or a word from the title.
                  </span>
                </p>
              ) : (
                <div id="search-results" role="listbox">
                  {results.value.map((course, i) => {
                    const added = isAdded(course);
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
                        class="mb-0.5 flex cursor-pointer items-start gap-3 rounded-control px-2.5 py-2 aria-selected:bg-fill"
                        onMouseMove={() => {
                          active.value = i;
                        }}
                        onClick={() => toggleCourse(course)}
                      >
                        <span class="flex min-w-0 flex-1 flex-col">
                          <strong class="font-semibold">
                            {displayCode(course.code)}
                          </strong>
                          <span class="truncate text-muted">
                            {course.title}
                          </span>
                        </span>
                        {added && (
                          <span class="shrink-0 text-muted">Added</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div class="min-w-0 flex-1 overflow-y-auto border-line border-l max-[720px]:hidden">
              {highlighted && typeof term.value !== "string" ? (
                <CourseDetail course={highlighted} term={term.value} />
              ) : (
                !typed && (
                  <p class="flex h-full items-center justify-center text-muted">
                    Search the {TERM_NAME} timetable
                  </p>
                )
              )}
            </div>
          </div>

          <footer class="flex h-9.5 shrink-0 items-center gap-4 border-line border-t px-4 text-muted">
            <span class="flex items-center gap-1 pointer-coarse:hidden max-[720px]:hidden">
              <kbd class={KEY}>↑</kbd>
              <kbd class={KEY}>↓</kbd>
              browse
            </span>
            <span class="flex items-center gap-1 pointer-coarse:hidden max-[720px]:hidden">
              <kbd class={KEY}>↵</kbd>
              add or remove
            </span>
            <span class="ml-auto whitespace-nowrap">
              {count} {count === 1 ? "course" : "courses"} selected
            </span>
          </footer>
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

const SearchIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
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
