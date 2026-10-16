// Courseflow on a phone (390×844). Same tokens, data and components as desktop; phone-specific shell:
// a bottom tab bar (Week · Courses · Search), primary actions in a sticky bottom bar (thumb reach),
// search as an iOS-style sheet so "Full page" can grow into the page, and tap-to-inspect instead of hover.
import React from "https://esm.sh/react@19";
import {
  html, Svg, TermToggle, TERMS, weekEvents, termWeeks, Thumbnail, CourseDetail, TermSummary, TreeNode, toNode, splitNotes,
  SideSection, LinkRow, setTitles, SelectedCourses, BUTTON, SECONDARY, PRIMARY, GHOST_ICON, ExpandIcon,
} from "./ui.js";
import { displayCode, fmt, per, timeRange, parse, iso, mondayOf, shortRange, addDays } from "./logic.js";

const v = (n) => `var(--${n})`;
const TEXT = { fontSize: v("text-sm"), lineHeight: v("leading-sm") };
const TNUM = { fontVariantNumeric: "tabular-nums" };
const LINE = `1px solid ${v("color-line")}`;
export const PHONE = { width: 390, height: 844 };
const STATUS_H = 47, TAB_H = 83, HOME_H = 34;

// ───────── Device chrome ─────────
export function StatusBar({ dark }) {
  const c = dark ? "#FFFFFF" : v("color-ink");
  return html`<div style=${{ height: STATUS_H, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px 0 34px", color: c }}>
    <span style=${{ fontSize: 16, fontWeight: 600, ...TNUM }}>9:41</span>
    <svg width="68" height="12" viewBox="0 0 68 12" fill=${c}>
      <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="6" width="3" height="6" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
      <path d="M30 3.5a8 8 0 0 1 11 0l-1.3 1.4a6 6 0 0 0-8.4 0zM32.6 6.2a4.3 4.3 0 0 1 5.8 0l-1.4 1.4a2.3 2.3 0 0 0-3 0zM35.5 9l1.5 1.6L38.5 9a2 2 0 0 0-3 0z" />
      <rect x="44" y="0.5" width="21" height="11" rx="3" fill="none" stroke=${c} stroke-opacity="0.4" /><rect x="46" y="2.5" width="16" height="7" rx="1.5" /><rect x="66" y="4" width="1.5" height="4" rx="0.75" fill-opacity="0.4" />
    </svg>
  </div>`;
}
const HomeIndicator = ({ dark }) => html`<span style=${{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 134, height: 5, borderRadius: 3, backgroundColor: dark ? "#FFFFFF" : v("color-ink"), zIndex: 30 }} />`;
export const Phone = ({ children, dark = false, bg }) => html`<div style=${{ ...PHONE, flexShrink: 0, position: "relative", borderRadius: 48, overflow: "hidden",
    backgroundColor: bg ?? v("color-surface"), boxShadow: "0 0 0 1px #0A0A0A1A, 0 24px 48px -24px #00000040", display: "flex", flexDirection: "column", ...TEXT }}>
  ${children}<${HomeIndicator} dark=${dark} />
</div>`;

const Icon = { week: html`<rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />`, courses: html`<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />`, search: html`<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />` };
function TabBar({ active, count }) {
  const tab = (id, label) => html`<div key=${id} style=${{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 8, color: id === active ? v("color-ink") : v("color-muted") }}>
    <span style=${{ position: "relative", display: "flex" }}>
      <${Svg} size=${24}>${Icon[id]}</${Svg}>
      ${id === "courses" && count > 0 && html`<span style=${{ position: "absolute", top: -4, right: -10, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, backgroundColor: v("color-ink"), color: "#FFFFFF", fontSize: 12, lineHeight: "18px", textAlign: "center", fontWeight: 600, ...TNUM }}>${count}</span>`}
    </span>
    <span style=${{ fontWeight: id === active ? v("font-weight-semibold") : v("font-weight-medium") }}>${label}</span>
  </div>`;
  return html`<div style=${{ height: TAB_H, flexShrink: 0, display: "flex", borderTop: LINE, backgroundColor: v("color-surface") }}>${tab("week", "Week")}${tab("courses", "Courses")}${tab("search", "Search")}</div>`;
}

