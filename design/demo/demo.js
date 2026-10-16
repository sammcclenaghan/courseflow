// Courseflow phone — live demo. Real Fall/Spring data, one schedule state, Benji Taylor-style trays with real motion.
import React from "https://esm.sh/react@19";
import {
  html, Svg, SectionBox, BUTTON, PRIMARY, SECONDARY, ExpandIcon, TermSummary, setTitles,
  weekEvents, termWeeks, clashesFor, Thumbnail, SelectedCourses, TERMS,
} from "./ui.js";
import { CoursePageBody } from "./mobile.js";
import { search, displayCode, timeRange, fmt, per, parse, iso, addDays, mondayOf, shortRange } from "./logic.js";
const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React;

const v = (n) => `var(--${n})`;
const TEXT = { fontSize: v("text-sm"), lineHeight: v("leading-sm") };
const TNUM = { fontVariantNumeric: "tabular-nums" };
const LINE = `1px solid ${v("color-line")}`;
const TRAY = { gap: 16, radius: 32, pad: 16, inner: 16 };
const BIG = { height: 48, borderRadius: TRAY.inner, fontSize: v("text-md"), width: "100%" };
const TODAY = "2026-10-15";
const byNumber = (a, b) => a.section.localeCompare(b.section, "en", { numeric: true });
const typesOf = (ss) => [...new Set(ss.map((s) => s.scheduleType))];
const TYPE_NAME = { Lecture: "lecture", Lab: "lab", Tutorial: "tutorial", "Lecture Topic": "lecture", "Gradable Lab": "lab" };

// ───────── Schedule helpers ─────────
const clashCount = (byCode, plan) => termWeeks(byCode, plan).reduce((n, m) => n + weekEvents(byCode, plan, m).flat().filter((e) => e.clash).length, 0);
function pairs(byCode, plan) { // distinct clashing pairs across the term, earliest first
  const seen = new Map();
  for (const m of termWeeks(byCode, plan)) weekEvents(byCode, plan, m).forEach((day, i) => {
    for (const a of day) for (const b of day) if (a.crn < b.crn && a.start < b.end && b.start < a.end) {
      const k = `${a.crn}|${b.crn}`;
      if (!seen.has(k)) seen.set(k, { a, b, date: addDays(m, i) });
    }
  });
  return [...seen.values()];
}
const crnInfo = (byCode) => { const m = new Map(); for (const [code, c] of byCode) for (const s of c.sections) m.set(s.crn, { code, s }); return m; };

// ───────── Tray host: enter/exit spring, height follows content, steps cross-fade ─────────
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // iOS-like spring approximation
function TrayHost({ open, onClose, stepKey, children, morph = false }) {
  const [mounted, setMounted] = useState(open), [shown, setShown] = useState(false);
  const inner = useRef(null), [h, setH] = useState(0);
  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); }
    else { setShown(false); const t = setTimeout(() => setMounted(false), 380); return () => clearTimeout(t); }
  }, [open]);
  useLayoutEffect(() => {
    if (!inner.current) return;
    const ro = new ResizeObserver(([e]) => { if (e.target.isConnected) setH(e.target.offsetHeight); }); ro.observe(inner.current); setH(inner.current.offsetHeight);
    return () => ro.disconnect();
  }, [mounted, stepKey]); // each step is a fresh element: re-observe it, or the tray measures the detached old one (0)
  if (!mounted) return null;
  const full = morph;
  return html`<div style=${{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: open ? "auto" : "none" }}>
    <div onClick=${onClose} style=${{ position: "absolute", inset: 0, backgroundColor: "rgb(10 10 10 / 0.18)", opacity: shown && !full ? 1 : 0, transition: "opacity 300ms ease" }} />
    <div style=${{ position: "absolute", overflow: "clip", backgroundColor: v("color-surface"),
        left: full ? 0 : TRAY.gap, right: full ? 0 : TRAY.gap, bottom: full ? 0 : TRAY.gap, height: full ? "100%" : h,
        borderRadius: full ? "var(--phone-radius)" : TRAY.radius, boxShadow: "0 0 0 1px #0A0A0A0D, 0 24px 48px -12px #00000040",
        transform: shown ? "translateY(0)" : "translateY(calc(100% + 24px))",
        transition: `transform 420ms ${EASE}, height ${full ? 460 : 300}ms ${full ? EASE : "cubic-bezier(0.25, 1, 0.5, 1)"}, left 460ms ${EASE}, right 460ms ${EASE}, bottom 460ms ${EASE}, border-radius 460ms ${EASE}` }}>
      <div ref=${inner} key=${stepKey} class="step-in" style=${{ position: full ? "absolute" : "relative", inset: full ? 0 : undefined }}>${children}</div>
    </div>
  </div>`;
}

// Text morph (Benji: keep the shared letters, animate only what changed).
function Morph({ text }) {
  const prev = useRef(text), [pair, setPair] = useState([text, text]);
  useEffect(() => { if (text !== prev.current) { setPair([prev.current, text]); prev.current = text; } }, [text]);
  const [a, b] = pair; let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return html`<span style=${{ display: "inline-flex", whiteSpace: "pre" }}><span>${b.slice(0, i)}</span><span key=${b} class="morph-in">${b.slice(i)}</span></span>`;
}

