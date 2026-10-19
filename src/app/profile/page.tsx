"use client";

import { useEffect, useState } from "react";
import { ResumeEditor } from "@/components/ResumeEditor";
import { api, ErrorBox } from "@/components/ui";
import { emptyResume, type Profile } from "@/lib/resume";

type ParseResult = Pick<Profile, "rawText" | "resume" | "keywords" | "targetTitles" | "yearsExperience">;

const blank = (): Profile => ({
  rawText: "",
  resume: emptyResume(),
  keywords: [],
  targetTitles: [],
  locations: [],
  yearsExperience: 0,
  remotePref: "any",
});

const commaList = (s: string) => s.split(",").map((l) => l.trim()).filter(Boolean);

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState<"parse" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api<{ profile: Profile | null }>("/api/profile")
      .then((r) => setProfile(r.profile))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  async function parse() {
    setBusy("parse");
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      else form.set("text", pasted);
      const r = await api<ParseResult>("/api/profile/parse", { method: "POST", body: form });
      setProfile((prev) => ({ ...(prev ?? blank()), ...r }));
      setNotice("Resume read. Review everything below, then save.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!profile) return;
    setBusy("save");
    setError(null);
    try {
      const r = await api<{ profile: Profile }>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });
      setProfile(r.profile);
      setNotice("Profile saved. Match scores for stored jobs were updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const update = (patch: Partial<Profile>) => setProfile((p) => ({ ...(p ?? blank()), ...patch }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted">Your base resume and search preferences. Tailored resumes are built from this, and never add anything that isn&apos;t here.</p>
      </div>

      <section className="panel space-y-3">
        <h2 className="font-semibold">{profile ? "Replace from a resume file" : "Start from your resume"}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <span className="text-sm text-muted">or paste the text:</span>
        </div>
        <textarea
          className="input min-h-24"
          placeholder="Paste resume text here (used when no file is chosen)"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <button className="btn btn-primary" onClick={parse} disabled={busy !== null || (!file && pasted.trim().length < 50)}>
          {busy === "parse" ? "Reading resume with Claude…" : "Read resume"}
        </button>
      </section>

      <ErrorBox message={error} />
      {notice && <div className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">{notice}</div>}

      {loaded && profile && (
        <>
          <section className="panel space-y-4">
            <h2 className="font-semibold">Search preferences</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Keywords and skills to match (comma-separated)</span>
                <textarea
                  className="input min-h-20"
                  defaultValue={profile.keywords.join(", ")}
                  key={profile.keywords.join(",")}
                  onBlur={(e) => update({ keywords: commaList(e.target.value) })}
                />
              </label>
              <label>
                <span className="label">Target job titles (comma-separated)</span>
                <textarea
                  className="input min-h-20"
                  defaultValue={profile.targetTitles.join(", ")}
                  key={profile.targetTitles.join(",")}
                  onBlur={(e) => update({ targetTitles: commaList(e.target.value) })}
                />
              </label>
              <label>
                <span className="label">Preferred locations (comma-separated cities)</span>
                <input
                  className="input"
                  defaultValue={profile.locations.join(", ")}
                  key={profile.locations.join(",")}
                  onBlur={(e) => update({ locations: commaList(e.target.value) })}
                  placeholder="Chicago, New York"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="label">Years of experience</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={60}
                    value={profile.yearsExperience}
                    onChange={(e) => update({ yearsExperience: Number(e.target.value) || 0 })}
                  />
                </label>
                <label>
                  <span className="label">Work arrangement</span>
                  <select className="input" value={profile.remotePref} onChange={(e) => update({ remotePref: e.target.value as Profile["remotePref"] })}>
                    <option value="any">Any</option>
                    <option value="remote">Remote only</option>
                    <option value="onsite">On-site / hybrid</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="mb-4 font-semibold">Base resume</h2>
            <ResumeEditor value={profile.resume} onChange={(resume) => update({ resume })} />
          </section>

          <div className="sticky bottom-4 flex justify-end">
            <button className="btn btn-primary shadow-lg" onClick={save} disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save profile"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
