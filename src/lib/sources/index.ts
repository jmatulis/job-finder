import { pickCareerLink, resolveCareerLink, type CareerLink } from "../careerLink";
import { normalize, normalizeCompany } from "../text";
import { searchAdzuna } from "./adzuna";
import { searchWatchlist, type WatchlistEntry } from "./ats";
import { searchJSearch } from "./jsearch";
import { MissingKeyError, type NormalizedJob, type SearchQuery, type SourceName, type SourceReport } from "./types";

export interface MergedJob extends NormalizedJob {
  dedupeKey: string;
  sources: SourceName[];
  career: CareerLink;
}

export function dedupeKey(j: Pick<NormalizedJob, "company" | "title" | "city" | "location" | "remote">) {
  const place = j.remote && !j.city ? "remote" : normalize(j.city ?? j.location.split(",")[0] ?? "");
  return [normalizeCompany(j.company), normalize(j.title), place].join("|");
}

/** Collapses the same posting seen on several boards/sources into one record. */
export function mergeJobs(jobs: NormalizedJob[]): Omit<MergedJob, "career">[] {
  const byKey = new Map<string, Omit<MergedJob, "career">>();
  for (const j of jobs) {
    const key = dedupeKey(j);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...j, applyOptions: [...j.applyOptions], publishers: [...j.publishers], dedupeKey: key, sources: [j.source] });
      continue;
    }
    for (const o of j.applyOptions) {
      if (!existing.applyOptions.some((e) => e.link === o.link)) existing.applyOptions.push(o);
    }
    existing.publishers = [...new Set([...existing.publishers, ...j.publishers])];
    if (!existing.sources.includes(j.source)) existing.sources.push(j.source);
    if (j.description.length > existing.description.length) existing.description = j.description;
    existing.companyWebsite ??= j.companyWebsite;
    existing.salary ??= j.salary;
    existing.postedAt ??= j.postedAt;
    existing.boardUrl ??= j.boardUrl;
    existing.remote ||= j.remote;
  }
  return [...byKey.values()];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// Following redirects costs a request per job; cap it so searches stay fast.
const MAX_REDIRECT_FOLLOWS = 40;

export async function runSearch(q: SearchQuery, watchlist: WatchlistEntry[]) {
  const report: SourceReport[] = [];
  const collected: NormalizedJob[] = [];

  const runs: [string, () => Promise<{ jobs: NormalizedJob[]; note?: string }>][] = [
    ["JSearch (Indeed, LinkedIn, Glassdoor, Jobsora, JobLeads…)", () => searchJSearch(q)],
    ["Adzuna", async () => ({ jobs: await searchAdzuna(q) })],
  ];
  const settled = await Promise.allSettled([
    ...runs.map(([, fn]) => fn()),
    watchlist.length ? searchWatchlist(watchlist, q) : Promise.resolve({ jobs: [], errors: [] }),
  ]);

  settled.forEach((r, i) => {
    if (i < runs.length) {
      const name = runs[i][0];
      if (r.status === "fulfilled") {
        const { jobs, note } = r.value as { jobs: NormalizedJob[]; note?: string };
        collected.push(...jobs);
        report.push({ source: name, count: jobs.length, note });
      } else {
        const err = r.reason as Error;
        report.push({ source: name, count: 0, error: err.message, skipped: err instanceof MissingKeyError });
      }
    } else if (r.status === "fulfilled") {
      const { jobs, errors } = r.value as { jobs: NormalizedJob[]; errors: string[] };
      collected.push(...jobs);
      if (watchlist.length) {
        report.push({ source: "Company watchlist (Greenhouse/Lever/Ashby)", count: jobs.length, error: errors.join("; ") || undefined });
      }
    }
  });

  const merged = mergeJobs(collected);
  let follows = 0;
  const jobs: MergedJob[] = await mapLimit(merged, 8, async (job) => {
    const follow = !pickCareerLink(job) && follows++ < MAX_REDIRECT_FOLLOWS;
    return { ...job, career: await resolveCareerLink(job, { follow }) };
  });

  return { jobs, report };
}
