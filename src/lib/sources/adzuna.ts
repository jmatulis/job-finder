import { formatSalary, htmlToText } from "../text";
import { milesToKm, MissingKeyError, type NormalizedJob, type SearchQuery } from "./types";

const SUPPORTED = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"]);
const MAX_DAYS: Record<SearchQuery["datePosted"], number | undefined> = {
  all: undefined,
  today: 1,
  "3days": 3,
  week: 7,
  month: 30,
};

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  created?: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
}

export function mapAdzunaJob(j: AdzunaJob): NormalizedJob {
  const area = j.location?.area ?? [];
  const title = htmlToText(j.title);
  const description = htmlToText(j.description ?? "");
  return {
    source: "adzuna",
    sourceId: String(j.id),
    title,
    company: j.company?.display_name ?? "Unknown",
    location: j.location?.display_name ?? "",
    city: area.length > 1 ? area[area.length - 1] : undefined,
    remote: /\bremote\b/i.test(title + " " + (j.location?.display_name ?? "")),
    salary: formatSalary(j.salary_min, j.salary_max, "year"),
    description,
    postedAt: j.created,
    boardUrl: j.redirect_url,
    applyOptions: [{ publisher: "Adzuna", link: j.redirect_url, isDirect: false }],
    publishers: ["Adzuna"],
  };
}

export async function searchAdzuna(q: SearchQuery): Promise<NormalizedJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new MissingKeyError("ADZUNA_APP_ID / ADZUNA_APP_KEY are not set");
  const country = SUPPORTED.has(q.country) ? q.country : "us";
  const pages = Math.min(Math.max(q.pages, 1), 5);
  const results: NormalizedJob[] = [];
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      app_id: id,
      app_key: key,
      what: q.remote ? `${q.keywords} remote` : q.keywords,
      results_per_page: "50",
      "content-type": "application/json",
    });
    if (q.location) params.set("where", q.location);
    if (q.location && q.radiusMiles > 0) params.set("distance", String(milesToKm(q.radiusMiles)));
    const days = MAX_DAYS[q.datePosted];
    if (days) params.set("max_days_old", String(days));
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { results?: AdzunaJob[] };
    const batch = (body.results ?? []).map(mapAdzunaJob);
    results.push(...batch);
    if (batch.length < 50) break;
  }
  return results;
}
