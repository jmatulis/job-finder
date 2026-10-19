"use client";

import { useEffect, useState } from "react";
import { api, ErrorBox } from "@/components/ui";

interface Entry {
  id: number;
  company: string;
  ats: "greenhouse" | "lever" | "ashby";
  slug: string;
}

const BOARD_URL: Record<Entry["ats"], (slug: string) => string> = {
  greenhouse: (s) => `https://job-boards.greenhouse.io/${s}`,
  lever: (s) => `https://jobs.lever.co/${s}`,
  ashby: (s) => `https://jobs.ashbyhq.com/${s}`,
};

/** Accepts a pasted board URL and works out the ATS and slug. */
function fromUrl(input: string): { ats: Entry["ats"]; slug: string } | null {
  const m =
    input.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([A-Za-z0-9._-]+)/) ??
    input.match(/lever\.co\/([A-Za-z0-9._-]+)/) ??
    input.match(/ashbyhq\.com\/([A-Za-z0-9._-]+)/);
  if (!m) return null;
  const ats = input.includes("greenhouse") ? "greenhouse" : input.includes("lever") ? "lever" : "ashby";
  return { ats, slug: m[1] };
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [company, setCompany] = useState("");
  const [ats, setAts] = useState<Entry["ats"]>("greenhouse");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api<{ watchlist: Entry[] }>("/api/watchlist").then((r) => setEntries(r.watchlist));
  }, []);

  function onSlug(v: string) {
    const parsed = fromUrl(v);
    if (parsed) {
      setAts(parsed.ats);
      setSlug(parsed.slug);
      if (!company) setCompany(parsed.slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    } else setSlug(v);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await api<{ entry: Entry; openings: number }>("/api/watchlist", { method: "POST", body: JSON.stringify({ company, ats, slug }) });
      setEntries((cur) => [...cur, r.entry].sort((a, b) => a.company.localeCompare(b.company)));
      setNotice(`Added ${r.entry.company}: ${r.openings} open roles on their board right now.`);
      setCompany("");
      setSlug("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await api(`/api/watchlist?id=${id}`, { method: "DELETE" });
    setEntries((cur) => cur.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company watchlist</h1>
        <p className="mt-1 text-muted">
          Companies you want to work for. Every search also checks their Greenhouse, Lever or Ashby career board directly, so these links always go
          to the company&apos;s own site.
        </p>
      </div>

      <form onSubmit={add} className="panel grid gap-4 sm:grid-cols-12">
        <label className="sm:col-span-5">
          <span className="label">Board URL or slug</span>
          <input
            className="input"
            value={slug}
            onChange={(e) => onSlug(e.target.value)}
            placeholder="https://jobs.lever.co/acme or acme"
            required
          />
        </label>
        <label className="sm:col-span-2">
          <span className="label">System</span>
          <select className="input" value={ats} onChange={(e) => setAts(e.target.value as Entry["ats"])}>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
        </label>
        <label className="sm:col-span-3">
          <span className="label">Company name</span>
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} required />
        </label>
        <div className="flex items-end sm:col-span-2">
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Checking…" : "Add"}
          </button>
        </div>
      </form>

      <ErrorBox message={error} />
      {notice && <div className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">{notice}</div>}

      <div className="panel divide-y divide-line p-0">
        {entries.length === 0 && (
          <p className="p-5 text-sm text-muted">
            No companies yet. Open a company&apos;s careers page; if the job links go to greenhouse.io, lever.co or ashbyhq.com, paste that URL above.
          </p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="font-medium">{e.company}</div>
              <a href={BOARD_URL[e.ats](e.slug)} target="_blank" rel="noreferrer" className="link text-sm">
                {e.ats} / {e.slug} ↗
              </a>
            </div>
            <button className="btn text-danger" onClick={() => remove(e.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
