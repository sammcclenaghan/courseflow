import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";

const BANNER = "https://banner.uvic.ca/StudentRegistrationSsb/ssb";
const KUALI = "https://uvic.kuali.co/api/v1/catalog";

const [kind, term = ""] = process.argv.slice(2);
const fetchedAt = new Date().toISOString();

if (kind === "sections" && /^\d{4}(01|05|09)$/.test(term)) {
  await fetchSections();
} else if (kind === "courses") {
  await fetchCourses();
} else {
  throw new Error("Usage: fetch.ts sections <term> | fetch.ts courses");
}

async function fetchSections() {
  // Banner formats dates by Accept-Language; "*" gives the MM/DD/YYYY the
  // parser expects.
  const headers: Record<string, string> = { "Accept-Language": "*" };

  const session = await request(`${BANNER}/term/search?mode=search`, {
    method: "POST",
    headers,
    body: new URLSearchParams({ term }),
  });
  headers.Cookie = session.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  // Without a reset, Banner silently answers with the previous search.
  await request(`${BANNER}/classSearch/resetDataForm`, {
    method: "POST",
    headers,
  });

  // Banner sends at most 500 sections a page.
  const searchPage = z.object({
    totalCount: z.number(),
    data: z.array(z.unknown()),
  });
  const rows: unknown[] = [];
  let totalCount: number;
  do {
    const query = new URLSearchParams({
      txt_term: term,
      pageOffset: String(rows.length),
      pageMaxSize: "500",
    });
    const page = searchPage.parse(
      await getJson(`${BANNER}/searchResults/searchResults?${query}`, {
        headers,
      }),
    );
    totalCount = page.totalCount;
    if (page.data.length === 0) break;
    rows.push(...page.data);
  } while (rows.length < totalCount);

  if (rows.length === 0) throw new Error(`${term}: no sections`);
  if (rows.length !== totalCount) {
    throw new Error(`${term}: got ${rows.length} of ${totalCount} sections`);
  }

  save(`banner-${term}.json`, { fetchedAt, totalCount, rows });
  console.log(`${term}: ${rows.length} sections`);
}

async function fetchCourses() {
  const catalogs = z
    .array(
      z.object({ _id: z.string(), title: z.string(), startDate: z.string() }),
    )
    .parse(await getJson(`${KUALI}/public/catalogs`));
  const newest = (title: string) => {
    const [calendar] = catalogs
      .filter((c) => c.title.startsWith(title))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (!calendar) throw new Error(`No ${title}`);
    return calendar._id;
  };
  const calendars = {
    undergrad: newest("Undergraduate Calendar"),
    grad: newest("Graduate Calendar"),
  };

  // A calendar's index only has codes, so each course is its own request.
  const index = z.array(z.object({ pid: z.string() }));
  const courses: unknown[] = [];
  for (const [name, calendar] of Object.entries(calendars)) {
    const pids = index.parse(await getJson(`${KUALI}/courses/${calendar}`));
    console.log(`${pids.length} ${name} courses`);
    for (const { pid } of pids) {
      courses.push(await getJson(`${KUALI}/course/${calendar}/${pid}`));
    }
  }

  save("kuali.json", { fetchedAt, calendars, courses });
}

// Over thousands of requests UVic sometimes answers 500 or drops the
// connection, and the same request works moments later, so retry twice.
async function request(url: string, init: RequestInit = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": "CourseFlow (courseflow.smccl.ca)",
          ...init.headers,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === 3)
        throw new Error(`${url} failed 3 times`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
    }
  }
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  return (await request(url, init)).json();
}

function save(file: string, snapshot: unknown) {
  mkdirSync("data/raw", { recursive: true });
  writeFileSync(`data/raw/${file}`, JSON.stringify(snapshot));
}
