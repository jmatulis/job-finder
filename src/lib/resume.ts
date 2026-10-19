import { z } from "zod";

// Shared shape for the base resume (profile) and every tailored version.
export const ResumeSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()),
  }),
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      field: z.string(),
      end: z.string(),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      date: z.string(),
      link: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()),
  certifications: z.array(z.string()),
  // Anything else on the resume (volunteering, awards, publications…), so nothing is dropped.
  otherSections: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
});

export type Resume = z.infer<typeof ResumeSchema>;

export const emptyResume = (): Resume => ({
  contact: { name: "", email: "", phone: "", location: "", links: [] },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  otherSections: [],
});

/** Fills sections added after a resume was saved (e.g. projects) with empty defaults. */
export function withResumeDefaults(r: Partial<Resume> | null | undefined): Resume {
  const base = emptyResume();
  return { ...base, ...r, contact: { ...base.contact, ...r?.contact } };
}

export type RemotePref = "any" | "remote" | "onsite";

export interface Profile {
  rawText: string;
  resume: Resume;
  keywords: string[];
  targetTitles: string[];
  locations: string[];
  yearsExperience: number;
  remotePref: RemotePref;
}

export function resumeFileName(resume: Resume, company: string, title: string, ext: string) {
  const part = (s: string) =>
    s
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const name = part(resume.contact.name) || "Resume";
  return [name, part(company), part(title)].filter(Boolean).join("_").slice(0, 120) + "." + ext;
}