export const AppBar = ({ children }) => html`<div style=${{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: v("spacing-2"), padding: "0 16px" }}>${children}</div>`;
const anyClash = (byCode, plan) => termWeeks(byCode, plan).some((m) => weekEvents(byCode, plan, m).some((d) => d.some((e) => e.clash)));
export function WeeksButton({ byCode, plan }) {
  return html`<button style=${{ ...PRIMARY, position: "relative", marginLeft: "auto" }}>
    <${Svg}>${[[3, 3], [14, 3], [3, 14], [14, 14]].map(([x, y]) => html`<rect key=${`${x}${y}`} x=${x} y=${y} width="7" height="7" rx="1.5" />`)}</${Svg}><span>Weeks</span>
    ${anyClash(byCode, plan) && html`<span style=${{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: 999, backgroundColor: v("color-clash-solid"), boxShadow: `0 0 0 2px ${v("color-surface")}` }} />`}
  </button>`;
}

// ───────── Week (compact five-day grid) ─────────
// The week stays whole on a phone: a scheduler is about seeing gaps and clashes across days, which a one-day
// view hides. Columns are ~67px, so blocks drop the time (the grid shows when) and keep course + section;
// side-by-side clash halves show the course number + section. Tap a block for details.
const H = 44, START = 8 * 60, HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
const GUTTER = 40; // "10 AM" fits; leaves ~69px per day so "SENG 265" fits on one line
function MobileEvent({ ev, onTap }) {
  const half = ev.cols > 1;
  const [fill, ring] = ev.clash ? [v("color-clash-fill"), v("color-clash-ring")] : [v(`color-course-${ev.tint}`), v(`color-course-${ev.tint}-ring`)];
  const top = ((ev.start - START) / 60) * H, h = ((ev.end - ev.start) / 60) * H;
  return html`<button onClick=${onTap} style=${{ position: "absolute", top, height: h, left: half ? `calc((100% - 4px) * ${ev.col / ev.cols} + 1px)` : 1, width: half ? `calc((100% - 4px) / ${ev.cols} - 1px)` : "calc(100% - 4px)",
      padding: "3px 3px", border: 0, borderRadius: v("radius-event"), backgroundColor: fill, boxShadow: `inset 0 0 0 1px ${ring}`, textAlign: "left", overflow: "clip", cursor: "pointer", ...TEXT }}>
    <span style=${{ display: "block", fontWeight: v("font-weight-medium"), whiteSpace: "nowrap", overflow: "clip" }}>${half ? ev.course.split(" ")[1] : ev.course}</span>
    <span style=${{ display: "block", color: v("color-on-tint"), whiteSpace: "nowrap", overflow: "clip" }}>${ev.section}</span>
  </button>`;
}

export function WeekScreen({ byCode, plan, week = "2026-10-19", term = "202609", count, overlay = null, receded = false, termControl = null }) {
  const monday = parse(week), days = weekEvents(byCode, plan, monday);
  return html`<${Phone}>
    ${receded ? html`<div style=${{ height: STATUS_H, flexShrink: 0 }} />` : html`<${StatusBar} />`}
    <${AppBar}>${termControl ?? html`<${TermToggle} term=${term} onTerm=${() => {}} />`}<${WeeksButton} byCode=${byCode} plan=${plan} /></${AppBar}>
    <div style=${{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", gap: v("spacing-1"), padding: "0 12px 0 16px" }}>
      <span style=${{ flex: 1, fontSize: v("text-md"), lineHeight: "18px", fontWeight: v("font-weight-semibold") }}>${shortRange(monday)}, ${monday.getUTCFullYear()}</span>
      <button style=${SECONDARY}>Today</button>
      <button aria-label="Previous week" style=${GHOST_ICON}><${Svg}><path d="m15 18-6-6 6-6" /></${Svg}></button>
      <button aria-label="Next week" style=${GHOST_ICON}><${Svg}><path d="m9 18 6-6-6-6" /></${Svg}></button>
    </div>
    <div style=${{ display: "flex", borderTop: LINE, borderBottom: LINE, flexShrink: 0 }}>
      <span style=${{ width: GUTTER, flexShrink: 0 }} />
      ${["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => html`<span key=${d} style=${{ flex: 1, padding: "6px 0", textAlign: "center", fontWeight: v("font-weight-medium") }}>
        ${d}<span style=${{ marginLeft: 4, color: v("color-muted"), fontWeight: v("font-weight-regular"), ...TNUM }}>${addDays(monday, i).getUTCDate()}</span></span>`)}
    </div>
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip", display: "flex" }}>
      <div style=${{ width: GUTTER, flexShrink: 0, position: "relative" }}>
        ${HOURS.map((h) => html`<span key=${h} style=${{ position: "absolute", top: (h * 60 - START) / 60 * H - 8, right: 4, color: v("color-muted"), whiteSpace: "nowrap", ...TNUM }}>${hourLabel(h)}</span>`)}
      </div>
      <div style=${{ flex: 1, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", paddingRight: 4 }}>
        ${days.map((events, i) => html`<div key=${i} style=${{ position: "relative", borderLeft: LINE,
            background: `repeating-linear-gradient(transparent, transparent ${H - 1}px, ${v("color-line-subtle")} ${H - 1}px, ${v("color-line-subtle")} ${H}px)` }}>
          ${events.map((ev) => html`<${MobileEvent} key=${ev.key} ev=${ev} />`)}
        </div>`)}
      </div>
    </div>
    <${TabBar} active="week" count=${count} />
    ${overlay}
  </${Phone}>`;
}

