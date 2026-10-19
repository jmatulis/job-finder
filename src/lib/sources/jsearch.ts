import { formatSalary } from "../text";
import { milesToKm, MissingKeyError, type NormalizedJob, type SearchQuery } from "./types";

// JSearch (RapidAPI) exposes Google for Jobs, which aggregates Indeed, LinkedIn,
// Glassdoor, ZipRecruiter, Jobsora, JobLeads and many employer career sites.
const HOST = "jsearch.p.rapidapi.com";

interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_website?: string | null;
  job_publisher?: string | null;
  job_title: string;
  job_apply_link?: string | null;
  job_apply_is_direct?: boolean | null;
  apply_options?: { publisher: string; apply_link: string; is_direct: boolean }[] | null;
  job_description?: string | null;
  job_is_remote?: boolean | null;
  job_posted_at_datetime_utc?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_location?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_period?: string | null;
  job_google_link?: string | null;
}

export function mapJSearchJob(j: JSearchJob): NormalizedJob {
  const applyOptions = (j.apply_options ?? []).map((o) => ({
    publisher: o.publisher,
    link: o.apply_link,
    isDirect: !!o.is_direct,
  }));
  if (j.job_apply_link && !applyOptions.some((o) => o.link === j.job_apply_link)) {
    applyOptions.unshift({
      publisher: j.job_publisher ?? "Unknown",
      link: j.job_apply_link,
      isDirect: !!j.job_apply_is_direct,
    });
  }
  const publishers = [...new Set([j.job_publisher, ...applyOptions.map((o) => o.publisher)].filter(Boolean) as string[])];
  const location =
    j.job_location || [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || (j.job_is_remote ? "Remote" : "");
  return {
    source: "jsearch",
    sourceId: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    companyWebsite: j.employer_website ?? undefined,
    location,
    city: j.job_city ?? undefined,
    remote: !!j.job_is_remote,
    salary: formatSalary(j.job_min_salary, j.job_max_salary, j.job_salary_period),
    description: j.job_description ?? "",
    postedAt: j.job_posted_at_datetime_utc ?? undefined,
    boardUrl: j.job_apply_link ?? j.job_google_link ?? undefined,
    applyOptions,
    publishers,
  };
}

export async function searchJSearch(q: SearchQuery): Promise<NormalizedJob[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new MissingKeyError("RAPIDAPI_KEY is not set");
  const params = new URLSearchParams({
    query: q.location ? `${q.keywords} in ${q.location}` : q.keywords,
    page: "1",
    num_pages: String(Math.min(Math.max(q.pages, 1), 5)),
    date_posted: q.datePosted,
    country: q.country || "us",
  });
  if (q.remote) params.set("work_from_home", "true");
  if (q.location && q.radiusMiles > 0) params.set("radius", String(milesToKm(q.radiusMiles)));
  const res = await fetch(`https://${HOST}/search?${params}`, {
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`JSearch HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { data?: JSearchJob[] };
  return (body.data ?? []).map(mapJSearchJob);
}
