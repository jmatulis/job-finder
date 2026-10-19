import { z } from "zod";
import { ResumeSchema } from "../resume";
import { generateJson } from "./client";

const ExtractionSchema = z.object({
  resume: ResumeSchema,
  keywords: z.array(z.string()),
  target_titles: z.array(z.string()),
  years_experience: z.number(),
});

export type ProfileExtraction = z.infer<typeof ExtractionSchema>;

const SYSTEM = `You convert resume text into structured data for a job-search tool.

Copy facts exactly as written. Do not add, infer or embellish employers, titles, dates, degrees, skills or achievements. If a field is absent, use an empty string or empty list. Keep each experience and project bullet as a separate list item, preserving its wording. Dates stay in the resume's own format ("Jan 2021", "2019", "Present").

Capture every section of the resume:
- Projects (personal, academic, open-source, freelance or portfolio work) go in projects, with name, role, date, link and bullets.
- Any other section that doesn't fit the named fields (volunteering, awards, publications, leadership, languages, interests…) goes in otherSections, with its heading as the title and one item per line.
Nothing on the resume should be left out.

Also suggest:
- keywords: 10-25 search keywords and hard skills that best describe this candidate for job matching (tools, technologies, domains, methods), taken from the resume.
- target_titles: 3-6 job titles this candidate is a strong fit for, based on their actual experience.
- years_experience: total years of professional experience, estimated from the dates.`;

export async function extractProfile(resumeText: string): Promise<ProfileExtraction> {
  return generateJson({
    schema: ExtractionSchema,
    system: SYSTEM,
    prompt: `<resume>\n${resumeText}\n</resume>`,
    effort: "low",
  });
}
