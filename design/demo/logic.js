// Pure schedule logic over the real term files (shapes from src/catalog/model.ts).

// Course tints: pre-mixed over white so grid lines never show through. Red and pink are reserved for clashes.
export const PALETTE = [
  { fill: "#E4F0FE", ring: "#B8D6FC", dot: "#5B9CF5" }, // blue
  { fill: "#D9F4EA", ring: "#99E1C8", dot: "#2FB98A" }, // emerald
  { fill: "#F1ECFD", ring: "#D9CDF9", dot: "#9C82EE" }, // violet
  { fill: "#F8EDD9", ring: "#ECCF99", dot: "#D4A040" }, // amber
  { fill: "#D9F4F5", ring: "#99E1E5", dot: "#2FB6BF" }, // teal
  { fill: "#EBF2E0", ring: "#C8DDAC", dot: "#86AE4F" }, // lime
  { fill: "#FBEAE1", ring: "#F5C7B0", dot: "#E58A5C" }, // orange
];
export const CLASH = { fill: "#FCDDDD", ring: "#F59697", dot: "#ED4042" };

// ---- Dates (UTC so DST never shifts a day) ----
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
export const mondayOf = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LMON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LETTER = ["U", "M", "T", "W", "R", "F", "S"];

export const shortDate = (d) => `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
export const shortRange = (m) => { const f = addDays(m, 4); const a = `${MON[m.getUTCMonth()]} ${m.getUTCDate()}`; return m.getUTCMonth() === f.getUTCMonth() ? `${a}–${f.getUTCDate()}` : `${a} – ${MON[f.getUTCMonth()]} ${f.getUTCDate()}`; };
export const longRange = (m) => { const f = addDays(m, 4); const b = m.getUTCMonth() === f.getUTCMonth() ? `${f.getUTCDate()}` : `${LMON[f.getUTCMonth()]} ${f.getUTCDate()}`; return `${LMON[m.getUTCMonth()]} ${m.getUTCDate()} – ${b}, ${f.getUTCFullYear()}`; };

// ---- Times ----
export const fmt = (min) => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, "0")}`;
export const per = (min) => (min < 720 ? "AM" : "PM");
export const timeRange = (s, e) => (per(s) === per(e) ? `${fmt(s)}–${fmt(e)} ${per(e)}` : `${fmt(s)} ${per(s)}–${fmt(e)} ${per(e)}`);
export const isTimed = (m) => m.start !== null && m.end !== null;
const mondayFirst = (a, b) => ((a + 6) % 7) - ((b + 6) % 7);
export const dateRange = (a, b) => {
  const x = parse(a), y = parse(b);
  if (a === b) return `${MON[x.getUTCMonth()]} ${x.getUTCDate()}`;
  return x.getUTCMonth() === y.getUTCMonth() ? `${MON[x.getUTCMonth()]} ${x.getUTCDate()}–${y.getUTCDate()}` : `${MON[x.getUTCMonth()]} ${x.getUTCDate()} – ${MON[y.getUTCMonth()]} ${y.getUTCDate()}`;
};
// Dates only when the meeting runs for well under the term (intensives, one-off sessions).
const spanLabel = (m, bounds) => {
  if (!bounds) return "";
  const len = (a, b) => (parse(b) - parse(a)) / 86400000;
  return len(m.startDate, m.endDate) < 0.6 * len(bounds.start, bounds.end) ? ` · ${dateRange(m.startDate, m.endDate)}` : "";
};
export const meetingLabel = (m, bounds) =>
  (isTimed(m) ? `${[...m.days].sort(mondayFirst).map((d) => LETTER[d]).join("")} ${timeRange(m.start, m.end)}` : "No set time") + spanLabel(m, bounds);

// "CSC225" -> "CSC 225"
export const displayCode = (code) => code.replace(/^([A-Z]+)(\d.*)$/, "$1 $2");

