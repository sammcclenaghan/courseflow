import { useRef } from "preact/hooks";
import { displayCode } from "../../shared/code.ts";
import type { Occurrence } from "../../shared/conflicts.ts";
import type { Placed } from "../../shared/layout.ts";
import { revealSection } from "../schedule/panel.ts";
import {
  formatHour,
  formatTime,
  formatTimeRange,
  formatWeek,
} from "../time.ts";
import { Button } from "../ui/Button.tsx";
import { ChevronLeft, ChevronRight, Grid } from "../ui/icons.tsx";
import styles from "./Calendar.module.css";
import {
  colorByCrn,
  conflicts,
  days,
  GRID_START,
  gridEnd,
  isFirstWeek,
  isLastWeek,
  showNextWeek,
  showPreviousWeek,
  showToday,
  week,
} from "./calendar.ts";
import { WeeksOverlay } from "./WeeksOverlay.tsx";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function Calendar() {
  const weeksDialog = useRef<HTMLDialogElement>(null);
  const span = gridEnd.value - GRID_START;
  const hours = Array.from(
    { length: span / 60 - 1 },
    (_, i) => GRID_START + (i + 1) * 60,
  );
  return (
    <section class={styles.panel} aria-label="Calendar">
      <header class={styles.header}>
        <Button onClick={showToday}>Today</Button>
        <div class={styles.arrows}>
          <Button
            variant="ghost"
            aria-label="Previous week"
            disabled={isFirstWeek.value}
            onClick={showPreviousWeek}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            aria-label="Next week"
            disabled={isLastWeek.value}
            onClick={showNextWeek}
          >
            <ChevronRight />
          </Button>
        </div>
        <h2 class={styles.title} aria-live="polite">
          {formatWeek(week.value)}
        </h2>
        <Button
          variant="primary"
          class={styles.weeks}
          aria-label={
            conflicts.value.length > 0
              ? "Weeks, schedule has conflicts"
              : "Weeks"
          }
          onClick={() => weeksDialog.current?.showModal()}
        >
          <Grid />
          Weeks
          {conflicts.value.length > 0 && <span class={styles.dot} />}
        </Button>
      </header>
      <WeeksOverlay dialog={weeksDialog} />

      <div class={styles.top}>
        <div class={styles.gutter} />
        <div class={styles.days} style={{ flex: 1 }}>
          {DAY_NAMES.map((name) => (
            <div key={name} class={styles.dayName}>
              {name}
            </div>
          ))}
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.canvas} style={{ "--hours": span / 60 }}>
          <div class={`${styles.gutter} ${styles.hours}`} aria-hidden="true">
            {hours.map((minutes) => (
              <span
                key={minutes}
                class={styles.hour}
                style={{ top: `${((minutes - GRID_START) / span) * 100}%` }}
              >
                {formatHour(minutes)}
              </span>
            ))}
          </div>
          <div class={styles.columns}>
            {days.value.map((events, i) => (
              <div key={DAY_NAMES[i]} class={styles.day}>
                {events.map((event) => (
                  <Event
                    key={`${event.section.crn}-${event.start}`}
                    event={event}
                    span={span}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Event({ event, span }: { event: Placed<Occurrence>; span: number }) {
  const { section, start, end, left, width, z, covered } = event;
  const course = displayCode(section.subject + section.courseNumber);
  // Narrow or partly covered: course on top, then section and start time.
  const compact = width < 0.7 || covered;
  return (
    <div
      class={styles.slot}
      data-on-top={z > 1 || undefined}
      style={{
        top: `${((start - GRID_START) / span) * 100}%`,
        height: `${((end - start) / span) * 100}%`,
        left: `${left * 100}%`,
        width: `${width * 100}%`,
        zIndex: z,
      }}
    >
      <button
        type="button"
        class={styles.event}
        style={{
          background: `var(--color-course-${colorByCrn.value.get(section.crn)})`,
        }}
        aria-label={`${course} ${section.number}, ${formatTimeRange(start, end)}`}
        onClick={() =>
          revealSection(section.subject + section.courseNumber, section.crn)
        }
      >
        <span class={styles.line}>
          <span class={styles.course}>{course}</span>
          {!compact && <span class={styles.quiet}>{section.number}</span>}
        </span>
        {compact ? (
          <span class={styles.line}>
            <span class={styles.course}>{section.number}</span>
            <span class={styles.quiet}>{formatTime(start)}</span>
          </span>
        ) : (
          <span class={`${styles.line} ${styles.quiet}`}>
            {formatTimeRange(start, end)}
          </span>
        )}
      </button>
    </div>
  );
}
