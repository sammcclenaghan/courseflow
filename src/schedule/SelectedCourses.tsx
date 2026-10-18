import { useEffect } from "preact/hooks";
import { displayCode } from "../../shared/code.ts";
import { Button } from "../ui/Button.tsx";
import { ChevronDown, Close } from "../ui/icons.tsx";
import { collapsed, revealed, toggleCourse } from "./panel.ts";
import { SectionBox } from "./SectionBox.tsx";
import styles from "./SelectedCourses.module.css";
import {
  changeSection,
  clearSchedule,
  removeCourse,
  selectedCourses,
} from "./schedule.ts";

const PLURAL: Record<string, string> = {
  Lecture: "Lectures",
  "Lecture Topic": "Lecture topics",
  Lab: "Labs",
  "Gradable Lab": "Gradable labs",
  Tutorial: "Tutorials",
  Practicum: "Practicums",
  Seminar: "Seminars",
};

export function SelectedCourses() {
  const courses = selectedCourses.value;
  const shown = revealed.value;

  // A section clicked on the calendar: scroll to it, focus it, and flash it.
  useEffect(() => {
    if (!shown) return;
    const radio = document.getElementById(`section-${shown.crn}`);
    const box = radio?.closest("label");
    if (!radio || !box) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({
      block: "center",
      behavior: still ? "auto" : "smooth",
    });
    radio.focus({ preventScroll: true });
    box.animate(
      [
        { boxShadow: "0 0 0 4px rgb(10 10 10 / 16%)" },
        { boxShadow: "0 0 0 4px rgb(10 10 10 / 0%)" },
      ],
      { duration: 1200, easing: "ease-out" },
    );
  }, [shown]);

  return (
    <section class={styles.panel} aria-labelledby="selected-heading">
      <header class={styles.header}>
        <h2 id="selected-heading" class={styles.heading}>
          Selected courses
        </h2>
        {courses.length > 0 && <Button onClick={clearSchedule}>Clear</Button>}
      </header>
      {courses.length === 0 ? (
        <p class={styles.empty}>Courses you add show up here.</p>
      ) : (
        <ul class={styles.courses}>
          {courses.map(({ course, sections: picked }) => {
            const open = !collapsed.value.has(course.code);
            const types = [...new Set(course.sections.map((s) => s.type))];
            return (
              <li key={course.code} class={styles.course}>
                <div class={styles.courseHead}>
                  <button
                    type="button"
                    class={styles.toggle}
                    aria-expanded={open}
                    onClick={() => toggleCourse(course.code)}
                  >
                    <span class={styles.titles}>
                      <span class={styles.code}>
                        {displayCode(course.code)}
                      </span>
                      <span class={styles.title}>{course.title}</span>
                    </span>
                    <span class={styles.chevron}>
                      <ChevronDown />
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    class={styles.remove}
                    aria-label={`Remove ${displayCode(course.code)}`}
                    onClick={() => removeCourse(course.code)}
                  >
                    <Close />
                  </Button>
                </div>
                {open && (
                  <div class={styles.types}>
                    {types.map((type) => (
                      <fieldset key={type} class={styles.type}>
                        <legend class={styles.typeName}>
                          {PLURAL[type] ?? type}
                        </legend>
                        {course.sections
                          .filter((s) => s.type === type)
                          .map((section) => (
                            <SectionBox
                              key={section.crn}
                              section={section}
                              topic={
                                section.title === course.title
                                  ? null
                                  : section.title
                              }
                              name={`${course.code} ${type}`}
                              picked={picked.some((p) => p.crn === section.crn)}
                              onPick={() => changeSection(course.code, section)}
                            />
                          ))}
                      </fieldset>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
