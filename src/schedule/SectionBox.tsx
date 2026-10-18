import type { Meeting, Section } from "../../shared/model.ts";
import { formatTime, period } from "../time.ts";
import { Info } from "../ui/icons.tsx";
import styles from "./SectionBox.module.css";

export function SectionBox({
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
