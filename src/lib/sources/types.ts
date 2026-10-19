export type SourceName = "jsearch" | "adzuna" | "greenhouse" | "lever" | "ashby";

export interface ApplyOption {
  publisher: string;
  link: string;
  isDirect: boolean;
}

export interface NormalizedJob {
  source: SourceName;
  sourceId: string;
  title: string;
  company: string;
  companyWebsite?: string;
  location: string;
  city?: string;
  remote: boolean;
  salary?: string;
  description: string;
  postedAt?: string; // ISO date
  boardUrl?: string;
  applyOptions: ApplyOption[];
  publishers: string[];
}

export type DatePosted = "all" | "today" | "3days" | "week" | "month";

export interface SearchQuery {
  keywords: string;
  location: string;
  remote: boolean;
  datePosted: DatePosted;
  country: string; // ISO 3166 alpha-2, lower case
  pages: number;
  /** Search radius around `location` in miles; 0 leaves it to each source's default. */
  radiusMiles: number;
}

export const milesToKm = (mi: number) => Math.round(mi * 1.609);

export interface SourceReport {
  source: string;
  count: number;
  error?: string;
  skipped?: boolean;
  note?: string;
}

export class MissingKeyError extends Error {}
