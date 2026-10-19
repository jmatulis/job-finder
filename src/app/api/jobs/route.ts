import { NextResponse } from "next/server";
import { userStore } from "@/lib/auth";
import { errorResponse, parseJobFilter } from "@/lib/http";
import { listJobs } from "@/lib/repo";

export async function GET(req: Request) {
  try {
    return NextResponse.json({ jobs: await listJobs(await userStore(), parseJobFilter(new URL(req.url).searchParams)) });
  } catch (err) {
    return errorResponse(err);
  }
}
