import { NextResponse } from "next/server";
import { tailorResume, type ResumeSource } from "@/lib/ai/tailor";
import { userStore } from "@/lib/auth";
import { errorResponse, idParam, notFound } from "@/lib/http";
import { getJob, getProfile, saveTailored, setJobDescription } from "@/lib/repo";
import { extractResumeText } from "@/lib/resumeText";

// Multipart form with optional fields:
//   file        – a resume to tailor instead of the saved profile resume
//   description – the full posting text, for sources that only return a snippet
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await userStore();
    const id = idParam((await params).id);
    let job = id && (await getJob(s, id));
    if (!job) return notFound("Job not found");

    const form = await req.formData();
    const file = form.get("file");
    const description = String(form.get("description") ?? "").trim();

    let source: ResumeSource;
    if (file instanceof File && file.size > 0) {
      const text = await extractResumeText(file);
      if (text.length < 50) {
        return NextResponse.json({ error: "Could not read enough text from that file. If it's a scanned PDF, upload a DOCX or text version." }, { status: 400 });
      }
      source = { text };
    } else {
      const profile = await getProfile(s);
      if (!profile?.resume) {
        return NextResponse.json({ error: "Upload a resume above, or save one on the Profile page first." }, { status: 400 });
      }
      source = { resume: profile.resume };
    }

    if (description.length > job.description.length) {
      await setJobDescription(s, job.id, description);
      job = (await getJob(s, job.id))!;
    }
    if (job.description.length < 200) {
      return NextResponse.json(
        { error: "This listing only has a short description, which is not enough to tailor against. Open the apply link, copy the full posting and paste it into the box." },
        { status: 400 },
      );
    }

    const result = await tailorResume(source, job);
    const tailored = await saveTailored(s, {
      jobId: job.id,
      resume: result.resume,
      changes: result.changes,
      missingKeywords: result.missing_keywords,
      source: "text" in source ? "upload" : "profile",
    });
    return NextResponse.json({ tailored, job });
  } catch (err) {
    return errorResponse(err);
  }
}
