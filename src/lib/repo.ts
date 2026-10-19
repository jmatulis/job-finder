import { createHash, randomUUID } from "node:crypto";
import { CONFIDENCE_RANK } from "./careerLink";
import { scoreJob } from "./matching";
import type { Profile, Resume } from "./resume";
import type { MergedJob } from "./sources";
import type { WatchlistEntry } from "./sources/ats";
import type { DocStore } from "./store";
import type { JobDto, JobStatus, ProfileDoc, SearchDoc, TailoredDto, WatchlistDoc } from "./types";

const now = () => new Date().toISOString();
const newId = () => randomUUID().replace(/-/g, "").slice(0, 16);
export const jobIdFor = (dedupeKey: string) => createHash("sha1").update(dedupeKey).digest("hex").slice(0, 16);

// ---------- profile ----------

export async function getProfile(s: DocStore): Promise<Profile | null> {
  const doc = await s.get<ProfileDoc>("profile", "main");
  if (!doc) return null;
  return {
    rawText: doc.rawText,
    resume: doc.resume,
    keywords: doc.keywords,
    targetTitles: doc.targetTitles,
    locations: doc.locations,
    yearsExperience: doc.yearsExperience,
    remotePref: doc.remotePref,
  };
}

export async function saveProfile(s: DocStore, p: Profile) {
  await s.set<ProfileDoc>("profile", { ...p, id: "main", updatedAt: now() });
  await rescoreAll(s, p);
}

function matchProfile(p: Profile | null) {
  return {
    keywords: p?.keywords ?? [],
    targetTitles: p?.targetTitles ?? [],
    locations: p?.locations ?? [],
    yearsExperience: p?.yearsExperience ?? 0,
    remotePref: p?.remotePref ?? "any",
    skills: p?.resume?.skills ?? [],
  };
}

/** Scores change when the profile does, so recompute them for stored jobs. */
async function rescoreAll(s: DocStore, p: Profile) {
  const mp = matchProfile(p);
  const jobs = await s.list<JobDto>("jobs");
  const changed = jobs
    .map((j) => {
      const m = scoreJob(j, mp);
      return m.score === j.matchScore ? null : { ...j, matchScore: m.score, matchedKeywords: m.matched };
    })
    .filter((j): j is JobDto => !!j);
  await s.setMany("jobs", changed);
}

// ---------- jobs ----------

export async function recordSearch(s: DocStore, query: Record<string, unknown>, resultCount: number, report: unknown[]) {
  const doc: SearchDoc = { id: `${Date.now().toString(36)}${newId().slice(0, 4)}`, query, resultCount, report, createdAt: now() };
  await s.set("searches", doc);
  return doc.id;
}

export async function upsertJobs(s: DocStore, jobs: MergedJob[], searchId: string) {
  const mp = matchProfile(await getProfile(s));
  const ids = jobs.map((j) => jobIdFor(j.dedupeKey));
  const existing = await s.getMany<JobDto>("jobs", ids);
  const ts = now();

  const docs = jobs.map((j, i): JobDto => {
    const m = scoreJob(j, mp);
    const prev = existing.get(ids[i]);
    // Never downgrade a career link we found earlier.
    const keepPrevLink = prev && CONFIDENCE_RANK[prev.careerConfidence] > CONFIDENCE_RANK[j.career.confidence];
    return {
      id: ids[i],
      dedupeKey: j.dedupeKey,
      sources: [...new Set([...(prev?.sources ?? []), ...j.sources])],
      publishers: [...new Set([...(prev?.publishers ?? []), ...j.publishers])],
      title: j.title,
      company: j.company,
      companyWebsite: j.companyWebsite ?? prev?.companyWebsite ?? null,
      location: j.location,
      remote: j.remote,
      salary: j.salary ?? prev?.salary ?? null,
      description: j.description.length >= (prev?.description.length ?? 0) ? j.description : prev!.description,
      postedAt: j.postedAt ?? prev?.postedAt ?? null,
      boardUrl: j.boardUrl ?? prev?.boardUrl ?? null,
      careerUrl: keepPrevLink ? prev.careerUrl : j.career.url,
      careerConfidence: keepPrevLink ? prev.careerConfidence : j.career.confidence,
      careersPageGuess: j.career.careersPageGuess ?? prev?.careersPageGuess ?? null,
      matchScore: m.score,
      matchedKeywords: m.matched,
      status: prev?.status ?? "new",
      appliedAt: prev?.appliedAt ?? null,
      lastSearchId: searchId,
      firstSeenAt: prev?.firstSeenAt ?? ts,
      updatedAt: ts,
    };
  });
  await s.setMany("jobs", docs);
}

