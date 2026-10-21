// The finished Courseflow components, styled only through the token variables in tokens.css,
// and driven by one schedule: real 202609 sections, picked per course.
import React from "https://esm.sh/react@19";
import htm from "https://esm.sh/htm@3";
import { fmt, per, timeRange, displayCode, parse, iso, addDays, mondayOf, shortRange, longRange } from "./logic.js";
const { useState, useEffect, useMemo, useRef } = React;
export const html = htm.bind(React.createElement);

const v = (name) => `var(--${name})`;
const TNUM = { fontVariantNumeric: "tabular-nums" };
const TEXT = { fontSize: v("text-sm"), lineHeight: v("leading-sm") };
const PANEL = { background: v("color-surface"), borderRadius: v("radius-panel"), boxShadow: v("shadow-ring") };
export const BUTTON = { height: v("spacing-control"), paddingInline: v("spacing-3"), display: "flex", alignItems: "center", justifyContent: "center", gap: v("spacing-1_5"),
  border: 0, borderRadius: v("radius-control"), backgroundColor: "transparent", fontWeight: v("font-weight-medium"), cursor: "pointer", ...TEXT };
export const SECONDARY = { ...BUTTON, backgroundColor: v("color-surface"), boxShadow: v("shadow-secondary"), color: v("color-ink") };
export const PRIMARY = { ...BUTTON, backgroundImage: v("gradient-primary"), boxShadow: v("shadow-primary"), color: "#FAFAFA" };
export const GHOST_ICON = { ...BUTTON, width: v("spacing-control"), paddingInline: 0 };
const LINE = `1px solid ${v("color-line")}`;