// ---- Term ----
// The most common lecture span is the term; weeks run Monday-to-Monday across it.
export function termBounds(file) {
  const counts = new Map();
  for (const c of file.courses) for (const s of c.sections) for (const m of s.meetings) {
    const k = `${m.startDate}|${m.endDate}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const [start, end] = [...counts].sort((a, b) => b[1] - a[1])[0][0].split("|");
  return { start, end };
}

// ---- Clashes ----
const dayNumber = (s) => Date.parse(`${s}T00:00:00Z`) / 86400000;
const weekdayOf = (n) => (n + 4) % 7; // day 0 (1970-01-01) was a Thursday

/** First date both meetings actually happen at overlapping times, or null. */
export function firstClash(a, b) {
  if (!isTimed(a) || !isTimed(b) || !(a.start < b.end && b.start < a.end)) return null;
  const from = Math.max(dayNumber(a.startDate), dayNumber(b.startDate));
  const to = Math.min(dayNumber(a.endDate), dayNumber(b.endDate));
  let first = null;
  for (const day of a.days) {
    if (!b.days.includes(day)) continue;
    const n = from + ((day - weekdayOf(from) + 7) % 7);
    if (n <= to && (first === null || n < first)) first = n;
  }
  return first === null ? null : new Date(first * 86400000);
}

/** First clash between a section and any of the others, as { date, with }. */
export function sectionClash(section, others) {
  let best = null;
  for (const o of others) {
    if (o.crn === section.crn) continue;
    for (const a of section.meetings) for (const b of o.meetings) {
      const date = firstClash(a, b);
      if (date && (!best || date < best.date)) best = { date, with: o };
    }
  }
  return best;
}

// ---- Weeks ----
// Google-style packing: overlapping runs share the column side by side.
function pack(items) {
  items.sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster = [], end = -1;
  const flush = () => {
    const cols = [];
    for (const it of cluster) { let c = cols.findIndex((e) => e <= it.start); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = it.end; it.col = c; }
    for (const it of cluster) it.cols = cols.length;
  };
  for (const it of items) { if (it.start >= end && cluster.length) { flush(); cluster = []; } cluster.push(it); end = Math.max(end, it.end); }
  if (cluster.length) flush();
  return items;
}

/**
 * Every Mon–Fri week of the term with the placed sections' occurrences on real dates.
 * placed: [{ section, color, preview? }]
 */
export function buildWeeks(bounds, placed) {
  // Cover every placed meeting, even ones that run outside the usual term span.
  let first = bounds.start, last = bounds.end;
  for (const p of placed) for (const mt of p.section.meetings) {
    if (mt.startDate < first) first = mt.startDate;
    if (mt.endDate > last) last = mt.endDate;
  }
  const weeks = [];
  for (let m = mondayOf(parse(first)); iso(m) <= last; m = addDays(m, 7)) {
    let clashes = 0;
    const days = WEEKDAYS.map((_, i) => {
      const date = addDays(m, i), day = iso(date), items = [];
      for (const p of placed) p.section.meetings.forEach((mt, mi) => {
        if (isTimed(mt) && mt.days.includes(date.getUTCDay()) && mt.startDate <= day && day <= mt.endDate) {
          items.push({ key: `${p.section.crn}-${mi}`, ...p, start: mt.start, end: mt.end, clash: false });
        }
      });
      items.forEach((a, ai) => items.forEach((b, bi) => {
        if (ai < bi && a.section.crn !== b.section.crn && a.start < b.end && b.start < a.end) {
          a.clash = b.clash = true;
          if (!a.preview && !b.preview) clashes++;
        }
      }));
      return { date, inTerm: bounds.start <= day && day <= bounds.end, events: pack(items) };
    });
    weeks.push({ monday: m, days, clashes });
  }
  return weeks;
}

// ---- Picking sections ----
/** One section per schedule type: prefer open seats, then no clash with what's already picked. */
export function autoPick(course, picked) {
  const types = [...new Set(course.sections.map((s) => s.scheduleType))];
  const out = [];
  for (const type of types) {
    const options = course.sections.filter((s) => s.scheduleType === type);
    const score = (s) => (sectionClash(s, [...picked, ...out]) ? 2 : 0) + (s.seats.available > 0 ? 0 : 1);
    out.push([...options].sort((a, b) => score(a) - score(b))[0]);
  }
  return out;
}

export function search(courses, query, limit = 40) {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const compact = q.replace(/\s+/g, "");
  const ranked = [];
  for (const c of courses) {
    const rank = c.code.startsWith(compact) ? 0 : c.title.toUpperCase().includes(q) ? 1 : -1;
    if (rank >= 0) ranked.push([rank, c]);
  }
  return ranked.sort((a, b) => a[0] - b[0] || a[1].code.localeCompare(b[1].code, "en", { numeric: true })).slice(0, limit).map(([, c]) => c);
}
