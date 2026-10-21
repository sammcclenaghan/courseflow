import { useSignal } from "@preact/signals";
import { displayCode } from "#domain/course.ts";
import { meetsOn } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import {
  addDays,
  formatDayName,
  formatHour,
  formatTimeRange,
  formatWeek,
  mondayOf,
  today,
} from "#domain/time.ts";
import { colors, picked } from "../schedule.ts";
import { term } from "../term.ts";
import button from "../ui/button.module.css";
import styles from "./Calendar.module.css";

/** Pixels per hour. */
const HOUR = 64;

/** One week of the schedule, with every class that meets on each day. */
export function Calendar() {
  return typeof term.value === "string" ? null : <Week term={term.value} />;
}

function Week({ term }: { term: Term }) {
  const start = startWeek(term);
  const week = useSignal(start);
  const inTerm = term.startDate <= today() && today() <= term.endDate;

  // Monday to Friday, plus the weekend when a class meets on it this week.
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.value, i))
    .map((date) => ({ date, classes: classesOn(date) }))
    .filter(({ classes }, i) => i < 5 || classes.length > 0);

  // 8 AM to 6 PM, stretched to fit every class in any week, so the grid
  // doesn't jump around between weeks.
  const times = picked.value.flatMap(({ section }) =>
    section.meetings.flatMap((meeting) => meeting.time ?? []),
  );
  const first = Math.min(
    480,
    ...times.map((t) => Math.floor(t.start / 60) * 60),
  );
  const last = Math.max(1080, ...times.map((t) => Math.ceil(t.end / 60) * 60));
  const hours = Array.from(
    { length: (last - first) / 60 },
    (_, i) => first + i * 60,
  );
  // Preact 11 doesn't add "px" to numbers in styles.
  const top = (minutes: number) => `${((minutes - first) / 60) * HOUR}px`;
  const height = (start: number, end: number) =>
    `${((end - start) / 60) * HOUR}px`;

  const untimed = picked.value.filter(
    ({ section }) => !section.meetings.some((meeting) => meeting.time),
  );

  return (
    <section class={styles.calendar} aria-label="Weekly calendar">
      <header class={styles.toolbar}>
        <button
          type="button"
          class={button.secondary}
          onClick={() => {
            week.value = start;
          }}
        >
          {inTerm ? "Today" : "First week"}
        </button>
        <button
          type="button"
          class={button.icon}
          aria-label="Previous week"
          onClick={() => {
            week.value = addDays(week.value, -7);
          }}
        >
          <Chevron path="m15 18-6-6 6-6" />
        </button>
        <button
          type="button"
          class={button.icon}
          aria-label="Next week"
          onClick={() => {
            week.value = addDays(week.value, 7);
          }}
        >
          <Chevron path="m9 18 6-6-6-6" />
        </button>
        <h2 class={styles.week}>{formatWeek(week.value)}</h2>
      </header>

      <div
        class={styles.grid}
        style={{ "--days": days.length, "--hour": `${HOUR}px` }}
      >
        <div />
        {days.map(({ date }) => (
          <div key={date} class={styles.day}>
            {formatDayName(date)}
          </div>
        ))}

        <div class={styles.hours} style={{ height: top(last) }}>
          {hours.slice(1).map((hour) => (
            <span key={hour} style={{ top: top(hour) }}>
              {formatHour(hour)}
            </span>
          ))}
        </div>
        {days.map(({ date, classes }) => (
          <div key={date} class={styles.column} style={{ height: top(last) }}>
            {classes.map(({ course, section, start, end }, i) => (
              <div
                key={`${section.crn}-${start}`}
                class={styles.class}
                // A section can overlap its own other meeting (ASTR 101's
                // observing night); the later one sits indented on top.
                data-indented={classes
                  .slice(0, i)
                  .some((earlier) => earlier.end > start)}
                style={{
                  top: top(start),
                  height: height(start, end),
                  "--tint": `var(${colors.value.get(course.code)})`,
                  "--ring": `var(${colors.value.get(course.code)}-ring)`,
                }}
              >
                <span class={styles.name}>
                  <span>{displayCode(course.code)}</span>
                  <span>{section.number}</span>
                </span>
                <span class={styles.time}>{formatTimeRange(start, end)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {untimed.length > 0 && (
        <p class={styles.untimed}>
          No set time:{" "}
          {untimed
            .map(
              ({ course, section }) =>
                `${displayCode(course.code)} ${section.number}`,
            )
            .join(", ")}
        </p>
      )}
    </section>
  );
}

/** The picked classes that meet on a date, earliest first. */
const classesOn = (date: string) =>
  picked.value
    .flatMap(({ course, section }) =>
      section.meetings.flatMap((meeting) =>
        meeting.time && meetsOn(meeting, date)
          ? [{ course, section, ...meeting.time }]
          : [],
      ),
    )
    .sort((a, b) => a.start - b.start);

/** This week during the term; otherwise the first full week of classes. */
function startWeek(term: Term) {
  const now = today();
  if (term.startDate <= now && now <= term.endDate) return mondayOf(now);
  const monday = mondayOf(term.startDate);
  return monday === term.startDate ? monday : addDays(monday, 7);
}

const Chevron = ({ path }: { path: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);
