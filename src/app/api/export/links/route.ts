import { userStore } from "@/lib/auth";
import { errorResponse, parseJobFilter } from "@/lib/http";
import { listJobs } from "@/lib/repo";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Prefix formula-like values so spreadsheets don't execute them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  let jobs;
  try {
    jobs = await listJobs(await userStore(), parseJobFilter(new URL(req.url).searchParams));
  } catch (err) {
    return errorResponse(err);
  }
  const header = ["Score", "Title", "Company", "Location", "Remote", "Salary", "Posted", "Career site apply link", "Link type", "Careers page guess", "Job board link", "Listed on", "Status", "Applied on"];
  const rows = jobs.map((j) => [
    j.matchScore,
    j.title,
    j.company,
    j.location,
    j.remote ? "yes" : "no",
    j.salary,
    j.postedAt?.slice(0, 10),
    j.careerUrl,
    j.careerConfidence,
    j.careersPageGuess,
    j.boardUrl,
    j.publishers.join("; "),
    j.status,
    j.appliedAt?.slice(0, 10),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${date}.csv"`,
    },
  });
}