// Tap a clash block → a bottom sheet naming both sections, so you know which pick to change.
const Dim = ({ children, strength = 0.25 }) => html`<div style=${{ position: "absolute", inset: 0, backgroundColor: `rgb(10 10 10 / ${strength})`, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 10 }}>${children}</div>`;
export const Grabber = () => html`<span style=${{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: v("color-line"), margin: "8px 0 12px" }} />`;
function MeetingLine({ m }) {
  const days = [...m.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)), on = new Set(days);
  return html`<div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), ...TNUM }}>
    <span style=${{ display: "flex" }}>${[1, 2, 3, 4, 5].map((d) => html`<span key=${d} style=${{ width: 12, textAlign: "center", color: on.has(d) ? "currentColor" : v("color-faint"), fontWeight: on.has(d) ? 600 : 400 }}>${"MTWRF"[d - 1]}</span>`)}</span>
    <span>${timeRange(m.start, m.end)}</span>
  </div>`;
}
export function ClashSheet({ byCode, a, b, date }) {
  const row = ({ code, section }) => {
    const s = byCode.get(code).sections.find((x) => x.section === section);
    return html`<div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "12px 0", borderTop: LINE }}>
      <span style=${{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: v("spacing-1") }}>
        <span style=${{ display: "flex", gap: v("spacing-1_5"), fontWeight: v("font-weight-semibold") }}><span>${displayCode(code)}</span><span>${section}</span></span>
        ${s.meetings.filter((m) => m.start !== null).map((m, i) => html`<${MeetingLine} key=${i} m=${m} />`)}
      </span>
      <button style=${SECONDARY}>Change</button>
    </div>`;
  };
  return html`<${Dim}><div style=${{ backgroundColor: v("color-surface"), borderRadius: "14px 14px 0 0", padding: `0 16px ${HOME_H + 8}px`, display: "flex", flexDirection: "column" }}>
    <${Grabber} />
    <div style=${{ display: "flex", alignItems: "center", gap: v("spacing-2"), paddingBottom: 12 }}>
      <span style=${{ width: 8, height: 8, borderRadius: 999, backgroundColor: v("color-clash-solid") }} />
      <span style=${{ fontSize: v("text-md"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>Clash</span>
      ${date.map((d, i) => html`<span key=${i} style=${{ color: v("color-muted"), marginLeft: i ? v("spacing-1") : 0 }}>${d}</span>`)}
    </div>
    ${row(a)}${row(b)}
  </div></${Dim}>`;
}