const IconButton = ({ icon, onClick }) => html`<button onClick=${onClick} aria-label=${icon === "back" ? "Back" : "Close"} style=${{ width: 32, height: 32, flexShrink: 0, border: 0, borderRadius: 999, backgroundColor: v("color-fill"), display: "flex", alignItems: "center", justifyContent: "center", color: v("color-muted"), cursor: "pointer" }}>
  <${Svg} size=${16}>${icon === "back" ? html`<path d="m15 18-6-6 6-6" />` : html`<path d="M18 6 6 18M6 6l12 12" />`}</${Svg}></button>`;
function TrayBody({ title, sub, onBack, onClose, children }) {
  return html`<div style=${{ padding: `${TRAY.pad}px ${TRAY.pad}px ${TRAY.pad + 6}px`, display: "flex", flexDirection: "column", gap: 18, ...TEXT }}>
    <div style=${{ display: "flex", alignItems: "flex-start", gap: v("spacing-3") }}>
      ${onBack && html`<${IconButton} icon="back" onClick=${onBack} />`}
      <span style=${{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, paddingTop: onBack ? 6 : 0 }}>
        <span style=${{ fontSize: v("text-lg"), lineHeight: v("leading-md"), fontWeight: v("font-weight-semibold"), display: "flex", gap: v("spacing-1_5"), alignItems: "center" }}>${title}</span>
        ${sub && html`<span style=${{ color: v("color-muted") }}>${sub}</span>`}
      </span>
      ${!onBack && html`<${IconButton} icon="close" onClick=${onClose} />`}
    </div>
    ${children}
  </div>`;
}
const ClashDot = () => html`<span style=${{ width: 8, height: 8, borderRadius: 999, backgroundColor: v("color-clash-solid"), flexShrink: 0 }} />`;
const Days = ({ days }) => { const on = new Set(days);
  return html`<span style=${{ display: "flex" }}>${[1, 2, 3, 4, 5].map((d) => html`<span key=${d} style=${{ width: 12, textAlign: "center", color: on.has(d) ? "currentColor" : v("color-faint"), fontWeight: on.has(d) ? 600 : 400 }}>${"MTWRF"[d - 1]}</span>`)}</span>`; };
const When = ({ s }) => s.meetings.filter((m) => m.start !== null).map((m, i) => html`<span key=${i} style=${{ display: "flex", gap: v("spacing-3"), ...TNUM }}><${Days} days=${m.days} /><span>${timeRange(m.start, m.end)}</span></span>`);

// ───────── Day view: one weekday at a time (legacy Courseflow's phone calendar, restyled) ─────────
const START = 8 * 60, END = 21 * 60, HOUR = 60, GUTTER = 40, HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
const hourText = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Weekdays only: n steps forward or back, skipping Saturday and Sunday.
const stepDay = (d, n) => { let x = d; for (let i = 0; i < Math.abs(n); i++) do x = addDays(x, Math.sign(n)); while (x.getUTCDay() % 6 === 0); return x; };
const dayEvents = (byCode, plan, d) => weekEvents(byCode, plan, mondayOf(d))[(d.getUTCDay() + 6) % 7];

