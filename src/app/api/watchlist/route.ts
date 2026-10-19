import { NextResponse } from "next/server";
import { z } from "zod";
import { userStore } from "@/lib/auth";
import { errorResponse, idParam } from "@/lib/http";
import { addWatchlist, listWatchlist, removeWatchlist } from "@/lib/repo";
import { fetchCompanyJobs } from "@/lib/sources/ats";

const Entry = z.object({
  company: z.string().trim().min(1),
  ats: z.enum(["greenhouse", "lever", "ashby"]),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Za-z0-9._-]+$/, "Use only the board name from the URL, e.g. 'stripe'"),
});

export async function GET() {
  try {
    return NextResponse.json({ watchlist: await listWatchlist(await userStore()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const s = await userStore();
    const entry = Entry.parse(await req.json());
    // Check the board exists before saving it.
    let openings: number;
    try {
      openings = (await fetchCompanyJobs(entry)).length;
    } catch (err) {
      return NextResponse.json({ error: `Could not load that ${entry.ats} board: ${(err as Error).message}` }, { status: 400 });
    }
    return NextResponse.json({ entry: await addWatchlist(s, entry), openings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const s = await userStore();
    const id = idParam(new URL(req.url).searchParams.get("id") ?? "");
    if (id) await removeWatchlist(s, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