// ───────── Weeks (full-screen, two columns) ─────────
export function WeeksScreen({ byCode, plan, viewing = "2026-10-19", today = "2026-10-15", under }) {
  const weeks = termWeeks(byCode, plan).map((m) => ({ monday: m, days: weekEvents(byCode, plan, m) }));
  const soft = "rgb(255 255 255 / 0.85)";
  return html`<${Phone} dark=${true} bg="#2A2A2A">
    <div style=${{ position: "absolute", inset: 0, filter: "blur(12px)", transform: "scale(1.05)" }}>${under}</div>
    <div style=${{ position: "absolute", inset: 0, backgroundColor: "rgb(10 10 10 / 0.6)", display: "flex", flexDirection: "column" }}>
      <${StatusBar} dark=${true} />
      <div style=${{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px", color: "#FFFFFF" }}>
        <span style=${{ flex: 1, fontSize: v("text-lg"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>Weeks</span>
        <button style=${{ ...BUTTON, color: "#FFFFFF", paddingInline: v("spacing-2") }}>Done</button>
      </div>
      <div style=${{ flex: 1, minHeight: 0, overflow: "clip", display: "grid", gridTemplateColumns: "1fr 1fr", alignContent: "start", gap: "18px 12px", padding: "4px 16px" }}>
        ${weeks.map(({ monday, days }, i) => {
          const clash = days.some((d) => d.some((e) => e.clash)), viewed = iso(monday) === viewing;
          return html`<div key=${i} style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5") }}>
            <div style=${{ backgroundColor: v("color-surface"), borderRadius: v("radius-control"), padding: 6, height: 92, overflow: "clip",
                boxShadow: clash ? `0 0 0 2px ${v("color-clash-solid")}` : "0 0 0 1px rgb(0 0 0 / 0.08)", outline: viewed ? "2px solid #FFFFFF" : "none", outlineOffset: clash ? 5 : 3 }}>
              <div style=${{ transform: "scale(0.71)", transformOrigin: "top left", width: "141%" }}><${Thumbnail} days=${days} /></div>
            </div>
            <div style=${{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: v("spacing-1_5"), color: "#FFFFFF", whiteSpace: "nowrap" }}>
              <span style=${{ fontWeight: v("font-weight-semibold") }}>Week ${i + 1}</span><span style=${{ color: soft, ...TNUM }}>${shortRange(monday)}</span>
              ${iso(monday) === iso(mondayOf(parse(today))) && html`<span style=${{ width: "100%", color: soft }}>This week</span>`}
            </div>
          </div>`;
        })}
      </div>
    </div>
  </${Phone}>`;
}

// ───────── Courses tab ─────────
export function CoursesScreen({ byCode, plan, term = "202609", count }) {
  return html`<${Phone}>
    <${StatusBar} />
    <${AppBar}><${TermToggle} term=${term} onTerm=${() => {}} />${Object.keys(plan).length > 0 && html`<button style=${{ ...SECONDARY, marginLeft: "auto" }}>Clear</button>`}</${AppBar}>
    <div style=${{ flex: 1, minHeight: 0, display: "flex", borderTop: LINE }}>
      <${SelectedCourses} byCode=${byCode} plan=${plan} width=${390} height=${PHONE.height - STATUS_H - 52 - TAB_H - 1} flat=${true} touch=${true} header=${false} />
    </div>
    <${TabBar} active="courses" count=${count} />
  </${Phone}>`;
}

