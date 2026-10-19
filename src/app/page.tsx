import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfidenceBadge, formatDate, ScorePill } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getProfile, jobCounts, listJobs, recentSearches } from "@/lib/repo";
import { storeFor } from "@/lib/store";

export const dynamic = "force-dynamic";

const KEYS = [
  ["Anthropic (resume tailoring)", "ANTHROPIC_API_KEY"],
  ["JSearch (Indeed, LinkedIn, Glassdoor, Jobsora, JobLeads…)", "RAPIDAPI_KEY"],
  ["Adzuna", "ADZUNA_APP_ID"],
] as const;

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const s = await storeFor(user.uid);
  const [profile, counts, savedAll, searches] = await Promise.all([getProfile(s), jobCounts(s), listJobs(s, { status: "saved" }), recentSearches(s)]);
  const saved = savedAll.slice(0, 8);
  const missingKeys = KEYS.filter(([, env]) => !process.env[env]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted">Search for roles, collect direct application links, and tailor your resume for each one.</p>
      </div>

      {missingKeys.length > 0 && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          <strong>Missing API keys:</strong> {missingKeys.map(([name, env]) => `${name} (${env})`).join(", ")}. Add them to{" "}
          <code>.env.local</code> and restart the server. See the README for signup links.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="panel">
          <div className="label">Profile</div>
          {profile ? (
            <>
              <div className="font-medium">{profile.resume.contact.name || "Saved"}</div>
              <Link href="/profile" className="link text-sm">
                Edit profile
              </Link>
            </>
          ) : (
            <Link href="/profile" className="link font-medium">
              Upload your resume →
            </Link>
          )}
        </div>
        {(
          [
            ["New", counts.new ?? 0, "/jobs?status=new"],
            ["Saved", counts.saved ?? 0, "/jobs?status=saved"],
            ["Applied", counts.applied ?? 0, "/jobs?status=applied"],
          ] as const
        ).map(([label, n, href]) => (
          <Link key={label} href={href} className="panel hover:border-muted">
            <div className="label">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">{n}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Saved jobs</h2>
            <Link href="/jobs?status=saved" className="link text-sm">
              See all
            </Link>
          </div>
          <div className="panel divide-y divide-line p-0">
            {saved.length === 0 && <p className="p-5 text-sm text-muted">Nothing saved yet. Run a search and save the jobs you like.</p>}
            {saved.map((j) => (
              <div key={j.id} className="flex items-center gap-3 px-4 py-3">
                <ScorePill score={j.matchScore} />
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${j.id}`} className="block truncate font-medium hover:underline">
                    {j.title}
                  </Link>
                  <div className="truncate text-sm text-muted">
                    {j.company} · {j.location}
                  </div>
                </div>
                <ConfidenceBadge value={j.careerConfidence} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Recent searches</h2>
          <div className="panel divide-y divide-line p-0">
            {searches.length === 0 && (
              <p className="p-5 text-sm text-muted">
                No searches yet.{" "}
                <Link href="/search" className="link">
                  Start one
                </Link>
                .
              </p>
            )}
            {searches.map((s) => (
              <Link key={s.id} href={`/search?id=${s.id}`} className="block px-4 py-3 hover:bg-bg">
                <div className="font-medium">{String(s.query.keywords ?? "")}</div>
                <div className="text-sm text-muted">
                  {[s.query.location, s.query.remote ? "remote" : null].filter(Boolean).join(" · ") || "Any location"} · {s.resultCount} jobs ·{" "}
                  {formatDate(s.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
