import { NextResponse } from "next/server";
import { z } from "zod";
import { userStore } from "@/lib/auth";
import { errorResponse, idParam, notFound } from "@/lib/http";
import { getJob, latestTailored, setJobStatus } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const s = await userStore();
    const id = idParam((await params).id);
    const job = id && (await getJob(s, id));
    if (!job) return notFound("Job not found");
    return NextResponse.json({ job, tailored: await latestTailored(s, job.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

const PatchBody = z.object({ status: z.enum(["new", "saved", "applied", "dismissed"]) });

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const s = await userStore();
    const id = idParam((await params).id);
    const job = id && (await setJobStatus(s, id, PatchBody.parse(await req.json()).status));
    if (!job) return notFound("Job not found");
    return NextResponse.json({ job });
  } catch (err) {
    return errorResponse(err);
  }
}