function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => { const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(ref.current); return () => ro.disconnect(); }, []);
  return w;
}
// Horizontal drag that follows the finger. Releasing past a third of `step` (or flicking) commits ±1; anything less
// springs back. `dragged` lets a tap that turned into a drag skip its click.
function useSwipe(step, onCommit) {
  const [dx, setDx] = useState(0), [anim, setAnim] = useState(false), dragged = useRef(false);
  const onPointerDown = (e) => {
    if (anim) return;
    const x0 = e.clientX, t0 = performance.now(); dragged.current = false;
    const move = (ev) => { const d = ev.clientX - x0; if (Math.abs(d) > 6) dragged.current = true; if (dragged.current) setDx(d); };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const d = ev.clientX - x0, vel = d / Math.max(1, performance.now() - t0), n = d < -step / 3 || vel < -0.5 ? 1 : d > step / 3 || vel > 0.5 ? -1 : 0;
      if (!dragged.current) return;
      setAnim(true); setDx(-n * step);
      setTimeout(() => { if (n) onCommit(n); setAnim(false); setDx(0); }, 300);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return { dx, anim, dragged, onPointerDown };
}

// One class. Apple Calendar's shape: a tint card, 4px corners, no outline, text at the top-left, 1px between
// back-to-back classes. Clashing classes look like any other (side by side, own colours); Weeks' red dot and the
// clash tray on tap carry the clash.
function Block({ ev, top, height, left, width, onTap }) {
  return html`<button onClick=${onTap} class="block" style=${{ position: "absolute", top: top + 1, height: height - 2, left, width, zIndex: ev.z, padding: "2px 2px 2px 6px",
      boxShadow: ev.z > 1 ? `0 0 0 2px ${v("color-surface")}` : "none",
      border: 0, borderRadius: v("radius-key"), display: "flex", flexDirection: "column", justifyContent: "flex-start",
      backgroundColor: v(`color-course-${ev.tint}`), textAlign: "left", overflow: "clip", cursor: "pointer", ...TEXT }}>
    <span style=${{ display: "flex", gap: 6, whiteSpace: "nowrap", overflow: "clip", fontSize: v("text-md"), lineHeight: v("leading-md") }}>
      <span style=${{ fontWeight: v("font-weight-semibold") }}>${ev.course}</span><span style=${{ color: v("color-on-tint") }}>${ev.section}</span></span>
    <span style=${{ color: v("color-on-tint"), whiteSpace: "nowrap", overflow: "clip", ...TNUM }}>${ev.covered ? `${fmt(ev.start)} ${per(ev.start)}` : timeRange(ev.start, ev.end)}</span>
  </button>`;
}

// One full-width day: roomy hours that scroll, opening on the day's first class. The track holds the day before, this
// day and the day after; the finger drags it and a release past a third of the width moves one weekday
// (Friday → Monday turns the week). Overlapping classes are placed by weekEvents (side by side, or offset on top).
function DayView({ byCode, plan, day, onDay, onTap, info }) {
  const outer = useRef(null), col = useWidth(outer, 350) - GUTTER - 4, inner = col - 8;
  const swipe = useSwipe(col, (n) => onDay(iso(stepDay(parse(day), n))));
  const dates = [-1, 0, 1].map((n) => stepDay(parse(day), n)), y = (min) => ((min - START) / 60) * HOUR;
  useEffect(() => { const first = Math.min(...dayEvents(byCode, plan, parse(day)).map((e) => e.start));
    outer.current.scrollTo({ top: Number.isFinite(first) ? Math.max(0, y(first) - HOUR / 2) : 0, behavior: "smooth" }); }, [day]);
  return html`<div ref=${outer} onPointerDown=${swipe.onPointerDown} style=${{ flex: 1, minHeight: 0, overflowX: "clip", overflowY: "auto", touchAction: "pan-y" }}>
    <div style=${{ display: "flex", height: y(END) + 8 }}>
      <div style=${{ width: GUTTER, flexShrink: 0, position: "relative" }}>
        ${HOURS.map((h) => html`<span key=${h} style=${{ position: "absolute", top: y(h * 60) - 7, right: 4, fontSize: 11, lineHeight: "14px", color: v("color-faint"), whiteSpace: "nowrap", ...TNUM }}>${hourText(h)}</span>`)}
      </div>
      <div style=${{ flex: 1, position: "relative", overflow: "clip", marginRight: 4 }}>
        <div style=${{ position: "absolute", top: 0, bottom: 0, left: 0, width: col * 3, transform: `translateX(${-col + swipe.dx}px)`, transition: swipe.anim ? `transform 300ms ${SPRING}` : "none" }}>
          ${dates.map((d, k) => html`<div key=${iso(d)} style=${{ position: "absolute", top: 0, bottom: 0, left: k * col, width: col, borderLeft: LINE,
              background: `repeating-linear-gradient(transparent, transparent ${HOUR - 1}px, ${v("color-line-subtle")} ${HOUR - 1}px, ${v("color-line-subtle")} ${HOUR}px)` }}>
            ${dayEvents(byCode, plan, d).map((ev) => { const { code, s } = info.get(ev.crn);
              return html`<${Block} key=${`${code}|${s.scheduleType}|${ev.key.split("-").at(-1)}`} ev=${ev} top=${y(ev.start)} height=${y(ev.end) - y(ev.start)}
                left=${4 + ev.left * inner} width=${ev.width * inner - (ev.width < 1 ? 4 : 0)}
                onTap=${() => !swipe.dragged.current && onTap(ev, d)} />`; })}
          </div>`)}
        </div>
      </div>
    </div>
  </div>`;
}

// The week's days as plain text (no chips): the chosen day ink semibold, the rest muted. Under a date, only "Free"
// when there are no classes (clashes stay off the calendar). Tap to switch; swiping the day moves it.
function DayPicker({ byCode, plan, day, onDay }) {
  const monday = mondayOf(parse(day));
  return html`<div style=${{ display: "flex", gap: 6, padding: "2px 16px 10px", flexShrink: 0, borderBottom: LINE }}>
    ${[0, 1, 2, 3, 4].map((i) => { const d = addDays(monday, i), on = iso(d) === day, evs = dayEvents(byCode, plan, d);
      return html`<button key=${i} onClick=${() => onDay(iso(d))} aria-pressed=${on} style=${{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "7px 0",
          border: 0, borderRadius: 12, background: "none", cursor: "pointer", color: on ? v("color-ink") : v("color-muted"), transition: "color 200ms", ...TEXT, ...TNUM }}>
        <span style=${{ display: "flex", gap: 4 }}><span style=${{ fontWeight: on ? 600 : 500 }}>${DAY[d.getUTCDay()]}</span><span style=${{ color: on ? v("color-muted") : v("color-faint") }}>${d.getUTCDate()}</span></span>
        <span style=${{ height: 14, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap", color: v("color-faint") }}>${evs.length ? "" : "Free"}</span>
      </button>`; })}
  </div>`;
}

// ───────── Screens ─────────
const Icon = { week: html`<rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />`, courses: html`<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />`, search: html`<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />` };
function TabBar({ tab, setTab, count }) {
  const t = (id, label) => html`<button key=${id} onClick=${() => setTab(id)} style=${{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 8, border: 0, background: "none", cursor: "pointer", color: id === tab ? v("color-ink") : v("color-muted"), ...TEXT }}>
    <span style=${{ position: "relative", display: "flex" }}><${Svg} size=${24}>${Icon[id]}</${Svg}>
      ${id === "courses" && count > 0 && html`<span key=${count} class="pop" style=${{ position: "absolute", top: -4, right: -10, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, backgroundColor: v("color-ink"), color: "#FFF", fontSize: 12, lineHeight: "18px", textAlign: "center", fontWeight: 600, ...TNUM }}>${count}</span>`}</span>
    <span style=${{ fontWeight: id === tab ? 600 : 500 }}>${label}</span></button>`;
  return html`<div style=${{ height: "calc(49px + var(--safe-bottom))", flexShrink: 0, display: "flex", borderTop: LINE, backgroundColor: v("color-surface") }}>${t("week", "Week")}${t("courses", "Courses")}${t("search", "Search")}</div>`;
}
const AppBar = ({ children }) => html`<div style=${{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", gap: v("spacing-2"), padding: "0 16px" }}>${children}</div>`;
const TermPill = ({ term, onClick }) => html`<button onClick=${onClick} style=${{ ...SECONDARY, gap: v("spacing-1"), whiteSpace: "nowrap", flexShrink: 0 }}><span>${TERMS.find(([t]) => t === term)[1]}</span><${Svg} size=${14}><path d="m6 9 6 6 6-6" /></${Svg}></button>`;

function Weeks({ byCode, plan, week, onPick, onClose }) {
  const weeks = termWeeks(byCode, plan).map((m) => ({ monday: m, days: weekEvents(byCode, plan, m) }));
  const soft = "rgb(255 255 255 / 0.85)";
  return html`<div class="weeks-in" style=${{ position: "absolute", inset: 0, zIndex: 50, backgroundColor: "rgb(10 10 10 / 0.72)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", display: "flex", flexDirection: "column" }}>
    <div style=${{ height: "var(--safe-top)" }} />
    <div style=${{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px", color: "#FFF" }}>
      <span style=${{ flex: 1, fontSize: v("text-lg"), fontWeight: 600 }}>Weeks</span>
      <button onClick=${onClose} style=${{ ...BUTTON, color: "#FFF", paddingInline: v("spacing-2") }}>Done</button>
    </div>
    <div style=${{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", alignContent: "start", gap: "18px 12px", padding: "4px 16px 24px" }}>
      ${weeks.length === 0 && html`<span style=${{ gridColumn: "1 / -1", color: soft, paddingTop: 24, textAlign: "center" }}>Add a course to see your weeks.</span>`}
      ${weeks.map(({ monday, days }, i) => {
        const clash = days.some((d) => d.some((e) => e.clash)), viewed = iso(monday) === week;
        return html`<button key=${i} onClick=${() => onPick(iso(monday))} style=${{ display: "flex", flexDirection: "column", gap: 6, border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer", animationDelay: `${i * 18}ms` }} class="rise">
          <div style=${{ width: "100%", backgroundColor: v("color-surface"), borderRadius: v("radius-control"), padding: 6, height: 92, overflow: "clip",
              boxShadow: clash ? `0 0 0 2px ${v("color-clash-solid")}` : "0 0 0 1px rgb(0 0 0 / 0.08)", outline: viewed ? "2px solid #FFF" : "none", outlineOffset: clash ? 5 : 3 }}>
            <div style=${{ transform: "scale(0.71)", transformOrigin: "top left", width: "141%" }}><${Thumbnail} days=${days} /></div>
          </div>
          <div style=${{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 6, color: "#FFF", whiteSpace: "nowrap", ...TEXT }}>
            <span style=${{ fontWeight: 600 }}>Week ${i + 1}</span><span style=${{ color: soft, ...TNUM }}>${shortRange(monday)}</span>
            ${iso(monday) === iso(mondayOf(parse(TODAY))) && html`<span style=${{ width: "100%", color: soft }}>This week</span>`}
          </div>
        </button>`;
      })}
    </div>
  </div>`;
}

// ───────── App ─────────
export function DemoApp({ terms, graph, titles, initialPlan }) {
  setTitles(titles);
  const [term, setTerm] = useState("202609");
  const [plans, setPlans] = useState({ 202609: initialPlan, 202701: {} });
  const [tab, setTab] = useState("week");
  const [day, setDay] = useState("2026-10-19");  // the weekday on screen; its Monday is the week Weeks highlights
  const week = iso(mondayOf(parse(day)));
  const [tray, setTray] = useState(null);      // { kind, ... } — the current step
  const [trail, setTrail] = useState([]);      // previous steps, for ‹
  const [morph, setMorph] = useState(false);
  const [page, setPage] = useState(null);      // course code shown full screen
  const [weeksOpen, setWeeksOpen] = useState(false);
  const [query, setQuery] = useState("");
  const byCode = terms[term], plan = plans[term], info = useMemo(() => crnInfo(byCode), [byCode]);
  const setPlan = (p) => setPlans((ps) => ({ ...ps, [term]: p }));
  const count = Object.keys(plan).length;
  const anyClash = useMemo(() => clashCount(byCode, plan) > 0, [byCode, plan]);
  const results = useMemo(() => (query.trim() ? search([...byCode.values()], query, 40) : []), [query, byCode]);

  // Course files load on demand the moment a course appears in a tray or page (in production: already in the
  // file the search detail fetched).
  const [, bump] = useState(0);
  const needed = [tray?.code, tray?.crn && info.get(tray.crn)?.code, page].filter(Boolean);
  useEffect(() => { for (const c of needed) if (!PAGE_INFO[c]) fetch(`data/courses/${c}.json`).then((r) => (r.ok ? r.json() : {})).then((j) => { PAGE_INFO[c] = j; bump((n) => n + 1); }); }, [needed.join()]);
  const go = (step) => { setTrail((t) => (tray ? [...t, tray] : t)); setTray(step); };
  const back = () => { setTray(trail.at(-1)); setTrail((t) => t.slice(0, -1)); };
  const close = () => { setTray(null); setTrail([]); };

  const tapBlock = (ev, date) => {
    if (ev.clash) {
      const other = dayEvents(byCode, plan, date).find((x) => x.crn !== ev.crn && x.start < ev.end && ev.start < x.end);
      go({ kind: "clash", a: ev.crn, b: other.crn, date, at: Math.max(ev.start, other.start) });
    } else go({ kind: "section", crn: ev.crn });
  };
  // Switch a picked section; afterwards report what's left (and celebrate the first clash-free schedule).
  const switchTo = (code, s) => {
    const before = clashCount(byCode, plan);
    const same = byCode.get(code).sections.filter((x) => x.scheduleType === s.scheduleType).map((x) => x.crn);
    const next = { ...plan, [code]: [...plan[code].filter((c) => !same.includes(c)), s.crn] };
    setPlan(next);
    const left = pairs(byCode, next);
    if (before > 0 && left.length === 0) go({ kind: "done", celebrate: true, title: "No clashes", sub: `Your ${TERMS.find(([t]) => t === term)[1]} week works, every week of the term.`, cta: "See my week" });
    else go({ kind: "done", title: `Moved to ${s.section}`, sub: left.length ? `${left.length} clash${left.length > 1 ? "es" : ""} left` : `${displayCode(code)} ${TYPE_NAME[s.scheduleType] ?? s.scheduleType.toLowerCase()} updated`, cta: left.length ? "Fix the next one" : "Done", next: left[0] });
  };
  // Add: types with one section are picked for you; the tray chains through the rest, then commits.
  const startAdd = (code) => {
    const c = byCode.get(code), types = typesOf(c.sections);
    const auto = types.filter((t) => c.sections.filter((s) => s.scheduleType === t).length === 1).map((t) => c.sections.find((s) => s.scheduleType === t).crn);
    const todo = types.filter((t) => c.sections.filter((s) => s.scheduleType === t).length > 1);
    if (!todo.length) commitAdd(code, auto); else go({ kind: "pick", code, type: todo[0], todo: todo.slice(1), picked: auto, mode: "add" });
  };
  const commitAdd = (code, crns) => {
    setPlan({ ...plan, [code]: crns });
    const secs = byCode.get(code).sections.filter((s) => crns.includes(s.crn)).sort(byNumber).map((s) => s.section);
    go({ kind: "done", title: `Added ${displayCode(code)}`, sub: `${secs.join(" and ")}, ${TERMS.find(([t]) => t === term)[1]}`, cta: "See my week", toWeek: true });
  };
  const openPage = (code) => { setMorph(true); setTimeout(() => { setPage(code); setMorph(false); close(); }, 470); };

  // ── tray content per step ──
  const sectionOf = (crn) => info.get(crn);
  let body = null;
  if (tray?.kind === "section") {
    const { code, s } = sectionOf(tray.crn), siblings = byCode.get(code).sections.filter((x) => x.scheduleType === s.scheduleType);
    body = html`<${TrayBody} title=${html`<span>${displayCode(code)}</span><span>${s.section}</span>`} sub=${byCode.get(code).title} onClose=${close}>
      <div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2") }}><${When} s=${s} />
        <span style=${{ display: "flex", gap: v("spacing-4"), color: v("color-muted"), ...TNUM }}><span>${s.seats.enrolled}/${s.seats.capacity} seats</span><span>${s.waitlist.capacity ? `${s.waitlist.enrolled}/${s.waitlist.capacity} waitlist` : "No waitlist"}</span></span></div>
      <div style=${{ display: "flex", gap: v("spacing-2") }}>
        <button onClick=${() => openPage(code)} style=${{ ...SECONDARY, ...BIG, flex: 1, width: "auto" }}><${ExpandIcon} size=${14} /><span>Full page</span></button>
        ${siblings.length > 1 && html`<button onClick=${() => go({ kind: "pick", code, type: s.scheduleType, mode: "change" })} style=${{ ...SECONDARY, ...BIG, flex: 1, width: "auto" }}>Change ${TYPE_NAME[s.scheduleType] ?? "section"}</button>`}
      </div>
    </${TrayBody}>`;
  } else if (tray?.kind === "clash") {
    const row = (crn) => { const { code, s } = sectionOf(crn); return html`<div key=${crn} style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "12px 14px", borderRadius: TRAY.inner, backgroundColor: v("color-fill") }}>
      <span style=${{ flex: 1, display: "flex", flexDirection: "column", gap: v("spacing-1") }}><span style=${{ display: "flex", gap: v("spacing-1_5"), fontWeight: 600 }}><span>${displayCode(code)}</span><span>${s.section}</span></span><${When} s=${s} /></span>
      <button onClick=${() => go({ kind: "pick", code, type: s.scheduleType, mode: "change" })} style=${{ ...SECONDARY, borderRadius: 10 }}>Change</button></div>`; };
    const d = tray.date;
    body = html`<${TrayBody} title=${html`<${ClashDot} /><${Morph} text="Clash" />`} sub=${`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]} ${fmt(tray.at)} ${per(tray.at)}, ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCDate()}`} onClose=${close}>
      <div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2") }}>${row(tray.a)}${row(tray.b)}</div>
    </${TrayBody}>`;
  } else if (tray?.kind === "pick") {
    const c = byCode.get(tray.code), rows = c.sections.filter((s) => s.scheduleType === tray.type).sort(byNumber);
    const current = tray.mode === "change" ? plan[tray.code]?.find((crn) => rows.some((s) => s.crn === crn)) : null;
    const pick = (s) => {
      if (tray.mode === "change") return s.crn !== current ? switchTo(tray.code, s) : null;
      const picked = [...tray.picked, s.crn];
      if (tray.todo.length) go({ ...tray, type: tray.todo[0], todo: tray.todo.slice(1), picked }); else commitAdd(tray.code, picked);
    };
    body = html`<${TrayBody} title=${html`<${Morph} text=${`${displayCode(tray.code)} ${TYPE_NAME[tray.type] ?? tray.type.toLowerCase()}`} />`} sub=${`${rows.length} to choose from. Tap one.`} onBack=${back}>
      <div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-1_5"), maxHeight: 420, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
        ${rows.map((s) => html`<${SectionBox} key=${s.crn} s=${s} picked=${s.crn === current} onPick=${() => pick(s)} clashes=${clashesFor(byCode, plan, tray.code, s)} />`)}
      </div>
    </${TrayBody}>`;
  } else if (tray?.kind === "done") {
    body = html`<${TrayBody} title=${html`${tray.celebrate ? html`<span class="pop" style=${{ display: "flex" }}><${Svg} size=${18}><path d="M20 6 9 17l-5-5" /></${Svg}></span>` : null}<${Morph} text=${tray.title} />`} sub=${tray.sub} onClose=${close}>
      <button onClick=${() => { if (tray.next) go({ kind: "clash", a: tray.next.a.crn, b: tray.next.b.crn, date: tray.next.date, at: Math.max(tray.next.a.start, tray.next.b.start) }); else { close(); if (tray.toWeek || tray.celebrate) { setTab("week"); setPage(null); } } }}
        style=${{ ...(tray.celebrate ? PRIMARY : SECONDARY), ...BIG }}>${tray.cta}</button>
    </${TrayBody}>`;
  } else if (tray?.kind === "course") {
    const c = byCode.get(tray.code), isAdded = !!plan[tray.code];
    body = html`<${TrayBody} title=${displayCode(tray.code)} sub=${c.title} onClose=${close}>
      <${CourseFacts} code=${tray.code} course=${c} />
      <div style=${{ display: "flex", gap: v("spacing-2") }}>
        <button onClick=${() => openPage(tray.code)} style=${{ ...SECONDARY, ...BIG, width: "auto", flex: "0 0 auto", paddingInline: 16 }}><${ExpandIcon} size=${14} /><span>Full page</span></button>
        ${isAdded ? html`<button onClick=${() => { const { [tray.code]: _, ...rest } = plan; setPlan(rest); }} style=${{ ...SECONDARY, ...BIG, flex: 1, width: "auto" }}><${Morph} text="Remove" /></button>`
          : html`<button onClick=${() => startAdd(tray.code)} style=${{ ...PRIMARY, ...BIG, flex: 1, width: "auto" }}><${Morph} text="Add to schedule" /></button>`}
      </div>
    </${TrayBody}>`;
  } else if (tray?.kind === "term") {
    const opt = ([t, label]) => { const n = Object.keys(plans[t]).length, on = t === term;
      return html`<button key=${t} onClick=${() => { setTerm(t); close(); }} style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: 14, border: 0, borderRadius: TRAY.inner, cursor: "pointer", textAlign: "left",
          backgroundColor: on ? v("color-surface-subtle") : v("color-surface"), boxShadow: `inset 0 0 0 1px ${on ? v("color-ink") : v("color-line")}`, ...TEXT }}>
        <span style=${{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style=${{ fontSize: v("text-md"), lineHeight: v("leading-md"), fontWeight: 600 }}>${label}</span><span style=${{ color: v("color-muted") }}>${n ? `${n} course${n > 1 ? "s" : ""}` : "Nothing added yet"}</span></span>
        ${on && html`<${Svg} size=${18}><path d="M20 6 9 17l-5-5" /></${Svg}>`}</button>`; };
    body = html`<${TrayBody} title="Term" onClose=${close}><div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-2") }}>${TERMS.map(opt)}</div></${TrayBody}>`;
  }
  // While the tray grows, it already holds the page's exact layout (status bar room, nav, body) so nothing jumps
  // when the real page takes over; the nav fades in as the tray reaches the top.
  if (morph && tray) body = html`<div style=${{ height: "100%", display: "flex", flexDirection: "column" }}>
    <div style=${{ height: "var(--safe-top)", flexShrink: 0 }} />
    <div class="nav-in" style=${{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px 0 4px" }}>
      <span style=${{ ...BUTTON, paddingInline: v("spacing-2"), fontSize: v("text-md"), color: v("color-ink") }}><${Svg} size=${18}><path d="m15 18-6-6 6-6" /></${Svg}><span>Back</span></span>
      <span style=${{ ...SECONDARY, marginLeft: "auto" }}>Copy link</span>
    </div>
    <div style=${{ flex: 1, minHeight: 0, overflow: "clip" }}><${CoursePageBody} terms=${terms} term=${term} graph=${graph} titles=${titles} code=${tray.code ?? sectionOf(tray.crn).code} info=${{ notes: [], description: "", credits: "", ...PAGE_INFO[tray.code ?? sectionOf(tray.crn).code] }} added=${false} /></div></div>`;

  // ── screens ──
  const weeksButton = html`<button onClick=${() => setWeeksOpen(true)} style=${{ ...PRIMARY, position: "relative", marginLeft: "auto" }}>
        <${Svg}>${[[3, 3], [14, 3], [3, 14], [14, 14]].map(([x, y]) => html`<rect key=${`${x}${y}`} x=${x} y=${y} width="7" height="7" rx="1.5" />`)}</${Svg}><span>Weeks</span>
        ${anyClash && html`<span class="pop" style=${{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: 999, backgroundColor: v("color-clash-solid"), boxShadow: `0 0 0 2px ${v("color-surface")}` }} />`}
      </button>`;
  const empty = html`<div style=${{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: v("color-muted") }}>
        <span>Nothing in ${TERMS.find(([t]) => t === term)[1]} yet</span><button onClick=${() => setTab("search")} style=${SECONDARY}>Search courses</button></div>`;
  const weekScreen = html`<div style=${{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <${AppBar}><${TermPill} term=${term} onClick=${() => go({ kind: "term" })} />
      <span style=${{ fontSize: v("text-md"), lineHeight: "18px", fontWeight: 600, whiteSpace: "nowrap", ...TNUM }}><${Morph} text=${shortRange(parse(week))} /></span>
      <span style=${{ marginLeft: "auto", display: "flex", gap: v("spacing-2") }}>${day !== TODAY && html`<button onClick=${() => setDay(TODAY)} class="fade" style=${SECONDARY}>Today</button>`}${weeksButton}</span>
    </${AppBar}>
    <${DayPicker} byCode=${byCode} plan=${plan} day=${day} onDay=${setDay} />
    ${count === 0 ? empty : html`<${DayView} byCode=${byCode} plan=${plan} day=${day} onDay=${setDay} onTap=${tapBlock} info=${info} />`}
  </div>`;
  const coursesScreen = html`<div style=${{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <${AppBar}><${TermPill} term=${term} onClick=${() => go({ kind: "term" })} />${count > 0 && html`<button onClick=${() => setPlan({})} style=${{ ...SECONDARY, marginLeft: "auto" }}>Clear</button>`}</${AppBar}>
    <div style=${{ flex: 1, minHeight: 0, display: "flex", borderTop: LINE }}>
      <${SelectedCourses} key=${term} byCode=${byCode} plan=${plan} onChange=${setPlan} width="100%" height="100%" flat=${true} touch=${true} header=${false} />
    </div></div>`;
  const searchScreen = html`<div style=${{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <div style=${{ display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "8px 16px" }}>
      <label style=${{ flex: 1, height: 44, display: "flex", alignItems: "center", gap: v("spacing-2"), padding: "0 14px", borderRadius: TRAY.inner, backgroundColor: v("color-fill") }}>
        <span style=${{ display: "flex", color: v("color-muted") }}><${Svg} size=${18}>${Icon.search}</${Svg}></span>
        <input value=${query} onInput=${(e) => setQuery(e.target.value)} placeholder="Course code or title" autocapitalize="characters" autocomplete="off"
          style=${{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "none", font: "inherit", fontSize: v("text-lg"), lineHeight: v("leading-md"), color: v("color-ink") }} />
      </label>
      ${query && html`<button onClick=${() => setQuery("")} style=${{ ...BUTTON, paddingInline: 0, fontSize: v("text-md") }}>Cancel</button>`}
    </div>
    <div style=${{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      ${!query && html`<div style=${{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: v("spacing-2") }}>
        <span style=${{ color: v("color-muted") }}>Try</span>
        <div style=${{ display: "flex", flexWrap: "wrap", gap: v("spacing-2") }}>
          ${["CSC 226", "psychology", "data structures", "ECON 103"].map((c) => html`<button key=${c} onClick=${() => setQuery(c)} style=${{ height: 36, padding: "0 14px", border: 0, borderRadius: 999, backgroundColor: v("color-fill"), cursor: "pointer", ...TEXT }}>${c}</button>`)}
        </div></div>`}
      ${query && !results.length && html`<div style=${{ padding: "16px", display: "flex", flexDirection: "column", gap: 4 }}><span>No ${TERMS.find(([t]) => t === term)[1]} courses match “${query}”</span><span style=${{ color: v("color-muted") }}>Try a course code like CSC 110, or a word from the title.</span></div>`}
      ${results.map((c) => html`<button key=${c.code} onClick=${() => go({ kind: "course", code: c.code })} class="row" style=${{ width: "100%", display: "flex", alignItems: "center", gap: v("spacing-3"), padding: "10px 16px", border: 0, background: "none", textAlign: "left", cursor: "pointer", ...TEXT }}>
        <span style=${{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style=${{ fontWeight: 600 }}>${displayCode(c.code)}</span>
          <span style=${{ color: v("color-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>${c.title}</span></span>
        ${plan[c.code] ? html`<span style=${{ color: v("color-muted") }}>Added</span>` : html`<span style=${{ display: "flex", color: v("color-faint") }}><${Svg}><path d="m9 18 6-6-6-6" /></${Svg}></span>`}
      </button>`)}
    </div></div>`;
  const pageScreen = page && html`<div class="page-in" style=${{ position: "absolute", inset: 0, zIndex: 30, backgroundColor: v("color-surface"), display: "flex", flexDirection: "column" }}>
    <div style=${{ height: "var(--safe-top)", flexShrink: 0 }} />
    <div style=${{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px 0 4px" }}>
      <button onClick=${() => setPage(null)} style=${{ ...BUTTON, paddingInline: v("spacing-2"), fontSize: v("text-md"), color: v("color-ink") }}><${Svg} size=${18}><path d="m15 18-6-6 6-6" /></${Svg}><span>Back</span></button>
      <button style=${{ ...SECONDARY, marginLeft: "auto" }}>Copy link</button>
    </div>
    <div style=${{ flex: 1, minHeight: 0, overflowY: "auto" }}><${CoursePageBody} terms=${terms} term=${term} graph=${graph} titles=${titles} code=${page} info=${{ notes: [], description: "", credits: "", ...PAGE_INFO[page] }} added=${!!plan[page]} /></div>
    <div style=${{ flexShrink: 0, padding: "12px 16px calc(12px + var(--safe-bottom))", borderTop: LINE }}>
      ${!byCode.has(page) ? null : plan[page] ? html`<button onClick=${() => { const { [page]: _, ...rest } = plan; setPlan(rest); }} style=${{ ...SECONDARY, ...BIG }}><${Morph} text="Remove from schedule" /></button>`
        : html`<button onClick=${() => startAdd(page)} style=${{ ...PRIMARY, ...BIG }}><${Morph} text="Add to schedule" /></button>`}
    </div></div>`;

  return html`<div style=${{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "clip", backgroundColor: v("color-surface"), ...TEXT }}>
    <div style=${{ height: "var(--safe-top)", flexShrink: 0 }} />
    <div key=${tab} class="fade" style=${{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>${tab === "week" ? weekScreen : tab === "courses" ? coursesScreen : searchScreen}</div>
    <${TabBar} tab=${tab} setTab=${(t) => { setTab(t); setPage(null); }} count=${count} />
    ${pageScreen}
    ${weeksOpen && html`<${Weeks} byCode=${byCode} plan=${plan} week=${week} onClose=${() => setWeeksOpen(false)} onPick=${(w) => { setDay(w); setWeeksOpen(false); setTab("week"); }} />`}
    <${TrayHost} open=${!!tray} onClose=${close} stepKey=${tray ? `${tray.kind}${tray.type ?? ""}${tray.title ?? ""}${tray.crn ?? ""}${tray.a ?? ""}` : "none"} morph=${morph}>${body}</${TrayHost}>
  </div>`;
}

// Course files for any course opened as a tray or page (loaded on demand by the page script).
export const PAGE_INFO = {};
function CourseFacts({ code, course }) {
  const info = PAGE_INFO[code];
  return html`<div style=${{ display: "flex", flexDirection: "column", gap: v("spacing-3") }}>
    ${info && html`<span style=${{ display: "flex", gap: v("spacing-4") }}>
      <span style=${{ display: "flex", gap: 6 }}><span style=${{ color: v("color-muted") }}>Units</span><span style=${TNUM}>${info.credits}</span></span>
      ${info.hours && html`<span style=${{ display: "flex", gap: 6 }}><span style=${{ color: v("color-muted") }}>Hours</span><span style=${TNUM}>${info.hours.trim()}</span></span>`}</span>`}
    ${info?.description && html`<p style=${{ margin: 0, lineHeight: v("leading-md"), display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 4, overflow: "hidden" }}>${info.description}</p>`}
    <div style=${{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: v("spacing-4") }}><${TermSummary} course=${course} /></div>
  </div>`;
}
