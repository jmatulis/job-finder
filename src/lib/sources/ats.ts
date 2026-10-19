import { htmlToText, normalize } from "../text";
import type { NormalizedJob, SearchQuery } from "./types";

// Public job-board APIs of the most common applicant tracking systems. Results
// from these are already on the company's own career site.

export interface WatchlistEntry {
  company: string;
  ats: "greenhouse" | "lever" | "ashby";
  slug: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  content?: string;
}

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: { location?: string; commitment?: string; team?: string };
  workplaceType?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
  createdAt?: number;
}

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  isRemote?: boolean;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl: string;
  applyUrl?: string;
}

const isRemoteText = (s: string) => /\bremote\b/i.test(s);

function direct(company: string, url: string, publisher: string) {
  return { applyOptions: [{ publisher, link: url, isDirect: true }], publishers: [company] };
}

export function mapGreenhouse(entry: WatchlistEntry, j: GreenhouseJob): NormalizedJob {
  const location = j.location?.name ?? "";
  return {
    source: "greenhouse",
    sourceId: `${entry.slug}:${j.id}`,
    title: j.title,
    company: entry.company,
    location,
    city: location.split(",")[0]?.trim() || undefined,
    remote: isRemoteText(location),
    description: htmlToText(j.content ?? ""),
    postedAt: j.first_published ?? j.updated_at,
    boardUrl: j.absolute_url,
    ...direct(entry.company, j.absolute_url, "Greenhouse"),
  };
}

export function mapLever(entry: WatchlistEntry, j: LeverJob): NormalizedJob {
  const location = j.categories?.location ?? "";
  const lists = (j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
  return {
    source: "lever",
    sourceId: `${entry.slug}:${j.id}`,
    title: j.text,
    company: entry.company,
    location,
    city: location.split(",")[0]?.trim() || undefined,
    remote: j.workplaceType === "remote" || isRemoteText(location),
    description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join("\n\n"),
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
    boardUrl: j.hostedUrl,
    ...direct(entry.company, j.applyUrl ?? j.hostedUrl, "Lever"),
  };
}

export function mapAshby(entry: WatchlistEntry, j: AshbyJob): NormalizedJob {
  const location = j.location ?? "";
  return {
    source: "ashby",
    sourceId: `${entry.slug}:${j.id}`,
    title: j.title,
    company: entry.company,
    location,
    city: location.split(",")[0]?.trim() || undefined,
    remote: !!j.isRemote || isRemoteText(location),
    description: j.descriptionPlain ?? "",
    postedAt: j.publishedAt,
    boardUrl: j.jobUrl,
    ...direct(entry.company, j.applyUrl ?? j.jobUrl, "Ashby"),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

export async function fetchCompanyJobs(entry: WatchlistEntry): Promise<NormalizedJob[]> {
  const slug = encodeURIComponent(entry.slug);
  switch (entry.ats) {
    case "greenhouse": {
      const body = await getJson<{ jobs: GreenhouseJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
      return body.jobs.map((j) => mapGreenhouse(entry, j));
    }
    case "lever": {
      const body = await getJson<LeverJob[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
      return body.map((j) => mapLever(entry, j));
    }
    case "ashby": {
      const body = await getJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
      return body.jobs.map((j) => mapAshby(entry, j));
    }
  }
}

const DAYS: Record<SearchQuery["datePosted"], number> = { all: Infinity, today: 1, "3days": 3, week: 7, month: 30 };

/** ATS boards return every opening, so filter locally to the search query. */
export function filterToQuery(jobs: NormalizedJob[], q: SearchQuery, now = Date.now()) {
  const words = normalize(q.keywords).split(" ").filter((w) => w.length > 1);
  const loc = normalize(q.location);
  const maxAge = DAYS[q.datePosted] * 86_400_000;
  return jobs.filter((j) => {
    const title = normalize(j.title);
    if (words.length && !words.every((w) => title.includes(w))) return false;
    if (q.remote && !j.remote) return false;
    if (loc && !j.remote && !normalize(j.location).includes(loc.split(" ")[0])) return false;
    if (j.postedAt && Number.isFinite(maxAge) && now - Date.parse(j.postedAt) > maxAge) return false;
    return true;
  });
}

export async function searchWatchlist(entries: WatchlistEntry[], q: SearchQuery) {
  const settled = await Promise.allSettled(entries.map(fetchCompanyJobs));
  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...filterToQuery(r.value, q));
    else errors.push(`${entries[i].company}: ${(r.reason as Error).message}`);
  });
  return { jobs, errors };
}
