"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { JobsTable } from "@/components/JobsTable";
import { api, ErrorBox } from "@/components/ui";
import type { JobDto } from "@/lib/types";
import type { Profile } from "@/lib/resume";
import type { SearchQuery, SourceReport } from "@/lib/sources/types";

const DEFAULT_QUERY: SearchQuery = { keywords: "", location: "", radiusMiles: 25, remote: false, datePosted: "week", country: "us", pages: 2 };
const RADIUS_OPTIONS = [
  [5, "5 miles"],
  [10, "10 miles"],
  [25, "25 miles"],
  [50, "50 miles"],
  [100, "100 miles"],
  [0, "Any distance"],
] as const;
const LAST_QUERY_KEY = "jobfinder:lastQuery";

function loadLastQuery(): Partial<SearchQuery> | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_QUERY_KEY) ?? "null");
  } catch {
    return null;
  }
}

function SearchInner() {
  const params = useSearchParams();
  const [q, setQ] = useState<SearchQuery>(DEFAULT_QUERY);
  const [jobs, setJobs] = useState<JobDto[] | null>(null);
  const [report, setReport] = useState<SourceReport[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the last search (or the profile), or reopen a past search from the dashboard.
  useEffect(() => {
    const last = loadLastQuery();
    if (last) setQ((cur) => ({ ...cur, ...last }));
    const id = params.get("id");
    if (id) {
      setSearchId(id);
      api<{ jobs: JobDto[] }>(`/api/jobs?searchId=${id}`).then((r) => setJobs(r.jobs));
    }
    api<{ profile: Profile | null }>("/api/profile").then(({ profile }) => {
      if (!profile || last) return;
      setQ((cur) => ({
        ...cur,
        keywords: cur.keywords || profile.targetTitles[0] || profile.keywords.slice(0, 2).join(" "),
        location: cur.location || profile.locations[0] || "",
        remote: profile.remotePref === "remote",
      }));
    });
  }, [params]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(LAST_QUERY_KEY, JSON.stringify(q));
    } catch {}
    try {
      const r = await api<{ searchId: string; report: SourceReport[]; jobs: JobDto[] }>("/api/search", { method: "POST", body: JSON.stringify(q) });
      setJobs(r.jobs);
      setReport(r.report);
      setSearchId(r.searchId);
      window.history.replaceState(null, "", `/search?id=${r.searchId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof SearchQuery>(k: K, v: SearchQuery[K]) => setQ((cur) => ({ ...cur, [k]: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search jobs</h1>
        <p className="mt-1 text-muted">
          Searches JSearch (Google for Jobs: Indeed, LinkedIn, Glassdoor, Jobsora, JobLeads and more), Adzuna and your company watchlist, then finds each
          posting&apos;s link on the company&apos;s own career site.
        </p>
      </div>

      <form onSubmit={run} className="panel grid gap-4 sm:grid-cols-12">
        <label className="sm:col-span-5">
          <span className="label">Keywords / job title</span>
          <input className="input" value={q.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="data analyst SQL" required />
        </label>
        <label className="sm:col-span-3">
          <span className="label">Location</span>
          <input className="input" value={q.location} onChange={(e) => set("location", e.target.value)} placeholder="Chicago, IL" />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Within</span>
          <select className="input" value={q.radiusMiles} onChange={(e) => set("radiusMiles", Number(e.target.value))} disabled={!q.location}>
            {RADIUS_OPTIONS.map(([mi, label]) => (
              <option key={mi} value={mi}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">Posted</span>
          <select className="input" value={q.datePosted} onChange={(e) => set("datePosted", e.target.value as SearchQuery["datePosted"])}>
            <option value="today">Today</option>
            <option value="3days">Last 3 days</option>
            <option value="week">Last week</option>
            <option value="month">Last month</option>
            <option value="all">Any time</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">Country</span>
          <input className="input uppercase" maxLength={2} value={q.country} onChange={(e) => set("country", e.target.value.toLowerCase())} />
        </label>
        <label className="sm:col-span-3">
          <span className="label">Depth</span>
          <select className="input" value={q.pages} onChange={(e) => set("pages", Number(e.target.value))}>
            <option value={1}>Quick: ~10 board jobs (1 JSearch request)</option>
            <option value={2}>Normal: ~20 (2 requests)</option>
            <option value={3}>Deep: ~30 (3 requests)</option>
            <option value={5}>Widest: ~50 (5 requests)</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 sm:col-span-3">
          <input type="checkbox" checked={q.remote} onChange={(e) => set("remote", e.target.checked)} />
          <span className="text-sm">Remote only</span>
        </label>
        <div className="flex items-end sm:col-span-4 sm:justify-end">
          <button className="btn btn-primary w-full sm:w-auto" disabled={busy}>
            {busy ? "Searching all sources…" : "Search"}
          </button>
        </div>
      </form>

      <ErrorBox message={error} />

      {report.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {report.map((r) => (
            <span
              key={r.source}
              title={r.error}
              className={`rounded-md border px-2 py-1 ${r.error ? (r.skipped ? "border-line text-muted" : "border-danger/40 text-danger") : "border-line"}`}
            >
              {r.source}: {r.skipped ? "skipped, API key not set" : r.error && r.count === 0 ? `failed (${r.error.slice(0, 80)})` : `${r.count} results${r.note ? ` · ${r.note}` : ""}`}
            </span>
          ))}
        </div>
      )}

      {jobs && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Results</h2>
            {searchId && (
              <div className="flex gap-2">
                <a className="btn" href={`/api/export/links?searchId=${searchId}&direct=1`}>
                  Export direct links (CSV)
                </a>
                <a className="btn" href={`/api/export/links?searchId=${searchId}`}>
                  Export all (CSV)
                </a>
              </div>
            )}
          </div>
          <JobsTable jobs={jobs} onChange={(u) => setJobs((cur) => cur!.map((j) => (j.id === u.id ? u : j)))} />
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
