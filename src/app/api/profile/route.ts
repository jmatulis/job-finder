import { NextResponse } from "next/server";
import { z } from "zod";
import { userStore } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { getProfile, saveProfile } from "@/lib/repo";
import { ResumeSchema } from "@/lib/resume";

const ProfileBody = z.object({
  rawText: z.string().default(""),
  resume: ResumeSchema,
  keywords: z.array(z.string()),
  targetTitles: z.array(z.string()),
  locations: z.array(z.string()),
  yearsExperience: z.number().min(0).max(60),
  remotePref: z.enum(["any", "remote", "onsite"]),
});

export async function GET() {
  try {
    return NextResponse.json({ profile: await getProfile(await userStore()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const s = await userStore();
    await saveProfile(s, ProfileBody.parse(await req.json()));
    return NextResponse.json({ profile: await getProfile(s) });
  } catch (err) {
    return errorResponse(err);
  }
}
