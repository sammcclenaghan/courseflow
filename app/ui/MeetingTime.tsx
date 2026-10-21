import type { Meeting } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import { addDays, formatDateRange, formatTime } from "#domain/time.ts";
import styles from "./MeetingTime.module.css";

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];
const LETTERS = ["U", "M", "T", "W", "R", "F", "S"]; // UVic's, from Sunday
const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * When a meeting happens: "M T W R F" with its days in bold, then
 * "10:00 – 11:20 AM". Weekend letters only appear for weekend meetings, and
 * dates only for meetings that run for part of the term ("Oct 19–24").
 * `aligned` right-aligns the start time, so dashes line up down a list.
 */
export function MeetingTime({
  meeting,
  term,
  aligned = false,
}: {
  meeting: Meeting;
  term: Term;
  aligned?: boolean;
}) {
  if (!meeting.time) return <span class={styles.tba}>No set time</span>;
  const { start, end } = meeting.time;
  const days = meeting.days.some((day) => WEEKEND.includes(day))
    ? [...WEEKDAYS, ...WEEKEND]
    : WEEKDAYS;
  const partOfTerm =
    meeting.startDate > addDays(term.startDate, 7) ||
    meeting.endDate < addDays(term.endDate, -7);
  return (
    <span class={styles.meeting}>
      <span
        class={styles.days}
        role="img"
        aria-label={meeting.days.map((day) => NAMES[day]).join(", ")}
      >
        {days.map((day) => (
          <span key={day} data-on={meeting.days.includes(day)}>
            {LETTERS[day]}
          </span>
        ))}
      </span>
      <span>
        <span class={aligned ? styles.aligned : undefined}>
          {formatTime(start, start < 720 !== end < 720)}
        </span>
        <span class={styles.dash}>–</span>
        <span class={styles.end}>{formatTime(end, true)}</span>
      </span>
      {partOfTerm && (
        <span class={styles.end}>
          {formatDateRange(meeting.startDate, meeting.endDate)}
        </span>
      )}
    </span>
  );
}