export const Svg = ({ size = 16, style, children }) => html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style=${{ flexShrink: 0, ...style }}>${children}</svg>`;
const GridIcon = () => html`<${Svg}>${[[3, 3], [14, 3], [3, 14], [14, 14]].map(([x, y]) => html`<rect key=${`${x}${y}`} x=${x} y=${y} width="7" height="7" rx="1.5" />`)}</${Svg}>`;
const SearchIcon = ({ size = 16 }) => html`<${Svg} size=${size}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></${Svg}>`;

// ───────────────────────── Schedule ─────────────────────────
// A plan is { "CSC225": [crn, crn], ... } in the order courses were added; the order picks the tint.
export const TINTS = ["green", "purple", "cyan", "blue"];
const tint = (name) => [v(`color-course-${name}`), v(`color-course-${name}-ring`)];
const TODAY = "2026-10-15";

export const firstPicks = (course) => typesOf(course.sections).map((t) => course.sections.filter((s) => s.scheduleType === t).sort(byNumber)[0].crn);

function pickedSections(byCode, plan) {
  return Object.entries(plan).flatMap(([code, crns], i) => byCode.get(code).sections
    .filter((s) => crns.includes(s.crn)).map((s) => ({ code, tint: TINTS[i % TINTS.length], s })));
}

// Two meetings clash when they share a weekday, their date ranges overlap and their times overlap (the calendar's rule).
const meetingsClash = (a, b) => a.start !== null && b.start !== null && a.start < b.end && b.start < a.end
  && a.startDate <= b.endDate && b.startDate <= a.endDate && a.days.some((d) => b.days.includes(d));
// The picked classes a section would clash with if it were its course's pick for that type (so the course's current
// pick of the same type is left out). Names like "MATH 211"; the same course's other parts read "CSC 230 lecture".
export function clashesFor(byCode, plan, code, s) {
  return pickedSections(byCode, plan)
    .filter((p) => p.s.crn !== s.crn && !(p.code === code && p.s.scheduleType === s.scheduleType))
    .filter((p) => s.meetings.some((a) => p.s.meetings.some((b) => meetingsClash(a, b))))
    .map((p) => (p.code === code ? `${displayCode(p.code)} ${p.s.scheduleType.toLowerCase()}` : displayCode(p.code)));
}

export function termWeeks(byCode, plan) {
  const ms = pickedSections(byCode, plan).flatMap(({ s }) => s.meetings);
  if (!ms.length) return [];
  const start = ms.map((m) => m.startDate).sort()[0], end = ms.map((m) => m.endDate).sort().at(-1), out = [];
  for (let m = mondayOf(parse(start)); iso(m) <= end; m = addDays(m, 7)) out.push(m);
  return out;
}

// One week of blocks: real meeting dates decide which days a section meets; overlaps between
// different sections are clashes; overlapping runs share the column side by side.
// Where an overlapping class sits in its day column, as fractions of the width (Google Calendar's rule). Classes that
// start within 30 minutes of each other share the width side by side; a class starting later than that is indented
// 40% and drawn on top of the earlier one, so a staggered clash visibly lands partway through. `covered` marks a class
// that something later sits on, so it switches to compact text that fits its visible strip. Non-overlapping classes
// get the full width.
const NEAR = 30, INDENT = 0.4;
export function placeCluster(cluster) {
  const groups = [];
  for (const e of cluster) { const g = groups.at(-1); if (g && e.start - g[0].start < NEAR) g.push(e); else groups.push([e]); }
  groups.forEach((g, k) => {
    const left = Math.min(k * INDENT, 0.6), width = 1 - left;
    g.forEach((e, i) => Object.assign(e, { left: left + (i * width) / g.length, width: width / g.length, z: k + 1,
      covered: groups.slice(k + 1).some((later) => later.some((x) => x.start < e.end)) }));
  });
}

export function weekEvents(byCode, plan, monday) {
  const picked = pickedSections(byCode, plan);
  return [0, 1, 2, 3, 4].map((i) => {
    const date = addDays(monday, i), day = iso(date), items = [];
    for (const { code, tint, s } of picked) s.meetings.forEach((m, mi) => {
      if (m.start !== null && m.days.includes(date.getUTCDay()) && m.startDate <= day && day <= m.endDate)
        items.push({ key: `${s.crn}-${mi}`, crn: s.crn, course: displayCode(code), section: s.section, tint, start: m.start, end: m.end, clash: false });
    });
    for (const a of items) for (const b of items) if (a.crn !== b.crn && a.start < b.end && b.start < a.end) a.clash = true;
    items.sort((a, b) => a.start - b.start || b.end - a.end);
    let cluster = [], clusterEnd = -1;
    const flush = () => { const ends = []; for (const it of cluster) { let c = ends.findIndex((e) => e <= it.start); if (c === -1) { c = ends.length; ends.push(0); } ends[c] = it.end; it.col = c; } for (const it of cluster) it.cols = ends.length; placeCluster(cluster); };
    for (const it of items) { if (it.start >= clusterEnd && cluster.length) { flush(); cluster = []; } cluster.push(it); clusterEnd = Math.max(clusterEnd, it.end); }
    if (cluster.length) flush();
    return items;
  });
}

// ───────────────────────── Calendar ─────────────────────────
const HOUR = 64, GRID_START = 8 * 60;
const HOURS = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FIVE = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" };
const y = (min) => ((min - GRID_START) / 60) * HOUR;

// One event, two widths. Side by side, the section wraps to lead line 2 before the start time,
// so truncation cuts the time and never the section. Every run of text is its own element so
// the Paper clipper keeps them as separate text nodes (it flattens inline spans into one).
// Shape (Apple Calendar's, matching the phone): a tint card with 4px corners and no outline, text at the top-left,
// 1px between back-to-back classes. Clashing classes look like any other, sharing the column side by side in their
// own colours (as Apple and Google Calendar do); the clash is flagged by the red dot on Weeks and the tray on tap.
export function Event({ ev }) {
  const [fill] = tint(ev.tint);
  // Compact text (course over "section start") when the block is narrow or partly covered, so nothing is cut mid-word.
  const compact = ev.width < 0.7 || ev.covered, gap = { display: "flex", gap: v("spacing-1_5"), whiteSpace: "nowrap", overflow: "hidden" };
  return html`<div style=${{ position: "absolute", top: y(ev.start) + 1, height: y(ev.end) - y(ev.start) - 2, minHeight: 24, paddingLeft: 1, paddingRight: v("spacing-0_5"),
      left: `calc((100% - 8px) * ${ev.left})`, width: `calc((100% - 8px) * ${ev.width})`, zIndex: ev.z }}>
    <div style=${{ position: "relative", height: "100%", backgroundColor: fill, borderRadius: v("radius-key"), boxShadow: ev.z > 1 ? `0 0 0 2px ${v("color-surface")}` : "none",
        padding: `${v("spacing-1")} ${v("spacing-1_5")}`, overflow: "clip", fontSize: v("text-sm"), lineHeight: v("leading-event") }}>
      <div style=${{ ...gap, fontWeight: v("font-weight-medium") }}><span>${ev.course}</span>${!compact && html`<span style=${{ color: v("color-on-tint") }}>${ev.section}</span>`}</div>
      ${compact
        ? html`<div style=${{ ...gap, ...TNUM }}><span style=${{ fontWeight: v("font-weight-medium") }}>${ev.section}</span><span style=${{ color: v("color-on-tint") }}>${fmt(ev.start)}</span></div>`
        : html`<div style=${{ color: v("color-on-tint"), whiteSpace: "nowrap", ...TNUM }}>${timeRange(ev.start, ev.end)}</div>`}
    </div>
  </div>`;
}

// Header and body share one width so day labels sit over their columns (real build: scrollbar-gutter: stable).
// The red dot on Weeks means a clash somewhere in the term, not just this week.
export function Calendar({ byCode, plan, week = "2026-10-19", width = 1033, height = 626 }) {
  const monday = parse(week);
  const days = useMemo(() => weekEvents(byCode, plan, monday), [byCode, plan, week]);
  const anyClash = useMemo(() => termWeeks(byCode, plan).some((m) => weekEvents(byCode, plan, m).some((d) => d.some((e) => e.clash))), [byCode, plan]);
  return html`<div style=${{ ...PANEL, width, height, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "clip", ...TEXT }}>
    <div style=${{ display: "flex", alignItems: "center", gap: v("spacing-2"), padding: v("spacing-2") }}>
      <div style=${{ display: "flex", alignItems: "center", gap: v("spacing-1"), flex: 1 }}>
        <button style=${SECONDARY}>Today</button>
        <div style=${{ display: "flex" }}>
          <button aria-label="Previous week" style=${GHOST_ICON}><${Svg}><path d="m15 18-6-6 6-6" /></${Svg}></button>
          <button aria-label="Next week" style=${GHOST_ICON}><${Svg}><path d="m9 18 6-6-6-6" /></${Svg}></button>
        </div>
        <span style=${{ marginLeft: v("spacing-2"), fontSize: v("text-md"), lineHeight: "18px", fontWeight: v("font-weight-semibold") }}>${longRange(monday)}</span>
      </div>
      <button aria-label=${anyClash ? "Weeks — schedule has clashes" : "Weeks"} style=${{ ...PRIMARY, position: "relative" }}>
        <${GridIcon} /><span>Weeks</span>
        ${anyClash && html`<span style=${{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: 999, backgroundColor: v("color-clash-solid"), boxShadow: `0 0 0 2px ${v("color-surface")}` }} />`}
      </button>
    </div>
    <div style=${{ borderTop: LINE, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style=${{ display: "flex", borderBottom: LINE }}>
        <div style=${{ width: 73, flexShrink: 0, borderRight: LINE }} />
        <div style=${{ flex: 1, ...FIVE }}>
          ${DAYS.map((d, i) => html`<div key=${d} style=${{ padding: `${v("spacing-1_5")} ${v("spacing-2")}`, textAlign: "center", fontWeight: v("font-weight-medium"), borderRight: i < 4 ? LINE : 0 }}>${d}</div>`)}
        </div>
      </div>
      <div style=${{ flex: 1, overflow: "clip" }}>
        <div style=${{ display: "flex" }}>
          <div style=${{ width: 73, flexShrink: 0, borderRight: LINE }}>
            <div style=${{ height: HOUR }} />
            ${HOURS.map((h) => html`<div key=${h} style=${{ height: HOUR, position: "relative" }}><span style=${{ position: "absolute", right: 10, top: -8, color: v("color-muted") }}>${h}</span></div>`)}
          </div>
          <div style=${{ flex: 1, ...FIVE }}>
            ${days.map((events, day) => html`<div key=${day} style=${{ position: "relative", height: HOUR * 15, borderRight: day < 4 ? LINE : 0,
                background: `repeating-linear-gradient(transparent, transparent ${HOUR - 1}px, ${v("color-line-subtle")} ${HOUR - 1}px, ${v("color-line-subtle")} ${HOUR}px)` }}>
              ${events.map((ev) => html`<${Event} key=${ev.key} ev=${ev} />`)}
            </div>`)}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ───────────────────────── Selected courses ─────────────────────────
const WEEK = [1, 2, 3, 4, 5];
const DAYNAME = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" };
const LETTER = { 1: "M", 2: "T", 3: "W", 4: "R", 5: "F", 6: "S", 0: "U" };
// Every schedule type in both term files; anything new shows its raw name rather than guessing a plural.
const PLURAL = { Lecture: "Lectures", "Lecture Topic": "Lecture topics", Lab: "Labs", "Gradable Lab": "Gradable labs", Tutorial: "Tutorials", Practicum: "Practicums" };
const mondayFirst = (d) => (d + 6) % 7;
const byNumber = (a, b) => a.section.localeCompare(b.section, "en", { numeric: true });
const typesOf = (ss) => [...new Set(ss.map((s) => s.scheduleType))];
const timed = (s) => s.meetings.filter((m) => m.start !== null).sort((a, b) => Math.min(...a.days.map(mondayFirst)) - Math.min(...b.days.map(mondayFirst)));
const ratio = ({ enrolled, capacity }) => (capacity ? Math.min(1, enrolled / capacity) : 0);

// Days as letters in place: each weekday keeps a fixed 12px slot, so the pattern reads at a glance and columns
// align down a list, while the letter says exactly which day it is. Meeting days are semibold ink, the rest faint.
// Weekend slots (S, U) appear after a small gap only on rows that need them, so weekday slots never move
// (that row's time sits a little further right — ~3 sections a term meet on weekends).
const SLOT = 12, SLOTS = SLOT * 5, WEEKEND = [6, 0];
function Days({ days }) {
  const on = new Set(days), weekend = WEEKEND.some((d) => on.has(d));
  const slot = (d) => html`<span key=${d} style=${{ width: SLOT, display: "flex", justifyContent: "center", color: on.has(d) ? "currentColor" : v("color-faint"),
    fontWeight: on.has(d) ? v("font-weight-semibold") : v("font-weight-regular") }}>${LETTER[d]}</span>`;
  return html`<span role="img" aria-label=${`Meets ${days.map((d) => DAYNAME[d]).join(", ")}`} style=${{ display: "flex", flexShrink: 0 }}>
    ${WEEK.map(slot)}${weekend && html`<span style=${{ display: "flex", marginLeft: v("spacing-1") }}>${WEEKEND.map(slot)}</span>`}
  </span>`;
}

// Days · 12px · start right-aligned in 60px so dashes line up · end. Both ends carry AM/PM,
// so every row has the same shape. Alignment is flexbox, not text-align: the Paper clipper drops text-align in fixed boxes.
// `compact` (section boxes): AM/PM on the start only when the class crosses noon, and the end is grey, so the eye
// lands on day + start. The time always starts 12px after the letters, so days and time read as one phrase with one gap.
function Meeting({ m, compact = false }) {
  const days = [...m.days].sort((a, b) => mondayFirst(a) - mondayFirst(b)), cross = per(m.start) !== per(m.end);
  return html`<div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), whiteSpace: "nowrap", ...TNUM }}>
    <${Days} days=${days} />
    <span style=${{ display: "flex", alignItems: "center" }}>
      <span style=${{ display: "flex" }}>${fmt(m.start)}${!compact || cross ? ` ${per(m.start)}` : ""}</span>
      <span style=${{ paddingInline: v("spacing-1"), color: v("color-faint") }}>–</span>
      <span style=${{ color: compact ? v("color-muted") : undefined }}>${fmt(m.end)} ${per(m.end)}</span></span>
  </div>`;
}

const Bar = ({ r }) => html`<div style=${{ height: 4, borderRadius: 999, backgroundColor: v("color-line"), overflow: "hidden" }}>
  <div style=${{ height: "100%", borderRadius: 999, width: `${r * 100}%`, backgroundColor: "currentColor" }} /></div>`;

// Count with the capacity faint, so a row reads "29" with "/30" as context.
const Count = ({ c }) => html`<span style=${{ display: "flex", justifyContent: "flex-end", ...TNUM }}><span>${c.enrolled}</span><span style=${{ color: v("color-faint") }}>/${c.capacity}</span></span>`;

// The box is the control (a radio underneath). A full section is muted as a whole but stays pickable for its waitlist.
// Always two lines, so every box is the same height: section │ (waitlist) seats count, then meeting │ seats bar.
// A waitlist shows only when people are on it, grey and left of the count. 12px padding, 6px between lines, 16px between sides.
// A clash shows on line 1 after the section code, never on the calendar: red on the pick that clashes ("Clashes with
// MATH 211"), grey on alternatives that would clash if picked, so a free option is easy to spot.
export function SectionBox({ s, picked, onPick, clashes = [] }) {
  const full = s.seats.available <= 0, wl = s.waitlist, ms = timed(s);
  return html`<button type="button" role="radio" aria-checked=${picked} onClick=${onPick}
    style=${{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: v("spacing-4"), rowGap: v("spacing-1_5"), alignItems: "center",
      width: "100%", padding: v("spacing-3"), borderRadius: v("radius-control"),
      border: `1px solid ${picked ? v("color-ink") : v("color-line")}`, backgroundColor: picked ? v("color-surface-subtle") : v("color-surface"),
      color: full ? v("color-muted") : v("color-ink"), ...TEXT, textAlign: "left", cursor: "pointer" }}>
    <span style=${{ display: "flex", gap: v("spacing-2"), minWidth: 0, whiteSpace: "nowrap" }}><span style=${{ fontWeight: v("font-weight-semibold") }}>${s.section}</span>
      ${clashes.length > 0 && html`<span style=${{ overflow: "hidden", textOverflow: "ellipsis", color: picked ? v("color-clash-solid") : v("color-muted"), fontWeight: picked ? v("font-weight-medium") : v("font-weight-regular") }}>
        Clashes with ${clashes.length === 1 ? clashes[0] : `${clashes.length} classes`}</span>`}</span>
    <span style=${{ display: "flex", justifyContent: "flex-end", gap: v("spacing-2"), whiteSpace: "nowrap", ...TNUM }}>
      ${wl.enrolled > 0 && html`<span style=${{ color: v("color-muted") }}>+${wl.enrolled} wait</span>`}<${Count} c=${s.seats} /></span>
    <div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1"), minWidth: 0 }}>
      ${ms.length ? ms.map((m, i) => html`<${Meeting} key=${i} m=${m} compact=${true} />`) : html`<span style=${{ color: v("color-muted") }}>No set time</span>`}
    </div>
    <div style=${{ width: 56, justifySelf: "end" }}
      title=${`${s.seats.enrolled} of ${s.seats.capacity} seats taken` + (wl.capacity ? `, ${wl.enrolled} of ${wl.capacity} on the waitlist` : "")}><${Bar} r=${ratio(s.seats)} /></div>
  </button>`;
}

// Empty: one line saying what the panel is for, and the way in. (New — not yet reviewed.)
function EmptyCourses({ touch = false }) {
  return html`<div style=${{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: v("spacing-3"), padding: v("spacing-4") }}>
    <span style=${{ color: v("color-muted") }}>Courses you add show up here</span>
    <button style=${SECONDARY}><${SearchIcon} /><span>Search courses</span>${!touch && html`<${Kbd}>/</${Kbd}>`}</button>
  </div>`;
}

// `plan` seeds the picks; picking afterwards is local to this panel (the flow page passes each state in).
export function SelectedCourses({ byCode, plan: seed, height = 626, width = 380, flat = false, touch = false, header = true, onChange }) {
  const [plan, setPlan] = useState(seed);
  useEffect(() => setPlan(seed), [seed]);
  useEffect(() => { if (onChange && plan !== seed) onChange(plan); }, [plan]); // lets a parent keep one schedule
  const [closed, setClosed] = useState(new Set());
  const pick = (code, s) => setPlan((p) => {
    const same = byCode.get(code).sections.filter((x) => x.scheduleType === s.scheduleType).map((x) => x.crn);
    return { ...p, [code]: [...p[code].filter((x) => !same.includes(x)), s.crn] };
  });
  const toggle = (code) => setClosed((s) => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n; });
  const shown = Object.keys(plan);
  return html`<div style=${{ ...(flat ? { backgroundColor: v("color-surface") } : PANEL), width, height, flexShrink: 0, display: "flex", flexDirection: "column", ...TEXT }}>
    ${header && html`<div style=${{ height: v("spacing-header"), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: LINE, paddingLeft: 25, paddingRight: 13 }}>
      <span style=${{ color: v("color-muted") }}>Selected courses</span>
      ${shown.length > 0 && html`<button style=${{ ...SECONDARY, marginRight: -1 }} onClick=${() => setPlan({})}>Clear</button>`}
    </div>`}
    ${!shown.length ? html`<${EmptyCourses} touch=${touch} />` : html`<div style=${{ flex: 1, minHeight: 0, overflowY: "auto", paddingInline: v("spacing-3") }}>
      ${shown.map((code, i) => {
        const c = byCode.get(code), open = !closed.has(code);
        return html`<div key=${code} style=${{ borderBottom: i < shown.length - 1 ? LINE : 0 }}>
          <div style=${{ display: "flex", alignItems: "flex-start", gap: v("spacing-1"), paddingLeft: 13, paddingRight: v("spacing-1_5") }}>
            <button aria-expanded=${open} onClick=${() => toggle(code)} style=${{ flex: 1, display: "flex", alignItems: "flex-start", gap: v("spacing-3"), padding: "14px 0", border: 0, backgroundColor: "transparent", textAlign: "left", cursor: "pointer" }}>
              <span style=${{ flex: 1, minWidth: 0 }}>
                <span style=${{ display: "block", fontSize: v("text-md"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>${displayCode(code)}</span>
                <span style=${{ display: "block", color: v("color-muted") }}>${c.title}</span>
              </span>
              <${Svg} style=${{ marginTop: 2, color: v("color-muted"), rotate: open ? "180deg" : "0deg", transition: "rotate 200ms" }}><path d="m6 9 6 6 6-6" /></${Svg}>
            </button>
            <button aria-label=${`Remove ${displayCode(code)}`} onClick=${() => setPlan(({ [code]: _, ...rest }) => rest)} style=${{ ...GHOST_ICON, marginTop: v("spacing-3"), color: v("color-muted") }}>
              <${Svg}><path d="M18 6 6 18M6 6l12 12" /></${Svg}>
            </button>
          </div>
          ${open && html`<div style=${{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: v("spacing-4") }}>
            ${typesOf(c.sections).map((type) => {
              const rows = c.sections.filter((s) => s.scheduleType === type).sort(byNumber);
              return html`<div key=${type}>
                <div style=${{ paddingInline: 13, marginBottom: v("spacing-1_5"), color: v("color-muted") }}>${PLURAL[type] ?? type}</div>
                <div role="radiogroup" aria-label=${`${displayCode(code)} ${PLURAL[type] ?? type}`} style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
                  ${rows.map((s) => html`<${SectionBox} key=${s.crn} s=${s} picked=${plan[code].includes(s.crn)} onPick=${() => pick(code, s)} clashes=${clashesFor(byCode, plan, code, s)} />`)}
                </div>
              </div>`;
            })}
          </div>`}
        </div>`;
      })}
    </div>`}
  </div>`;
}

// ───────────────────────── Keys ─────────────────────────
// On white surfaces (search, empty state).
export const Kbd = ({ children }) => html`<kbd style=${{ font: "inherit", ...TEXT, fontWeight: v("font-weight-medium"), minWidth: 20, textAlign: "center", padding: "1px 5px",
  borderRadius: v("radius-key"), backgroundColor: v("color-surface"), boxShadow: `0 0 0 1px ${v("color-line")}`, color: v("color-muted") }}>${children}</kbd>`;
// On the dark Weeks scrim.
const DarkKey = ({ children }) => html`<kbd style=${{ font: "inherit", ...TEXT, minWidth: 20, textAlign: "center", padding: "1px 5px", borderRadius: v("radius-key"), backgroundColor: "rgb(255 255 255 / 0.15)", color: "#FFFFFF" }}>${children}</kbd>`;
const Hint = ({ keys, label, Key = Kbd }) => html`<span style=${{ display: "flex", alignItems: "center", gap: v("spacing-1") }}>${keys.map((k) => html`<${Key} key=${k}>${k}</${Key}>`)}<span style=${{ marginLeft: v("spacing-0_5") }}>${label}</span></span>`;

// ───────────────────────── Weeks overlay ─────────────────────────
const THUMB_START = 8 * 60, THUMB_END = 18 * 60, THUMB_H = 112;
export function Thumbnail({ days }) {
  const ty = (min) => ((min - THUMB_START) / (THUMB_END - THUMB_START)) * THUMB_H;
  return html`<div style=${{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", height: THUMB_H }}>
    ${days.map((events, i) => html`<div key=${i} style=${{ position: "relative", borderRight: i < 4 ? "1px solid #F0F0F0" : 0 }}>
      ${events.map((ev) => {
        // At thumbnail size a pale tint can't say "clash", so clash blocks are solid red — the one loud mark on the card.
        const [fill, ring] = ev.clash ? [v("color-clash-solid"), v("color-clash-solid")] : tint(ev.tint);
        return html`<div key=${ev.key} style=${{ position: "absolute", top: ty(ev.start), height: Math.max(ty(ev.end) - ty(ev.start), 3),
          left: `calc((100% - 4px) * ${ev.cols > 1 ? ev.col / ev.cols : 0} + 2px)`, width: `calc((100% - 4px) / ${ev.cols} - ${ev.cols > 1 ? 1 : 0}px)`,
          backgroundColor: fill, boxShadow: `inset 0 0 0 1px ${ring}`, borderRadius: 2 }} />`;
      })}
    </div>`)}
  </div>`;
}

// Scrim: 60% ink + blur, so labels pass contrast over the white UI behind. Focus: white outline clear of the card, never red.
// `contained` keeps it inside its parent (components and flow pages) instead of over the viewport.
export function WeeksOverlay({ byCode, plan, viewing = "2026-10-19", contained = false }) {
  const weeks = useMemo(() => termWeeks(byCode, plan).map((m) => ({ monday: m, days: weekEvents(byCode, plan, m) })), [byCode, plan]);
  const today = weeks.findIndex((w) => iso(w.monday) === iso(mondayOf(parse(TODAY))));
  const [focus, setFocus] = useState(Math.max(0, weeks.findIndex((w) => iso(w.monday) === viewing)));
  const gridRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      const cols = gridRef.current ? getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length : 4;
      const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (move) { e.preventDefault(); setFocus((f) => Math.min(weeks.length - 1, Math.max(0, f + move))); }
    };
    addEventListener("keydown", onKey); return () => removeEventListener("keydown", onKey);
  }, [weeks.length]);
  const soft = "rgb(255 255 255 / 0.85)";
  return html`<div style=${{ position: contained ? "absolute" : "fixed", inset: 0, overflowY: "auto", backgroundColor: "rgb(10 10 10 / 0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 16px", ...TEXT }}>
    <div ref=${gridRef} style=${{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "28px 20px", width: "100%", maxWidth: 980 }}>
      ${weeks.map(({ monday, days }, i) => {
        const clash = days.some((d) => d.some((e) => e.clash)), focused = i === focus;
        return html`<button key=${i} onMouseEnter=${() => setFocus(i)} style=${{ backgroundColor: "transparent", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>
          <div style=${{ backgroundColor: v("color-surface"), borderRadius: v("radius-control"), padding: v("spacing-2"),
              boxShadow: `${clash ? `0 0 0 2px ${v("color-clash-solid")}` : "0 0 0 1px rgb(0 0 0 / 0.08)"}, 0 8px 24px -8px rgb(0 0 0 / 0.35)`,
              outline: `2px solid ${focused ? "#FFFFFF" : "transparent"}`, outlineOffset: clash ? 5 : 3, transition: "outline-color 160ms" }}>
            <${Thumbnail} days=${days} />
          </div>
          <div style=${{ display: "flex", alignItems: "baseline", gap: v("spacing-1_5"), marginTop: v("spacing-2"), color: "#FFFFFF" }}>
            <span style=${{ fontWeight: v("font-weight-semibold") }}>Week ${i + 1}</span>
            <span style=${{ color: soft, ...TNUM }}>${shortRange(monday)}</span>
            ${i === today && html`<span style=${{ marginLeft: "auto", color: soft }}>This week</span>`}
          </div>
        </button>`;
      })}
    </div>
    <div style=${{ marginTop: 32, color: soft, display: "flex", alignItems: "center", gap: v("spacing-4") }}>
      <${Hint} Key=${DarkKey} keys=${["←", "→", "↑", "↓"]} label="move" /><${Hint} Key=${DarkKey} keys=${["↵"]} label="open" /><${Hint} Key=${DarkKey} keys=${["esc"]} label="close" />
    </div>
  </div>`;
}

// ───────────────────────── Search ─────────────────────────
// Empty state: review fixes M1–M4 (16px input, readable placeholder, "Try" on the text line, keycaps, "Selected courses").
// With a query: a results list on the left, each row the code over the title (easier to digest than one line).
// Row boxes hang at 16px like the chips; their text sits on the 26px line with "Try".
// Shared by search results and the course page's related list. Courses not offered this term are muted and say so.
function ResultRow({ course, added, active, offered = true }) {
  return html`<div style=${{ display: "flex", alignItems: "flex-start", gap: v("spacing-3"), paddingInline: 10, paddingBlock: v("spacing-2"),
      borderRadius: v("radius-control"), backgroundColor: active ? v("color-fill") : "transparent", color: offered ? v("color-ink") : v("color-muted"), ...TEXT }}>
    <span style=${{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <span style=${{ fontWeight: v("font-weight-semibold") }}>${displayCode(course.code)}</span>
      <span style=${{ color: v("color-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>${course.title}</span>
    </span>
    ${!offered ? html`<span style=${{ flexShrink: 0, color: v("color-faint") }}>Not in Fall 2026</span>`
      : added && html`<span style=${{ flexShrink: 0, color: v("color-muted") }}>Added</span>`}
  </div>`;
}

// A list pane: optional group labels on the 26px text line, rows hanging at 16px.
export function ListPane({ groups, active }) {
  return html`<div style=${{ width: 360, flexShrink: 0, overflowY: "auto", padding: `${v("spacing-2")} ${v("spacing-4")}`, display: "flex", flexDirection: "column", gap: v("spacing-4") }}>
    ${groups.map((g) => html`<div key=${g.label ?? "all"} style=${{ display: "flex", flexDirection: "column", gap: v("spacing-0_5") }}>
      ${g.label && html`<span style=${{ padding: "8px 10px 4px", color: v("color-muted"), ...TEXT }}>${g.label}</span>`}
      ${g.items.map((it) => html`<${ResultRow} key=${it.code} course=${it} added=${it.added} offered=${it.offered} active=${it.code === active} />`)}
    </div>`)}
  </div>`;
}

// ── Requirement tree ──
// Draws the catalog's requirement tree exactly as stored (src/catalog/model.ts Requirement). The only rewrite is
// flattening "All of" directly inside "All of", which means the same thing. Operators are muted; courses and
// text — what a student actually checks — are ink.
const COUNT = { 1: "One", 2: "Two", 3: "Three", 4: "Four" };
const countOf = (n) => `${COUNT[n] ?? n} of`;
const TIMING = { completed: null, concurrent: "taken at the same time", either: "completed or taken at the same time" };
export function toNode(r) {
  if (r.type === "text") return { text: r.text };
  if (r.type === "all") return { label: "All of", children: r.items.flatMap((i) => (i.type === "all" ? i.items : [i])).map(toNode) };
  if (r.type === "some") return { label: countOf(r.count), children: r.items.map(toNode) };
  // courses
  const qual = [TIMING[r.timing], r.minGrade && `minimum grade ${r.minGrade}`, r.minGpa != null && `minimum GPA ${r.minGpa}`].filter(Boolean).join(", ");
  const leaves = r.courses.map((c) => ({ code: displayCode(c) }));
  if (leaves.length === 1 && (r.need === "all" || r.need === 1)) return { ...leaves[0], qual };
  const label = r.need === "all" ? "All of" : typeof r.need === "number" ? countOf(r.need) : `${r.need.units} units from`;
  return { label, qual, children: leaves };
}

// File-tree drawing: children indent 16px; a faint trunk runs down from the parent and an elbow joins each child.
// The trunk stops at the last child's elbow, like └.
export function TreeNode({ node, onPick }) {
  const kids = node.children ?? [];
  return html`<div>
    <div style=${{ display: "flex", gap: v("spacing-1_5"), lineHeight: v("leading-md"), flexWrap: "wrap" }}>
      ${node.label && html`<span style=${{ color: v("color-muted") }}>${node.label}</span>`}
      ${node.code && (onPick ? html`<${CourseLink} code=${node.code.replace(" ", "")} onPick=${onPick} />` : html`<span style=${{ fontWeight: v("font-weight-medium"), ...TNUM }}>${node.code}</span>`)}
      ${node.text && html`<span>${node.text}</span>`}
      ${node.qual && html`<span style=${{ color: v("color-muted") }}>${node.qual}</span>`}
    </div>
    ${kids.length > 0 && html`<div style=${{ display: "flex", flexDirection: "column" }}>
      ${kids.map((k, i) => html`<div key=${i} style=${{ position: "relative", paddingLeft: v("spacing-4") }}>
        <span style=${{ position: "absolute", left: 5, top: 0, width: 1, height: i === kids.length - 1 ? 10 : "100%", backgroundColor: v("color-line") }} />
        <span style=${{ position: "absolute", left: 5, top: 10, width: 7, height: 1, backgroundColor: v("color-line") }} />
        <${TreeNode} node=${k} onPick=${onPick} />
      </div>`)}
    </div>`}
  </div>`;
}

// ── Course detail ──
// Ordered by what decides "do I add this?": identity + action, units/hours, requirements (then what's recommended
// and the notes — mostly credit exclusions), when it meets, then the description. Blocks only appear when present.
const REQS = [["prerequisites", "Prerequisites"], ["preOrCorequisites", "Prerequisites or corequisites"], ["corequisites", "Corequisites"]];
const Block = ({ label, children }) => html`<section style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
  <span style=${{ color: v("color-muted") }}>${label}</span>${children}</section>`;

// Sections grouped by type, then by meeting pattern: one entry per distinct time (a section meeting twice a week stays
// one entry). At most SUMMARY_ROWS per type; the rest is "+ n more", and the full page lists every section.
const SUMMARY_ROWS = 4;
export function TermSummary({ course }) {
  return typesOf(course.sections).map((type) => {
    const groups = new Map();
    for (const s of course.sections.filter((x) => x.scheduleType === type)) {
      const ms = timed(s), key = ms.map((m) => `${m.days.join("")}-${m.start}-${m.end}`).join("|") || "none";
      groups.set(key, ms);
    }
    const all = [...groups.values()], more = all.length - SUMMARY_ROWS;
    return html`<${Block} key=${type} label=${PLURAL[type] ?? type}>
      ${all.slice(0, SUMMARY_ROWS).map((ms, i) => html`<div key=${i} style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1") }}>
        ${ms.length ? ms.map((m, j) => html`<${Meeting} key=${j} m=${m} />`) : html`<span style=${{ color: v("color-muted") }}>No set time</span>`}
      </div>`)}
      ${more > 0 && html`<span style=${{ color: v("color-muted") }}>+ ${more} more ${more === 1 ? "time" : "times"}</span>`}
    </${Block}>`;
  });
}

// Static placeholder bars for what's still loading (the real build can pulse them).
const Skeleton = ({ widths }) => html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2"), paddingBlock: v("spacing-0_5") }}>
  ${widths.map((w, i) => html`<span key=${i} style=${{ display: "block", width: w, height: 12, borderRadius: v("radius-key"), backgroundColor: v("color-fill") }} />`)}</div>`;

// `info` is the course file: an object when loaded, null while loading, "error" if it failed. The header, the action
// and "This term" come from the term file, so they show immediately in every state — only the course-file parts wait.
// `course` is the term-file entry, or null when the course isn't offered this term (then code/title come from `info`).
// In the modal, `pageLink` adds "⤢ Full page" (also ⌘↵) beside the action: borderless, because it navigates —
// white and black buttons are reserved for actions. On the page itself it's absent.
// The "open full page" mark: two arrows pointing outward (lucide maximize-2), as Notion/Linear use for "open preview as page".
export const ExpandIcon = ({ size = 16 }) => html`<${Svg} size=${size}><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" /></${Svg}>`;

export function CourseDetail({ course, info, added, pageLink = false, onOpenPage, embedded = false, slot = null, actions = true }) {
  const ready = info && info !== "error";
  const code = course?.code ?? info.code, title = course?.title ?? info.title;
  // Reading blocks are capped at 640px so prose stays a comfortable line length when the page gives the pane more room;
  // `slot` (the page's pathway map) sits between the facts and the reading blocks at full width.
  const outer = embedded ? {} : { height: "100%", overflowY: "auto", padding: "22px 24px" };
  return html`<div style=${outer}><div style=${{ display: "flex", flexDirection: "column", gap: 24, ...TEXT, ...(slot ? {} : { maxWidth: 640 }) }}>
    <div style=${{ display: "flex", alignItems: "flex-start", gap: v("spacing-3") }}>
      <span style=${{ flex: 1, minWidth: 0 }}>
        <span class="vt-head" style=${{ display: "block", width: "fit-content" }}>
          <span style=${{ display: "block", fontSize: v("text-md"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>${displayCode(code)}</span>
          <span style=${{ display: "block", color: v("color-muted") }}>${title}</span>
        </span>
      </span>
      <span style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), flexShrink: 0 }}>
        ${pageLink && html`<button title="Open full page (⌘↵)" onClick=${onOpenPage} style=${{ ...BUTTON, paddingInline: v("spacing-2"), color: v("color-muted") }}><${ExpandIcon} size=${14} /><span>Full page</span></button>`}
        ${actions && course && html`<span class="vt-action">${added ? html`<button style=${SECONDARY}>Remove</button>` : html`<button style=${PRIMARY}>Add to schedule</button>`}</span>`}
      </span>
    </div>
    ${ready && html`<div style=${{ display: "flex", gap: v("spacing-4"), marginTop: -8 }}>
      ${info.credits && html`<span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Units</span><span style=${TNUM}>${info.credits}</span></span>`}
      ${info.hours && html`<span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Hours</span><span style=${TNUM}>${info.hours.trim()}</span></span>`}
    </div>`}
    ${info === null && html`<div style=${{ marginTop: -8 }}><${Skeleton} widths=${[140]} /></div>`}
    ${info === null && html`<${Skeleton} widths=${[96, 220, 180]} />`}
    ${info === "error" && html`<div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), marginTop: -8 }}>
      <span style=${{ color: v("color-muted") }}>Couldn't load prerequisites and course details.</span>
      <button style=${SECONDARY}>Retry</button>
    </div>`}
    ${slot}
    <div style=${{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>
    ${ready && REQS.filter(([k]) => info[k]).map(([k, label]) => html`<${Block} key=${k} label=${label}><${TreeNode} node=${toNode(info[k])} /></${Block}>`)}
    ${ready && [["recommendations", "Recommended"], ["notes", "Notes"]].filter(([k]) => info[k]?.length).map(([k, label]) => html`<${Block} key=${k} label=${label}>
      ${info[k].map((t, i) => html`<p key=${i} style=${{ margin: 0, lineHeight: v("leading-md") }}>${t}</p>`)}
    </${Block}>`)}
    ${course ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-4") }}><${TermSummary} course=${course} /></div>`
      : html`<span style=${{ color: v("color-muted") }}>Not offered in Fall 2026</span>`}
    ${ready && info.description && html`<p style=${{ margin: 0, lineHeight: v("leading-md") }}>${info.description}</p>`}
    ${info === null && html`<${Skeleton} widths=${["100%", "100%", "62%"]} />`}
    </div>
  </div></div>`;
}

// `bare` renders just the 900×620 modal (for clipping); otherwise it sits over the app on a light scrim.
// States: catalog loading · empty (Try) · results with the highlighted course's detail (loading / ready / failed) · no results.
export function SearchModal({ count = 0, query = "", results = [], added = [], active = 0, detail = null, loading = false, pageLink = true, onOpenPage, contained = false, bare = false }) {
  const chips = ["CSC 110", "psychology", "data structures", "hulquminum"];
  const modal = html`<div class="vt-panel" style=${{ width: 900, height: 620, display: "flex", flexDirection: "column", backgroundColor: v("color-surface"), borderRadius: v("radius-panel"), overflow: "clip",
        boxShadow: `${v("shadow-ring")}, 0 24px 64px -16px #00000059` }}>
      <div style=${{ height: 54, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, paddingLeft: v("spacing-4"), paddingRight: 14, borderBottom: LINE }}>
        <span style=${{ color: v("color-muted"), display: "flex" }}><${SearchIcon} size=${18} /></span>
        <span style=${{ flex: 1, paddingInline: v("spacing-0_5"), fontSize: v("text-lg"), lineHeight: v("leading-md"), color: query ? v("color-ink") : v("color-muted") }}>${query || "Course code, title or department"}</span>
        <${Kbd}>esc</${Kbd}>
      </div>
      <div style=${{ flex: 1, minHeight: 0, display: "flex" }}>
        ${loading
          ? html`<div style=${{ width: 360, flexShrink: 0, padding: "16px 26px", color: v("color-muted"), ...TEXT }}>Loading the Fall 2026 timetable…</div>`
          : query && !results.length
          ? html`<div style=${{ width: 360, flexShrink: 0, padding: "16px 26px", display: "flex", flexDirection: "column", gap: v("spacing-1"), ...TEXT }}>
              <span>No Fall 2026 courses match “${query}”</span>
              <span style=${{ color: v("color-muted") }}>Try a course code like CSC 110, or a word from the title.</span>
            </div>`
          : query
          ? html`<${ListPane} active=${results[active]?.code} groups=${[{ items: results.map((c) => ({ ...c, added: added.includes(c.code) })) }]} />`
          : html`<div style=${{ width: 360, flexShrink: 0, padding: `${v("spacing-1")} ${v("spacing-2")} ${v("spacing-2")}` }}>
              <div style=${{ padding: "12px 18px 4px", color: v("color-muted") }}>Try</div>
              <div style=${{ display: "flex", flexWrap: "wrap", gap: v("spacing-1_5"), padding: `${v("spacing-1")} ${v("spacing-2")}` }}>
                ${chips.map((c) => html`<button key=${c} style=${{ height: v("spacing-control"), paddingInline: 10, borderRadius: 999, border: 0, backgroundColor: v("color-fill"), cursor: "pointer", color: v("color-ink"), ...TEXT }}>${c}</button>`)}
              </div>
            </div>`}
        <div style=${{ flex: 1, minWidth: 0, borderLeft: LINE }}>
          ${query && results.length
            ? html`<${CourseDetail} course=${results[active]} info=${detail} added=${added.includes(results[active].code)} pageLink=${pageLink} onOpenPage=${onOpenPage} />`
            : !query && !loading && html`<div style=${{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: v("color-muted"), ...TEXT }}>Search the Fall 2026 timetable</div>`}
        </div>
      </div>
      <div style=${{ height: 38, flexShrink: 0, display: "flex", alignItems: "center", gap: v("spacing-4"), paddingInline: v("spacing-4"), borderTop: LINE, color: v("color-muted"), ...TEXT }}>
        <${Hint} keys=${["↑", "↓"]} label="browse" /><${Hint} keys=${["↵"]} label="add or remove" /><${Hint} keys=${["⌘", "↵"]} label="full page" />
        <span style=${{ flex: 1 }} />
        <span>${count} ${count === 1 ? "course" : "courses"} selected</span>
      </div>
    </div>`;
  return bare ? modal : html`<div style=${{ position: contained ? "absolute" : "fixed", inset: 0, backgroundColor: "rgb(10 10 10 / 0.25)", display: "flex", justifyContent: "center", paddingTop: 80 }}>${modal}</div>`;
}

// ───────────────────────── Course page ─────────────────────────
// /courses/CSC225 — "where does this fit, and when can I take it?". Modelled on UW Flow: a fixed sidebar with the same
// four sections on every course (Prerequisites, Corequisites, Overlaps, Leads to), greyed when empty, every course code
// a link (title on hover) so students hop course to course. The main column: header, facts, description, and Fall and
// Spring offerings side by side. Visual graphs were considered and dropped: no mainstream tool puts one on a course page.

let TITLES = {}; // code → title for hover text and list rows (set by the page from the precomputed graph file)
export const setTitles = (t) => { TITLES = t; };
export function CourseLink({ code, onPick }) {
  const known = code in TITLES;
  return html`<a href=${`/courses/${code}`} title=${known ? TITLES[code] : "Not in the course calendar"}
    onClick=${(e) => { e.preventDefault(); known && onPick(code); }}
    style=${{ color: known ? v("color-ink") : v("color-muted"), fontWeight: v("font-weight-medium"), textDecoration: "underline", textDecorationColor: v("color-line"), textUnderlineOffset: 3, cursor: known ? "pointer" : "default", ...TNUM }}>${displayCode(code)}</a>`;
}

// Catalog prose with course codes ("ANTH 240 recommended prior to…") → the same links; other text stays as written.
// Each piece is its own span so the Paper clipper keeps them as separate text nodes.
const CODE_IN_TEXT = /\b([A-Z]{2,5}) (\d{3}[A-Z]?)\b/g;
function Linkified({ text, onPick }) {
  const parts = []; let last = 0;
  for (const m of text.matchAll(CODE_IN_TEXT)) {
    if (!(m[1] + m[2] in TITLES)) continue;
    if (m.index > last) parts.push(html`<span key=${last}>${text.slice(last, m.index)}</span>`);
    parts.push(html`<${CourseLink} key=${m.index + "c"} code=${m[1] + m[2]} onPick=${onPick} />`);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(html`<span key=${last}>${text.slice(last)}</span>`);
  return parts;
}

// Credit-exclusion notes ("Credit will (only) be granted for (only) one of A, B (if taken in the same topic).") become
// Overlaps; any other note stays verbatim under Notes, so nothing is lost to a parse.
const EXCLUSION = /^Credit will (?:only )?be granted for (?:only )?one of (.+?)\.?$/;
export function splitNotes(code, notes) {
  const overlaps = [], rest = [];
  for (const n of notes) {
    const m = n.match(EXCLUSION);
    if (!m) { rest.push(n); continue; }
    for (const part of m[1].split(/,\s*/)) {
      const c = part.match(/([A-Z]{2,5}) ?(\d{3}[A-Z]?)/);
      if (c && c[1] + c[2] !== code) overlaps.push({ code: c[1] + c[2], qual: /same topic/.test(part) ? "same topic only" : null });
    }
  }
  return { overlaps, rest };
}

export const SideSection = ({ label, empty, loading, children }) => html`<section style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
  <span style=${{ color: v("color-muted") }}>${label}</span>
  ${loading ? html`<${Skeleton} widths=${[120, 180]} />` : children ?? html`<span style=${{ color: v("color-faint") }}>${empty}</span>`}
