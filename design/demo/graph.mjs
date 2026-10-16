// Precompute the requisite graph for every course, with each link marked "required" (needed on every path through
// the requirement) or "option" (one of several ways to satisfy it). Build-step shaped: static JSON, no runtime work.
import fs from "node:fs";
const DIR = new URL("data/courses", import.meta.url).pathname;
const courses = fs.readdirSync(DIR).map((f) => JSON.parse(fs.readFileSync(`${DIR}/${f}`)));

// Walk a requirement; a course is required only if every node above it demands all of its children.
function links(r, required, out) {
  if (!r) return out;
  if (r.type === "all") r.items.forEach((i) => links(i, required, out));
  else if (r.type === "some") r.items.forEach((i) => links(i, required && r.count >= r.items.length, out));
  else if (r.type === "courses") {
    const req = required && (r.need === "all" || (typeof r.need === "number" && r.need >= r.courses.length));
    for (const c of r.courses) if (out.get(c) !== "required") out.set(c, req ? "required" : "option");
  }
  return out;
}
const graph = {};
for (const c of courses) {
  const m = new Map();
  for (const k of ["prerequisites", "preOrCorequisites", "corequisites"]) links(c[k], true, m);
  m.delete(c.code);
  graph[c.code] = { b: [...m].sort(([a, x], [b, y]) => (x === y ? a.localeCompare(b, "en", { numeric: true }) : x === "required" ? -1 : 1)), l: [] };
}
for (const [code, { b }] of Object.entries(graph)) for (const [req, kind] of b) graph[req]?.l.push([code, kind]);
for (const g of Object.values(graph)) g.l.sort(([a, x], [b, y]) => (x === y ? a.localeCompare(b, "en", { numeric: true }) : x === "required" ? -1 : 1));
const titles = Object.fromEntries(courses.map((c) => [c.code, c.title]));
fs.writeFileSync(new URL("graph.json", import.meta.url), JSON.stringify({ titles, graph }));
const show = (code) => console.log(code, "builds on", JSON.stringify(graph[code].b), "\n  leads to", JSON.stringify(graph[code].l));
show("CSC225"); show("CSC226");
console.log("size KB", Math.round(fs.statSync("graph.json").size / 1024));
