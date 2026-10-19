import type { RemotePref, Resume } from "./resume";

export type CareerConfidence = "direct-ats" | "employer-domain" | "board-only";
export type JobStatus = "new" | "saved" | "applied" | "dismissed";

export interface JobDto {
  id: string;
  dedupeKey: string;
  title: string;
  company: string;
  companyWebsite: string | null;
  location: string;
  remote: boolean;
  salary: string | null;
  description: string;
  postedAt: string | null;
  sources: string[];
  publishers: string[];
  boardUrl: string | null;
  careerUrl: string | null;
  careerConfidence: CareerConfidence;
  careersPageGuess: string | null;
  matchScore: number;
  matchedKeywords: string[];
  status: JobStatus;
  appliedAt: string | null;
  lastSearchId: string | null;
  firstSeenAt: string;
  updatedAt: string;
}

export interface SearchDoc {
  id: string;
  query: Record<string, unknown>;
  resultCount: number;
  report: unknown[];
  createdAt: string;
}

export interface WatchlistDoc {
  id: string;
  company: string;
  ats: "greenhouse" | "lever" | "ashby";
  slug: string;
}

export interface TailoredDto {
  id: string;
  jobId: string;
  resume: Resume;
  changes: string[];
  missingKeywords: string[];
  source: "profile" | "upload";
  createdAt: string;
}

export interface ProfileDoc {
  id: "main";
  rawText: string;
  resume: Resume;
  keywords: string[];
  targetTitles: string[];
  locations: string[];
  yearsExperience: number;
  remotePref: RemotePref;
  updatedAt: string;
}
