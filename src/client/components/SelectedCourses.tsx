import { useEffect } from "preact/hooks";
import { displayCode } from "../../catalog/code.ts";
import type { Meeting, Section } from "../../catalog/model.ts";
import { collapsed, revealed, toggleCourse } from "../panel.ts";
import {
  changeSection,
  clearSchedule,
  removeCourse,
  selectedCourses,
} from "../schedule.ts";
import { formatTime, period } from "../time.ts";
import { Button } from "../ui/Button.tsx";
import { ChevronDown, Close, Info } from "../ui/icons.tsx";
import styles from "./SelectedCourses.module.css";

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

function SectionBox({
  section,
  topic,
  name,
  picked,
  onPick,
}: {
  section: Section;
  /** Lecture Topic sections have their own titles: "Is it Okay to Love an AI Chatbot?" */
  topic: string | null;
  name: string;
  picked: boolean;
  onPick: () => void;
}) {
  const { seats, waitlist } = section;
  const tipId = `tip-${section.crn}`;
  const timed = section.meetings.filter((m) => m.start !== null);
  return (
    <label class={styles.box} data-full={seats.available <= 0 || undefined}>
      <input
        type="radio"
        id={`section-${section.crn}`}
        class={styles.radio}
        name={name}
        checked={picked}
        aria-describedby={section.note ? tipId : undefined}
        onChange={onPick}
      />
      <span class={styles.line}>
        <span class={styles.number}>{section.number}</span>
        {section.note && (
          <span class={styles.info}>
            <Info />
          </span>
        )}
        {topic && <span class={styles.topic}>{topic}</span>}
      </span>
      {section.note && (
        <span id={tipId} class={styles.tip} role="tooltip">
          {section.note}
        </span>
      )}
      <span class={styles.counts}>
        {waitlist.enrolled > 0 && (
          <span class={styles.quiet}>+{waitlist.enrolled} wait</span>
        )}
        <span>
          {seats.enrolled}
          <span class={styles.faint}>/{seats.capacity}</span>
        </span>
      </span>
      <span class={styles.meetings}>
        {timed.length > 0 ? (
          timed.map((meeting) => (
            <MeetingTime
              key={`${meeting.startDate} ${meeting.days} ${meeting.start}`}
              meeting={meeting}
            />
          ))
        ) : (
          <span class={styles.quiet}>No set time</span>
        )}
      </span>
      <span
        class={styles.bar}
        title={`${seats.enrolled} of ${seats.capacity} seats taken`}
      >
        <span
          class={styles.fill}
          style={{
            width: `${Math.min(1, seats.enrolled / (seats.capacity || 1)) * 100}%`,
          }}
        />
      </span>
    </label>
  );
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];
const LETTERS = ["U", "M", "T", "W", "R", "F", "S"];
const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MeetingTime({ meeting }: { meeting: Meeting }) {
  const start = meeting.start as number;
  const end = meeting.end as number;
  const on = new Set(meeting.days);
  const slot = (day: number) => (
    <span key={day} class={styles.day} data-on={on.has(day) || undefined}>
      {LETTERS[day]}
    </span>
  );
  return (
    <span class={styles.meeting}>
      <span
        class={styles.days}
        role="img"
        aria-label={`Meets ${meeting.days.map((d) => NAMES[d]).join(", ")}`}
      >
        {WEEKDAYS.map(slot)}
        {WEEKEND.some((d) => on.has(d)) && (
          <span class={styles.weekend}>{WEEKEND.map(slot)}</span>
        )}
      </span>
      <span>
        {formatTime(start)}
        {/* AM/PM on the start only when the class crosses noon. */}
        {period(start) !== period(end) && ` ${period(start)}`}
        <span class={styles.faint}> – </span>
        <span class={styles.quiet}>
          {formatTime(end)} {period(end)}
        </span>
      </span>
    </span>
  );
}