export interface JobFilter {
  searchId?: string;
  status?: JobStatus | "active";
  directOnly?: boolean;
}

export async function listJobs(s: DocStore, f: JobFilter = {}): Promise<JobDto[]> {
  let jobs = f.searchId
    ? await s.list<JobDto>("jobs", ["lastSearchId", f.searchId])
    : f.status && f.status !== "active"
      ? await s.list<JobDto>("jobs", ["status", f.status])
      : await s.list<JobDto>("jobs");
  if (f.status === "active") jobs = jobs.filter((j) => j.status !== "dismissed");
  else if (f.status) jobs = jobs.filter((j) => j.status === f.status);
  if (f.directOnly) jobs = jobs.filter((j) => j.careerConfidence !== "board-only");
  const sortKey = f.status === "applied" ? (j: JobDto) => j.appliedAt ?? "" : (j: JobDto) => String(j.matchScore).padStart(3, "0") + (j.postedAt ?? "");
  return jobs.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}

export const getJob = (s: DocStore, id: string) => s.get<JobDto>("jobs", id);

export async function setJobStatus(s: DocStore, id: string, status: JobStatus) {
  const job = await getJob(s, id);
  if (!job) return null;
  const appliedAt = status === "applied" ? (job.status === "applied" ? job.appliedAt : now()) : null;
  await s.update("jobs", id, { status, appliedAt, updatedAt: now() });
  return { ...job, status, appliedAt };
}

export async function setJobDescription(s: DocStore, id: string, description: string) {
  const job = await getJob(s, id);
  if (!job) return;
  const m = scoreJob({ ...job, description }, matchProfile(await getProfile(s)));
  await s.update("jobs", id, { description, matchScore: m.score, matchedKeywords: m.matched, updatedAt: now() });
}

export async function jobCounts(s: DocStore) {
  const counts: Partial<Record<JobStatus, number>> = {};
  for (const j of await s.list<JobDto>("jobs")) counts[j.status] = (counts[j.status] ?? 0) + 1;
  return counts;
}

export async function recentSearches(s: DocStore, limit = 8) {
  const all = await s.list<SearchDoc>("searches");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// ---------- watchlist ----------

export async function listWatchlist(s: DocStore) {
  return (await s.list<WatchlistDoc>("watchlist")).sort((a, b) => a.company.localeCompare(b.company));
}

export async function addWatchlist(s: DocStore, e: WatchlistEntry) {
  const doc: WatchlistDoc = { id: newId(), ...e };
  await s.set("watchlist", doc);
  return doc;
}

export const removeWatchlist = (s: DocStore, id: string) => s.delete("watchlist", id);

// ---------- tailored resumes ----------

export async function saveTailored(
  s: DocStore,
  t: { jobId: string; resume: Resume; changes: string[]; missingKeywords: string[]; source: TailoredDto["source"] },
) {
  const doc: TailoredDto = { id: newId(), createdAt: now(), ...t };
  await s.set("tailored", doc);
  return doc;
}

export async function latestTailored(s: DocStore, jobId: string) {
  const all = await s.list<TailoredDto>("tailored", ["jobId", jobId]);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export const getTailored = (s: DocStore, id: string) => s.get<TailoredDto>("tailored", id);

export const updateTailored = (s: DocStore, id: string, resume: Resume) => s.update("tailored", id, { resume });