</section>`;

export const LinkRow = ({ code, tag, onPick }) => html`<div style=${{ display: "flex", alignItems: "baseline", gap: v("spacing-2"), minWidth: 0 }}>
  <${CourseLink} code=${code} onPick=${onPick} />
  <span style=${{ flex: 1, minWidth: 0, color: v("color-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>${TITLES[code] ?? ""}</span>
  ${tag && html`<span style=${{ flexShrink: 0, color: v("color-faint") }}>${tag}</span>`}
</div>`;

// The term is a global setting: the whole app (schedule, search, course pages) shows one term at a time.
export const TERMS = [["202609", "Fall 2026"], ["202701", "Spring 2027"]];
export function TermToggle({ term, onTerm }) {
  return html`<div role="radiogroup" aria-label="Term" style=${{ display: "flex", gap: v("spacing-0_5"), padding: v("spacing-0_5"), borderRadius: 10, backgroundColor: v("color-fill"), boxShadow: "inset 0 0 0 1px #0A0A0A0D" }}>
    ${TERMS.map(([t, label]) => html`<button key=${t} role="radio" aria-checked=${t === term} onClick=${() => onTerm(t)}
      style=${t === term ? { ...SECONDARY, height: 24 } : { ...BUTTON, height: 24, color: v("color-muted") }}>${label}</button>`)}
  </div>`;
}

// This term's sections, or — when it isn't offered this term — which term does offer it, one click away.
function Offered({ term, offerings, onTerm }) {
  const label = TERMS.find(([t]) => t === term)[1];
  const course = offerings[term], other = TERMS.find(([t]) => t !== term && offerings[t]);
  return html`<section style=${{ display: "flex", flexDirection: "column", gap: v("spacing-4"), maxWidth: 640 }}>
    <span style=${{ fontWeight: v("font-weight-semibold") }}>${label}</span>
    ${course ? html`<${TermSummary} course=${course} />`
      : html`<span style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), color: v("color-muted") }}>
          Not offered in ${label}.
          ${other && html`<button style=${SECONDARY} onClick=${() => onTerm(other[0])}>See ${other[1]}</button>`}
        </span>`}
  </section>`;
}

export function CoursePage({ terms, term, onTerm, graph, titles, start = "CSC225", preloaded = null, added = [], onBack }) {
  const byCode = terms[term];
  TITLES = titles;
  const [code, setCode] = useState(start);
  const [info, setInfo] = useState(preloaded);
  useEffect(() => {
    if (code === start && preloaded) return; // arrived from the modal with the file already loaded: nothing pops in mid-transition
    let live = true; setInfo(null); loadCourse(code).then((i) => live && setInfo(i), () => live && setInfo("error")); return () => { live = false; };
  }, [code]);
  const g = graph[code] ?? { b: [], l: [] };
  const ready = info && info !== "error";
  const { overlaps, rest } = splitNotes(code, ready ? info.notes : []);
  const coreq = ready && [info.corequisites && ["Corequisites", info.corequisites], info.preOrCorequisites && ["Prerequisites or corequisites", info.preOrCorequisites]].filter(Boolean);
  const required = g.l.filter(([, k]) => k === "required"), optional = g.l.filter(([, k]) => k !== "required");
  return html`<div style=${{ ...APP, flexShrink: 0, display: "flex", flexDirection: "column", gap: v("spacing-4"), padding: 24, backgroundColor: "#F4F4F4", ...TEXT }}>
    <div style=${{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick=${onBack} style=${{ ...BUTTON, paddingInline: v("spacing-2"), color: v("color-ink") }}><${Svg}><path d="m15 18-6-6 6-6" /></${Svg}><span>Schedule</span></button>
      <${TermToggle} term=${term} onTerm=${onTerm} />
      <button style=${SECONDARY}><span>Copy link</span></button>
    </div>
    <div class="vt-panel" style=${{ ...PANEL, flex: 1, minHeight: 0, display: "flex", overflow: "clip" }}>
      <main style=${{ flex: 1, minWidth: 0, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style=${{ display: "flex", alignItems: "flex-start", gap: v("spacing-3") }}>
          <span style=${{ flex: 1, minWidth: 0 }}>
            <span class="vt-head" style=${{ display: "block", width: "fit-content" }}>
              <span style=${{ display: "block", fontSize: v("text-md"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>${displayCode(code)}</span>
              <span style=${{ display: "block", color: v("color-muted") }}>${titles[code]}</span>
            </span>
          </span>
          ${byCode.has(code) && html`<span class="vt-action">${added.includes(code) ? html`<button style=${SECONDARY}>Remove</button>` : html`<button style=${PRIMARY}>Add to schedule</button>`}</span>`}
        </div>
        ${ready && html`<div style=${{ display: "flex", gap: v("spacing-4"), marginTop: -8 }}>
          ${info.credits && html`<span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Units</span><span style=${TNUM}>${info.credits}</span></span>`}
          ${info.hours && html`<span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Hours</span><span style=${TNUM}>${info.hours.trim()}</span></span>`}
        </div>`}
        ${info === null && html`<div style=${{ marginTop: -8, display: "flex", flexDirection: "column", gap: 24 }}><${Skeleton} widths=${[140]} /><${Skeleton} widths=${[640, 640, 400]} /></div>`}
        ${ready && info.description && html`<p style=${{ margin: 0, maxWidth: 640, lineHeight: v("leading-md") }}>${info.description}</p>`}
        ${rest.length > 0 && html`<${Block} label="Notes">${rest.map((t, i) => html`<p key=${i} style=${{ margin: 0, maxWidth: 640, lineHeight: v("leading-md") }}><${Linkified} text=${t} onPick=${setCode} /></p>`)}</${Block}>`}
        <${Offered} term=${term} offerings=${Object.fromEntries(TERMS.map(([t]) => [t, terms[t].get(code)]))} onTerm=${onTerm} />
      </main>
      <aside style=${{ width: 340, flexShrink: 0, borderLeft: LINE, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <${SideSection} label="Prerequisites" empty="None" loading=${info === null}>
          ${ready && (info.prerequisites || info.recommendations.length) ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-3") }}>
            ${info.prerequisites && html`<${TreeNode} node=${toNode(info.prerequisites)} onPick=${setCode} />`}
            ${info.recommendations.length > 0 && html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1") }}>
              <span style=${{ color: v("color-muted") }}>Recommended</span>
              ${info.recommendations.map((t, i) => html`<p key=${i} style=${{ margin: 0, lineHeight: v("leading-md") }}><${Linkified} text=${t} onPick=${setCode} /></p>`)}
            </div>`}
          </div>` : null}
        </${SideSection}>
        <${SideSection} label="Corequisites" empty="None" loading=${info === null}>
          ${coreq && coreq.length ? coreq.map(([label, r]) => html`<div key=${label} style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1") }}>
            ${coreq.length > 1 ? html`<span style=${{ color: v("color-muted") }}>${label === "Corequisites" ? "Taken at the same time" : "Before or at the same time"}</span>` : null}
            <${TreeNode} node=${toNode(r)} onPick=${setCode} />
          </div>`) : null}
        </${SideSection}>
        <${SideSection} label="Overlaps" empty="None" loading=${info === null}>
          ${overlaps.length ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
            <span style=${{ color: v("color-muted") }}>Credit for only one of these</span>
            ${overlaps.map((o) => html`<${LinkRow} key=${o.code} code=${o.code} tag=${o.qual} onPick=${setCode} />`)}
          </div>` : null}
        </${SideSection}>
        <${SideSection} label="Leads to" empty="Nothing requires it" loading=${info === null}>
          ${g.l.length ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
            ${required.map(([c]) => html`<${LinkRow} key=${c} code=${c} onPick=${setCode} />`)}
            ${optional.length > 0 && html`<span style=${{ color: v("color-muted"), marginTop: required.length ? v("spacing-2") : 0 }}>As one of several options</span>`}
            ${optional.map(([c]) => html`<${LinkRow} key=${c} code=${c} onPick=${setCode} />`)}
          </div>` : null}
        </${SideSection}>
      </aside>
    </div>
  </div>`;
}

export async function loadTerm(term) {
  const f = await (await fetch(`data/terms/${term}.json`)).json();
  return new Map(f.courses.map((c) => [c.code, c]));
}

export const loadCourse = async (code) => (await fetch(`data/courses/${code}.json`)).json();

export async function loadCatalog() {
  const f = await (await fetch("data/terms/202609.json")).json();
  return new Map(f.courses.map((c) => [c.code, c]));
}

// ───────────────────────── Plans & app frame ─────────────────────────
// { CSC230: ["A01", "B02"] } → { CSC230: [crn, crn] }; key order is add order (it picks the tint).
export const planOf = (byCode, picks) => Object.fromEntries(Object.entries(picks).map(([code, secs]) =>
  [code, byCode.get(code).sections.filter((s) => secs.includes(s.section)).map((s) => s.crn)]));
// First section of each type — what you get straight after adding. On real Fall 2026 data these clash on Tuesdays.
export const ADDED = { CSC230: ["A01", "B02"], CSC225: ["A01", "B01"], SENG265: ["A01", "B03"], MATH211: ["A02"] };
// Re-picking two labs clears every clash in the term.
export const RESOLVED = { CSC230: ["A01", "B05"], CSC225: ["A01", "B01"], SENG265: ["A01", "B04"], MATH211: ["A02"] };

// The app at the Paper frame size: calendar + selected courses, with an optional layer on top.
export const APP = { width: 1433, height: 805 };
export function AppFrame({ byCode, plan, children }) {
  return html`<div style=${{ position: "relative", ...APP, flexShrink: 0, overflow: "hidden", backgroundColor: "#F4F4F4", display: "flex", gap: v("spacing-4"), padding: 24 }}>
    <${Calendar} byCode=${byCode} plan=${plan} width=${APP.width - 48 - 16 - 380} height=${APP.height - 48} />
    <${SelectedCourses} byCode=${byCode} plan=${plan} height=${APP.height - 48} />
    ${children}
  </div>`;
}
