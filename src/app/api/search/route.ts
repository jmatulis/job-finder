import { NextResponse } from "next/server";
import { z } from "zod";
import { userStore } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { listJobs, listWatchlist, recordSearch, upsertJobs } from "@/lib/repo";
import { runSearch } from "@/lib/sources";

const SearchBody = z.object({
  keywords: z.string().trim().min(1, "Enter at least one keyword"),
  location: z.string().trim().default(""),
  radiusMiles: z.number().int().min(0).max(500).default(0),
  remote: z.boolean().default(false),
  datePosted: z.enum(["all", "today", "3days", "week", "month"]).default("month"),
  country: z.string().trim().toLowerCase().length(2).default("us"),
  pages: z.number().int().min(1).max(5).default(2),
});

export async function POST(req: Request) {
  try {
    const s = await userStore();
    const q = SearchBody.parse(await req.json());
    const { jobs, report } = await runSearch(q, await listWatchlist(s));
    const searchId = await recordSearch(s, q, jobs.length, report);
    await upsertJobs(s, jobs, searchId);
    return NextResponse.json({ searchId, report, jobs: await listJobs(s, { searchId }) });
  } catch (err) {
    return errorResponse(err);
  }
}
