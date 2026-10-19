import { NextResponse } from "next/server";
import { z } from "zod";
import { userStore } from "@/lib/auth";
import { errorResponse, idParam, notFound } from "@/lib/http";
import { getTailored, updateTailored } from "@/lib/repo";
import { ResumeSchema } from "@/lib/resume";

const Body = z.object({ resume: ResumeSchema });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await userStore();
    const id = idParam((await params).id);
    if (!id || !(await getTailored(s, id))) return notFound("Resume not found");
    await updateTailored(s, id, Body.parse(await req.json()).resume);
    return NextResponse.json({ tailored: await getTailored(s, id) });
  } catch (err) {
    return errorResponse(err);
  }
}
