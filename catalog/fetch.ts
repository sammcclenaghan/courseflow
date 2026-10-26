// Saves UVic's API responses, untouched, to data/raw for build.ts to parse.
import { mkdirSync, writeFileSync } from "node:fs";

// Sections come from Banner, UVic's registration system; courses from Kuali,
// its academic calendar.
const SECTIONS_API = "https://banner.uvic.ca/StudentRegistrationSsb/ssb";
const COURSES_API = "https://uvic.kuali.co/api/v1/catalog";

const [kind, term] = process.argv.slice(2);
const fetchedAt = new Date().toISOString();

if (kind === "sections" && term) await fetchSections(term);
else if (kind === "courses") await fetchCourses();
else throw new Error("Usage: fetch.ts sections <term> | fetch.ts courses");

async function fetchSections(term: string) {
  // Banner formats dates by Accept-Language; "*" gives MM/DD/YYYY.
  const headers: Record<string, string> = { "Accept-Language": "*" };
  const session = await post(
    `${SECTIONS_API}/term/search?mode=search`,
    headers,
    {
      term,
    },
  );
  headers.Cookie = session.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  // Without a reset, Banner silently answers with the previous search.
  await post(`${SECTIONS_API}/classSearch/resetDataForm`, headers, {});

  // Banner sends at most 500 sections a page.
  const search = (offset: number) =>
    getJson(
      `${SECTIONS_API}/searchResults/searchResults?txt_term=${term}&pageOffset=${offset}&pageMaxSize=500`,
      { headers },
    );
  const { totalCount, data } = await search(0);
  const rows: { courseReferenceNumber: string }[] = data;
  for (let offset = 500; offset < totalCount; offset += 500)
    rows.push(...(await search(offset)).data);

  // Section notes are only in each section's description.
  const descriptions: Record<string, string> = {};
  for (const { courseReferenceNumber } of rows) {
    const response = await post(
      `${SECTIONS_API}/searchResults/getCourseDescription`,
      headers,
      { term, courseReferenceNumber },
    );
    descriptions[courseReferenceNumber] = await response.text();
  }

  save(`sections-${term}.json`, { fetchedAt, totalCount, rows, descriptions });
  console.log(`${term}: ${rows.length} of ${totalCount} sections`);
}

async function fetchCourses() {
  const catalogs: { _id: string; title: string; startDate: string }[] =
    await getJson(`${COURSES_API}/public/catalogs`);
  const newest = (title: string) =>
    catalogs
      .filter((catalog) => catalog.title.startsWith(title))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0]._id;
  const calendars = {
    undergrad: newest("Undergraduate Calendar"),
    grad: newest("Graduate Calendar"),
  };

  // A calendar's index only has IDs, so each course is its own request.
  const courses: unknown[] = [];
  for (const calendar of Object.values(calendars)) {
    const index: { pid: string }[] = await getJson(
      `${COURSES_API}/courses/${calendar}`,
    );
    for (const { pid } of index)
      courses.push(await getJson(`${COURSES_API}/course/${calendar}/${pid}`));
  }

  save("courses.json", { fetchedAt, calendars, courses });
  console.log(`${courses.length} courses`);
}

async function post(
  url: string,
  headers: Record<string, string>,
  form: Record<string, string>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: new URLSearchParams(form),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function getJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function save(file: string, snapshot: unknown) {
  mkdirSync("data/raw", { recursive: true });
  writeFileSync(`data/raw/${file}`, JSON.stringify(snapshot));
}
