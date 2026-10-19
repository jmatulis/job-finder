"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { JobsTable } from "@/components/JobsTable";
import { api, ErrorBox } from "@/components/ui";
import type { JobDto } from "@/lib/types";

const TABS = [
  ["active", "All active"],
  ["new", "New"],
  ["saved", "Saved"],
  ["applied", "Applied"],
  ["dismissed", "Hidden"],
] as const;

function JobsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "active";
  const [jobs, setJobs] = useState<JobDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobs(null);
    api<{ jobs: JobDto[] }>(`/api/jobs?status=${status}`)
      .then((r) => setJobs(r.jobs))
      .catch((e) => setError(e.message));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My jobs</h1>
          <p className="mt-1 text-muted">Every job found so far, ranked by how well it matches your profile.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={`/api/export/links?status=${status}&direct=1`}>
            Export direct links (CSV)
          </a>
          <a className="btn" href={`/api/export/links?status=${status}`}>
            Export all (CSV)
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => router.replace(`/jobs?status=${value}`)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${status === value ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorBox message={error} />
      {jobs ? (
        <JobsTable
          jobs={jobs}
          onChange={(u) => setJobs((cur) => (cur ?? []).map((j) => (j.id === u.id ? u : j)).filter((j) => status === "active" ? j.status !== "dismissed" : j.status === status))}
        />
      ) : (
        <p className="text-muted">Loading…</p>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobsInner />
    </Suspense>
  );
}
