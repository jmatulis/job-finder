import { NextResponse } from "next/server";
import { extractProfile } from "@/lib/ai/profile";
import { userStore } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { extractResumeText } from "@/lib/resumeText";

// Parses an uploaded resume into a draft profile. Nothing is saved until the
// user reviews it and PUTs /api/profile.
export async function POST(req: Request) {
  try {
    await userStore(); // signed-in users only: this spends Claude credits
    const form = await req.formData();
    const file = form.get("file");
    const pasted = form.get("text");
    let rawText = "";
    if (file instanceof File && file.size > 0) rawText = await extractResumeText(file);
    else if (typeof pasted === "string") rawText = pasted.trim();
    if (rawText.length < 50) {
      return NextResponse.json({ error: "Could not read enough text from the resume. If it is a scanned PDF, paste the text instead." }, { status: 400 });
    }
    const extraction = await extractProfile(rawText);
    return NextResponse.json({
      rawText,
      resume: extraction.resume,
      keywords: extraction.keywords,
      targetTitles: extraction.target_titles,
      yearsExperience: extraction.years_experience,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
