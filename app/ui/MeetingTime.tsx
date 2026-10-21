import type { Meeting } from "#domain/section.ts";
import type { Term } from "#domain/term.ts";
import { addDays, formatDateRange, formatTime } from "#domain/time.ts";

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
  if (!meeting.time) return <span class="text-muted">No set time</span>;
  const { start, end } = meeting.time;
  const days = meeting.days.some((day) => WEEKEND.includes(day))
    ? [...WEEKDAYS, ...WEEKEND]
    : WEEKDAYS;
  const partOfTerm =
    meeting.startDate > addDays(term.startDate, 7) ||
    meeting.endDate < addDays(term.endDate, -7);
  return (
    <span class="flex items-center gap-3 whitespace-nowrap tabular-nums">
      <span
        class="flex shrink-0"
        role="img"
        aria-label={meeting.days.map((day) => NAMES[day]).join(", ")}
      >
        {days.map((day) => (
          <span
            key={day}
            // The weekend sits a little apart, so weekday letters never move.
            class={`w-3 text-center ${meeting.days.includes(day) ? "font-semibold" : "text-faint"} ${day === 6 ? "ml-1" : ""}`}
          >
            {LETTERS[day]}
          </span>
        ))}
      </span>
      <span>
        <span class={aligned ? "inline-block min-w-16 text-right" : undefined}>
          {formatTime(start, start < 720 !== end < 720)}
        </span>
        <span class="px-1 text-faint">–</span>
        <span class="text-muted">{formatTime(end, true)}</span>
      </span>
      {partOfTerm && (
        <span class="text-muted">
          {formatDateRange(meeting.startDate, meeting.endDate)}
        </span>
      )}
    </span>
  );
}
