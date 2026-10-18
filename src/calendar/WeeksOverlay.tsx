import type { RefObject } from "preact";
import { useRef } from "preact/hooks";
import type { DayEvent } from "../../shared/layout.ts";
import { formatWeek } from "../time.ts";
import {
  colorByCrn,
  GRID_START,
  gridEnd,
  showWeek,
  thisWeek,
  week,
  weeks,
} from "./calendar.ts";
import styles from "./WeeksOverlay.module.css";

/** Every week of the term at a glance; weeks with a conflict are ringed in red. */
export function WeeksOverlay({
  dialog,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
}) {
  const grid = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    // Each week button handles the arrows; the grid's column count decides up and down.
    const buttons = [...(grid.current?.querySelectorAll("button") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const columns = grid.current
      ? getComputedStyle(grid.current).gridTemplateColumns.split(" ").length
      : 1;
    const step = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }[event.key];
    if (!step || at < 0) return;
    event.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, at + step))]?.focus();
  };

  const open = (monday: number) => {
    showWeek(monday);
    dialog.current?.close();
  };

  return (
    <dialog ref={dialog} class={styles.overlay} aria-label="Weeks">
      <div class={styles.grid} ref={grid}>
        {weeks.value.map(({ monday, days }, i) => {
          const conflict = days.some((day) =>
            day.some((event) => event.conflicting),
          );
          return (
            <button
              key={monday}
              type="button"
              class={styles.week}
              data-conflict={conflict || undefined}
              autofocus={monday === week.value}
              aria-label={`Week ${i + 1}, ${formatWeek(monday)}${conflict ? ", has conflicts" : ""}`}
              onClick={() => open(monday)}
              onKeyDown={onKeyDown}
            >
              <span class={styles.card} style={{ display: "block" }}>
                <Thumbnail days={days} />
              </span>
              <span class={styles.label}>
                <span class={styles.number}>Week {i + 1}</span>
                <span class={styles.soft}>
                  {formatWeek(monday, { year: false })}
                </span>
                {monday === thisWeek && (
                  <span class={`${styles.soft} ${styles.now}`}>This week</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div class={`${styles.hints} ${styles.soft}`} aria-hidden="true">
        <Hint keys={["←", "→", "↑", "↓"]} label="move" />
        <Hint keys={["↵"]} label="open" />
        <Hint keys={["esc"]} label="close" />
      </div>
    </dialog>
  );
}

function Thumbnail({ days }: { days: DayEvent[][] }) {
  const span = gridEnd.value - GRID_START;
  return (
    <span class={styles.days} style={{ display: "grid" }}>
      {days.map((events, i) => (
        <span key={i} class={styles.day} style={{ display: "block" }}>
          {events.map((event) => {
            const color = colorByCrn.value.get(event.section.crn);
            // At this size a pale tint can't say "conflict", so conflicts are solid red.
            const fill = event.conflicting
              ? "var(--color-conflict-solid)"
              : `var(--color-course-${color})`;
            const ring = event.conflicting
              ? "var(--color-conflict-solid)"
              : `var(--color-course-${color}-ring)`;
            return (
              <span
                key={`${event.section.crn} ${event.start}`}
                class={styles.block}
                style={{
                  top: `${((event.start - GRID_START) / span) * 100}%`,
                  height: `max(3px, ${((event.end - event.start) / span) * 100}%)`,
                  left: `calc(${event.left * 100}% + 2px)`,
                  width: `calc(${event.width * 100}% - 4px)`,
                  background: fill,
                  boxShadow: `inset 0 0 0 1px ${ring}`,
                }}
              />
            );
          })}
        </span>
      ))}
    </span>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span class={styles.hint}>
      {keys.map((key) => (
        <kbd key={key} class={styles.key}>
          {key}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
