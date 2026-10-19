"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { JobDto, JobStatus } from "@/lib/types";
import { api, ConfidenceBadge, formatDate, ScorePill } from "./ui";

const STATUS_ACTIONS: { status: JobStatus; label: string }[] = [
  { status: "saved", label: "Save" },
  { status: "applied", label: "Applied" },
  { status: "dismissed", label: "Hide" },
];

export function JobsTable({ jobs, onChange }: { jobs: JobDto[]; onChange: (job: JobDto) => void }) {
  const [directOnly, setDirectOnly] = useState(false);
  const [publisher, setPublisher] = useState("");
  const [hideDismissed, setHideDismissed] = useState(true);

  const publishers = useMemo(() => [...new Set(jobs.flatMap((j) => j.publishers))].sort((a, b) => a.localeCompare(b)), [jobs]);
  const visible = jobs.filter(
    (j) =>
      (!directOnly || j.careerConfidence !== "board-only") &&
      (!publisher || j.publishers.includes(publisher)) &&
      (!hideDismissed || j.status !== "dismissed"),
  );
  const direct = jobs.filter((j) => j.careerConfidence !== "board-only").length;

  async function setStatus(job: JobDto, status: JobStatus) {
    const next = job.status === status ? "new" : status;
    const { job: updated } = await api<{ job: JobDto }>(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    onChange(updated);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-muted">
          {visible.length} shown · {direct} of {jobs.length} with a direct company link
        </span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />
          Direct company links only
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={hideDismissed} onChange={(e) => setHideDismissed(e.target.checked)} />
          Hide hidden jobs
        </label>
        <select className="input w-auto" value={publisher} onChange={(e) => setPublisher(e.target.value)}>
          <option value="">Listed on: any site</option>
          {publishers.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-panel">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Posted</th>
              <th className="px-3 py-2 font-medium">Apply</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((j) => (
              <tr key={j.id} className={`border-b border-line last:border-0 align-top ${j.status === "dismissed" ? "opacity-50" : ""}`}>
                <td className="px-3 py-2.5">
                  <ScorePill score={j.matchScore} />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                    {j.title}
                  </Link>
                  <div className="text-muted">
                    {j.company}
                    {j.salary ? ` · ${j.salary}` : ""}
                  </div>
                  {j.publishers.length > 0 && (
                    <div className="mt-0.5 text-xs text-muted" title={j.publishers.join(", ")}>
                      Listed on {j.publishers.slice(0, 4).join(", ")}
                      {j.publishers.length > 4 ? ` +${j.publishers.length - 4}` : ""}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {j.location}
                  {j.remote && !/remote/i.test(j.location) ? <div className="text-xs text-muted">Remote</div> : null}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted">{formatDate(j.postedAt)}</td>
                <td className="px-3 py-2.5">
                  {j.careerUrl ? (
                    <a href={j.careerUrl} target="_blank" rel="noreferrer" className="link font-medium">
                      Apply ↗
                    </a>
                  ) : (
                    <span className="text-muted">No link</span>
                  )}
                  <div className="mt-1">
                    <ConfidenceBadge value={j.careerConfidence} />
                  </div>
                  {j.careerConfidence === "board-only" && j.careersPageGuess && (
                    <a href={j.careersPageGuess} target="_blank" rel="noreferrer" className="link mt-1 block text-xs">
                      Company careers page ↗
                    </a>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {STATUS_ACTIONS.map((a) => (
                      <button
                        key={a.status}
                        onClick={() => setStatus(j, a.status)}
                        className={`rounded border px-1.5 py-0.5 text-xs ${
                          j.status === a.status ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  {j.status === "applied" && j.appliedAt && <div className="mt-1 text-xs text-muted">Applied {formatDate(j.appliedAt)}</div>}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No jobs to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