// ───────── Search (an iOS-style sheet over the app) ─────────
// The sheet sits 56px from the top over the app, which recedes (scaled, dimmed) — so "Full page" can grow the
// sheet into the page: its top edge rises to the status bar and its corners square off.
const SHEET_TOP = 56;
function Sheet({ children, under, top = SHEET_TOP, recede = 1 }) {
  const r = 14 * Math.min(1, top / SHEET_TOP);
  const statusOnSheet = top < STATUS_H / 2; // the system status bar reads dark once the sheet is under it
  return html`<${Phone} bg="#0A0A0A" dark=${false}>
    <div style=${{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }}><${StatusBar} dark=${!statusOnSheet} /></div>
    <div style=${{ position: "absolute", inset: 0, borderRadius: 48, overflow: "clip", transformOrigin: "top center",
        transform: `translateY(${10 * recede}px) scale(${1 - 0.06 * recede})`, opacity: 1 - 0.35 * recede }}>${under}</div>
    <div style=${{ position: "absolute", left: 0, right: 0, bottom: 0, top, borderRadius: top ? `${r}px ${r}px 0 0` : 0, backgroundColor: v("color-surface"),
        overflow: "clip", display: "flex", flexDirection: "column", boxShadow: "0 -8px 24px -12px #00000040", paddingTop: Math.max(0, STATUS_H - top) }}>${children}</div>
  </${Phone}>`;
}
function SearchField({ query }) {
  return html`<div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "12px 16px 8px" }}>
    <div style=${{ flex: 1, height: 40, display: "flex", alignItems: "center", gap: v("spacing-2"), padding: "0 12px", borderRadius: 10, backgroundColor: v("color-fill") }}>
      <span style=${{ display: "flex", color: v("color-muted") }}><${Svg} size=${18}>${Icon.search}</${Svg}></span>
      <span style=${{ fontSize: v("text-lg"), lineHeight: v("leading-md"), color: query ? v("color-ink") : v("color-muted") }}>${query || "Course code or title"}</span>
      ${query && html`<span style=${{ width: 2, height: 20, backgroundColor: v("color-ink"), marginLeft: -6 }} />`}
    </div>
    <button style=${{ ...BUTTON, paddingInline: 0, fontSize: v("text-md"), fontWeight: v("font-weight-medium") }}>Cancel</button>
  </div>`;
}
export function SearchEmptyScreen({ under }) {
  return html`<${Sheet} under=${under}>
    <${Grabber} /><${SearchField} />
    <div style=${{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: v("spacing-2") }}>
      <span style=${{ color: v("color-muted") }}>Try</span>
      <div style=${{ display: "flex", flexWrap: "wrap", gap: v("spacing-2") }}>
        ${["CSC 110", "psychology", "data structures", "hulquminum"].map((c) => html`<span key=${c} style=${{ height: 36, padding: "0 14px", display: "flex", alignItems: "center", borderRadius: 999, backgroundColor: v("color-fill") }}>${c}</span>`)}
      </div>
    </div>
  </${Sheet}>`;
}
export function SearchResultsScreen({ under, query, results, added, active }) {
  return html`<${Sheet} under=${under}>
    <${Grabber} /><${SearchField} query=${query} />
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip" }}>
      ${results.slice(0, 11).map((c, i) => html`<div key=${c.code} style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "10px 16px",
          backgroundColor: i === active ? v("color-fill") : "transparent" }}>
        <span style=${{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style=${{ fontWeight: v("font-weight-semibold") }}>${displayCode(c.code)}</span>
          <span style=${{ color: v("color-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>${c.title}</span>
        </span>
        ${added.includes(c.code) ? html`<span style=${{ color: v("color-muted") }}>Added</span>` : html`<span style=${{ display: "flex", color: v("color-faint") }}><${Svg}><path d="m9 18 6-6-6-6" /></${Svg}></span>`}
      </div>`)}
    </div>
  </${Sheet}>`;
}

// The action lives at the bottom, in thumb reach; it's the same black Add / white Remove.
const BottomBar = ({ added, offered = true, other }) => html`<div style=${{ flexShrink: 0, padding: `12px 16px ${HOME_H + 4}px`, borderTop: LINE, backgroundColor: v("color-surface") }}>
  ${offered ? (added ? html`<button style=${{ ...SECONDARY, width: "100%", height: 44, fontSize: v("text-md") }}>Remove from schedule</button>`
    : html`<button style=${{ ...PRIMARY, width: "100%", height: 44, fontSize: v("text-md") }}>Add to schedule</button>`)
    : other ? html`<button style=${{ ...SECONDARY, width: "100%", height: 44, fontSize: v("text-md") }}>See ${other}</button>` : null}
</div>`;

export function SearchDetailScreen({ under, query, course, info, added }) {
  return html`<${Sheet} under=${under}>
    <${Grabber} />
    <div style=${{ height: 40, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 8px 0 4px" }}>
      <button style=${{ ...BUTTON, paddingInline: v("spacing-2"), fontSize: v("text-md"), color: v("color-ink") }}><${Svg} size=${18}><path d="m15 18-6-6 6-6" /></${Svg}><span>${query}</span></button>
      <button style=${{ ...BUTTON, marginLeft: "auto", paddingInline: v("spacing-2"), color: v("color-muted") }}><${ExpandIcon} size=${14} /><span>Full page</span></button>
    </div>
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip", padding: "8px 16px 16px" }}>
      <${CourseDetail} embedded=${true} course=${course} info=${info} added=${added} actions=${false} />
    </div>
    <${BottomBar} added=${added} />
  </${Sheet}>`;
}

// ───────── Course page (stacked) ─────────
// The desktop sidebar's four fixed sections stack under the course; every code is a link.
export function CoursePageBody({ terms, term, graph, titles, code, info, added }) {
  setTitles(titles);
  const course = terms[term].get(code), g = graph[code] ?? { b: [], l: [] };
  const { overlaps, rest } = splitNotes(code, info.notes);
  const required = g.l.filter(([, k]) => k === "required"), optional = g.l.filter(([, k]) => k !== "required");
  const coreqs = [info.corequisites, info.preOrCorequisites].filter(Boolean);
  const label = TERMS.find(([t]) => t === term)[1];
  return html`<div style=${{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 16px 24px" }}>
    <div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1") }}>
      <span style=${{ fontSize: v("text-lg"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold") }}>${displayCode(code)}</span>
      <span style=${{ color: v("color-muted") }}>${titles[code]}</span>
      <span style=${{ display: "flex", gap: v("spacing-4"), marginTop: v("spacing-1") }}>
        <span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Units</span><span style=${TNUM}>${info.credits}</span></span>
        ${info.hours && html`<span style=${{ display: "flex", gap: v("spacing-1_5") }}><span style=${{ color: v("color-muted") }}>Hours</span><span style=${TNUM}>${info.hours.trim()}</span></span>`}
      </span>
    </div>
    ${info.description && html`<p style=${{ margin: 0, lineHeight: v("leading-md") }}>${info.description}</p>`}
    <section style=${{ display: "flex", flexDirection: "column", gap: v("spacing-4") }}>
      <span style=${{ fontWeight: v("font-weight-semibold") }}>${label}</span>
      ${course ? html`<${TermSummary} course=${course} />` : html`<span style=${{ color: v("color-muted") }}>Not offered in ${label}.</span>`}
    </section>
    <div style=${{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 20, borderTop: LINE }}>
      <${SideSection} label="Prerequisites" empty="None">${info.prerequisites ? html`<${TreeNode} node=${toNode(info.prerequisites)} onPick=${() => {}} />` : null}</${SideSection}>
      <${SideSection} label="Corequisites" empty="None">${coreqs.length ? coreqs.map((r, i) => html`<${TreeNode} key=${i} node=${toNode(r)} onPick=${() => {}} />`) : null}</${SideSection}>
      <${SideSection} label="Overlaps" empty="None">${overlaps.length ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2") }}>
        <span style=${{ color: v("color-muted") }}>Credit for only one of these</span>${overlaps.map((o) => html`<${LinkRow} key=${o.code} code=${o.code} tag=${o.qual} onPick=${() => {}} />`)}</div>` : null}</${SideSection}>
      <${SideSection} label="Leads to" empty="Nothing requires it">${g.l.length ? html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2") }}>
        ${required.map(([c]) => html`<${LinkRow} key=${c} code=${c} onPick=${() => {}} />`)}
        ${optional.length > 0 && html`<span style=${{ color: v("color-muted"), marginTop: v("spacing-2") }}>As one of several options</span>`}
        ${optional.map(([c]) => html`<${LinkRow} key=${c} code=${c} onPick=${() => {}} />`)}</div>` : null}</${SideSection}>
    </div>
  </div>`;
}

function PageNav() {
  return html`<div style=${{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px 0 4px" }}>
    <button style=${{ ...BUTTON, paddingInline: v("spacing-2"), fontSize: v("text-md"), color: v("color-ink") }}><${Svg} size=${18}><path d="m15 18-6-6 6-6" /></${Svg}><span>Back</span></button>
    <button style=${{ ...SECONDARY, marginLeft: "auto" }}>Copy link</button>
  </div>`;
}
const otherTerm = ({ terms, term, code }) => TERMS.find(([t]) => t !== term && terms[t].has(code))?.[1];
export function CoursePageScreen(props) {
  return html`<${Phone}>
    <${StatusBar} /><${PageNav} />
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip" }}><${CoursePageBody} ...${props} /></div>
    <${BottomBar} added=${props.added} offered=${props.terms[props.term].has(props.code)} other=${otherTerm(props)} />
  </${Phone}>`;
}

// "Full page" on a phone: the sheet's top edge rises from 56px to the top of the screen and its corners square
// off while the app behind (already receded) disappears under it — the sheet grows into the page. t ∈ [0, 1].
export function GrowFrame({ t, under, ...props }) {
  const top = SHEET_TOP * (1 - t);
  return html`<${Sheet} under=${under} top=${top} recede=${1}>
    ${t < 1 ? html`<${Grabber} />` : html`<div style=${{ height: 8 }} />`}
    <${PageNav} />
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip" }}><${CoursePageBody} ...${props} /></div>
    <${BottomBar} added=${props.added} offered=${props.terms[props.term].has(props.code)} />
  </${Sheet}>`;
}
