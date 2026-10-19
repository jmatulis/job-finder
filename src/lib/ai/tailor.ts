import { z } from "zod";
import { ResumeSchema, type Resume } from "../resume";
import { generateJson } from "./client";

const TailorSchema = z.object({
  resume: ResumeSchema,
  changes: z.array(z.string()),
  missing_keywords: z.array(z.string()),
});

export type TailorResult = z.infer<typeof TailorSchema>;

const SYSTEM = `You lightly adjust a candidate's resume for one job posting. The result must still read as the candidate's own resume: plain, concise and factual. It is a light edit, not a rewrite.

Edits you may make:
- Reorder bullets within each role and project, reorder the projects, and reorder the skills list, so what matters for this posting comes first.
- Make a small wording change to a bullet only when it makes a real, existing match clearer, for example using the posting's name for a tool or practice the bullet already describes. Most bullets should stay word-for-word.
- Drop a few bullets or skills that are clearly irrelevant to this role, keeping at least two bullets per role. You may drop a project only if it is clearly unrelated and the resume has several others. Never make the resume longer.
- Projects are often the strongest evidence for a posting, especially for career changers and early-career candidates. Treat them like experience: keep the relevant ones, put the most relevant first, and apply the same wording rules.
- Summary: one or two plain sentences built from the original. If the original has a summary, change it as little as possible. If there is none, write one only from facts in the resume.

Hard rules:
- Every statement must be supported by the original resume. Never add or alter employers, job titles, dates, locations, schools, degrees, certifications, numbers or metrics, and never add a skill or tool that isn't already there.
- No filler or buzzwords: avoid words like "results-driven", "passionate", "dynamic", "proven track record", "spearheaded", "leveraged", "synergy", "cutting-edge", "seamlessly", "robust". Don't add adjectives or intensifiers the original doesn't have.
- Keep contact details, education and every entry in otherSections exactly as given. Keep project names, roles, dates and links exactly as given.
- When the original resume is given as text, carry every role, project, bullet and section across into the structure faithfully, with the same wording apart from the edits above. Projects go in projects; any section without a named field goes in otherSections under its original heading.

Also return:
- changes: one short line per edit you made (at most 8). Say "No wording changes" if you only reordered.
- missing_keywords: requirements from the posting that the resume does not show. Leave them out of the resume; the candidate decides whether they apply.`;

export type ResumeSource = { resume: Resume } | { text: string };

export async function tailorResume(source: ResumeSource, job: { title: string; company: string; description: string }): Promise<TailorResult> {
  const original =
    "resume" in source
      ? `<original_resume format="json">\n${JSON.stringify(source.resume, null, 2)}\n</original_resume>`
      : `<original_resume format="text">\n${source.text}\n</original_resume>`;
  return generateJson({
    schema: TailorSchema,
    system: SYSTEM,
    prompt: `<job_posting>
<title>${job.title}</title>
<company>${job.company}</company>
<description>
${job.description}
</description>
</job_posting>

${original}`,
    effort: "medium",
  });
}
