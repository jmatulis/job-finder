import { userStore } from "@/lib/auth";
import { errorResponse, idParam, notFound } from "@/lib/http";
import { renderResumeDocx } from "@/lib/render/docx";
import { renderResumePdf } from "@/lib/render/pdf";
import { getJob, getTailored } from "@/lib/repo";
import { resumeFileName } from "@/lib/resume";

const TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await userStore();
    const id = idParam((await params).id);
    const tailored = id && (await getTailored(s, id));
    if (!tailored) return notFound("Resume not found");
    const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
    const job = await getJob(s, tailored.jobId);
    const buf = format === "pdf" ? await renderResumePdf(tailored.resume) : await renderResumeDocx(tailored.resume);
    const name = resumeFileName(tailored.resume, job?.company ?? "", job?.title ?? "", format);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[format],
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
