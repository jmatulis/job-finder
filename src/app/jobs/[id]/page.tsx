"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ResumeEditor } from "@/components/ResumeEditor";
import { ResumePreview } from "@/components/ResumePreview";
import { api, ConfidenceBadge, ErrorBox, formatDate, ScorePill } from "@/components/ui";
import type { Resume } from "@/lib/resume";
import type { JobDto, JobStatus, TailoredDto } from "@/lib/types";

const STATUS_BUTTONS: { status: JobStatus; label: string; active: string }[] = [
  { status: "saved", label: "Save", active: "Saved" },
  { status: "applied", label: "Mark as applied", active: "Applied ✓" },
  { status: "dismissed", label: "Hide", active: "Hidden" },
];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDto | null>(null);
  const [tailored, setTailored] = useState<TailoredDto | null>(null);
  const [draft, setDraft] = useState<Resume | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fullText, setFullText] = useState("");
  const [busy, setBusy] = useState<"tailor" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    api<{ job: JobDto; tailored: TailoredDto | null }>(`/api/jobs/${id}`)
      .then((r) => {
        setJob(r.job);
        setTailored(r.tailored);
        setDraft(r.tailored?.resume ?? null);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function tailor() {
    setBusy("tailor");
    setError(null);
    try {
      const form = new FormData();
      if (resumeFile) form.set("file", resumeFile);
      if (fullText.trim()) form.set("description", fullText);
      const r = await api<{ tailored: TailoredDto; job: JobDto }>(`/api/jobs/${id}/tailor`, { method: "POST", body: form });
      setTailored(r.tailored);
      setDraft(r.tailored.resume);
      setJob(r.job);
      setMode("preview");
      setFullText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    if (!tailored || !draft) return;
    setBusy("save");
    try {
      const r = await api<{ tailored: TailoredDto }>(`/api/resumes/${tailored.id}`, { method: "PUT", body: JSON.stringify({ resume: draft }) });
      setTailored(r.tailored);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: JobStatus) {
    const r = await api<{ job: JobDto }>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setJob(r.job);
  }

  if (!job) return error ? <ErrorBox message={error} /> : <p className="text-muted">Loading…</p>;

  const dirty = !!tailored && JSON.stringify(draft) !== JSON.stringify(tailored.resume);
  const shortDescription = job.description.length < 1000;

  return (
    <div className="space-y-6">
      <Link href="/jobs" className="link text-sm">
        ← All jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-muted">
            {job.company} · {job.location}
            {job.remote && !/remote/i.test(job.location) ? " · Remote" : ""}
            {job.salary ? ` · ${job.salary}` : ""}
            {job.postedAt ? ` · posted ${formatDate(job.postedAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Match</span>
          <ScorePill score={job.matchScore} />
        </div>
      </div>

      <section className="panel space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {job.careerUrl && (
            <a href={job.careerUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              Apply on {job.careerConfidence === "board-only" ? "job board" : "company site"} ↗
            </a>
          )}
          <ConfidenceBadge value={job.careerConfidence} />
          {job.careerConfidence === "board-only" && job.careersPageGuess && (
            <a href={job.careersPageGuess} target="_blank" rel="noreferrer" className="link text-sm">
              Try the company careers page ↗
            </a>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {STATUS_BUTTONS.map((b) => (
              <button key={b.status} onClick={() => setStatus(job.status === b.status ? "new" : b.status)} className={`btn text-xs ${job.status === b.status ? "btn-primary" : ""}`}>
                {job.status === b.status ? b.active : b.label}
              </button>
            ))}
          </div>
        </div>
        {job.status === "applied" && job.appliedAt && (
          <div className="text-sm text-accent">Applied on {new Date(job.appliedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        )}
        <div className="break-all text-xs text-muted">{job.careerUrl}</div>
        {job.publishers.length > 0 && <div className="text-sm text-muted">Listed on: {job.publishers.join(", ")}</div>}
        {job.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.matchedKeywords.map((k) => (
              <span key={k} className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">
                {k}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="panel space-y-4">
        <h2 className="font-semibold">Tailor a resume for this job</h2>
        <p className="text-sm text-muted">
          Makes small, honest edits: it reorders bullets and skills toward this posting and tweaks wording only where you already have the
          experience. Nothing is invented, and buzzwords are kept out.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label">Resume to start from</span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="text-sm" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
            <span className="mt-1 block text-xs text-muted">
              {resumeFile ? `Using ${resumeFile.name}` : "No file chosen: your saved profile resume will be used."}
            </span>
          </label>
          {shortDescription && (
            <label className="block">
              <span className="label">Full job posting (optional; this listing looks short)</span>
              <textarea className="input min-h-20" value={fullText} onChange={(e) => setFullText(e.target.value)} placeholder="Paste the posting from the apply page" />
            </label>
          )}
        </div>
        <button className="btn btn-primary" onClick={tailor} disabled={busy !== null}>
          {busy === "tailor" ? "Tailoring with Claude… (about 30–60s)" : tailored ? "Tailor again" : "Create tailored resume"}
        </button>
        <ErrorBox message={error} />
      </section>

      {tailored && draft && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-semibold">Your tailored resume</h2>
            <div className="flex overflow-hidden rounded-md border border-line text-sm">
              {(["preview", "edit"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 ${mode === m ? "bg-accent text-accent-fg" : "bg-panel text-muted"}`}>
                  {m === "preview" ? "Preview" : "Edit"}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {dirty && (
                <button className="btn" onClick={saveDraft} disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : "Save edits"}
                </button>
              )}
              <a className={`btn ${dirty ? "pointer-events-none opacity-50" : ""}`} href={`/api/resumes/${tailored.id}/export?format=pdf`}>
                Download PDF
              </a>
              <a className={`btn ${dirty ? "pointer-events-none opacity-50" : ""}`} href={`/api/resumes/${tailored.id}/export?format=docx`}>
                Download Word
              </a>
            </div>
          </div>
          {dirty ? <p className="text-xs text-warn">You have unsaved edits. Save them before downloading.</p> : savedAt && <p className="text-xs text-muted">Saved {savedAt}</p>}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">{mode === "preview" ? <ResumePreview resume={draft} /> : <div className="panel"><ResumeEditor value={draft} onChange={setDraft} /></div>}</div>
            <aside className="space-y-5">
              <div className="panel">
                <h3 className="label">What changed</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {tailored.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">Based on your {tailored.source === "upload" ? "uploaded resume" : "profile resume"} · {formatDate(tailored.createdAt)}</p>
              </div>
              <div className="panel">
                <h3 className="label">Asked for but not on your resume</h3>
                {tailored.missingKeywords.length ? (
                  <div className="flex flex-wrap gap-1">
                    {tailored.missingKeywords.map((k) => (
                      <span key={k} className="rounded bg-warn-soft px-1.5 py-0.5 text-xs text-warn">
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Nothing major.</p>
                )}
                <p className="mt-2 text-xs text-muted">Left out on purpose. Add any of these yourself only if they&apos;re true.</p>
              </div>
            </aside>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="mb-3 font-semibold">Job description</h2>
        <div className="max-h-[60vh] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">{job.description || "No description available."}</div>
      </section>
    </div>
  );
}
