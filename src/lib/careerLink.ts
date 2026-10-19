import type { CareerConfidence } from "./types";
import type { NormalizedJob } from "./sources/types";

// Applicant tracking systems that host employers' own career sites.
export const ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "smartrecruiters.com",
  "icims.com",
  "jobvite.com",
  "workable.com",
  "bamboohr.com",
  "recruitee.com",
  "teamtailor.com",
  "taleo.net",
  "successfactors.com",
  "successfactors.eu",
  "oraclecloud.com",
  "breezy.hr",
  "jazzhr.com",
  "applytojob.com",
  "paylocity.com",
  "ultipro.com",
  "ukg.com",
  "adp.com",
  "rippling.com",
  "pinpointhq.com",
  "personio.de",
  "personio.com",
  "eightfold.ai",
  "avature.net",
];

// Aggregators and job boards: never treated as the employer's site, even if
// the upstream API flags a link as "direct".
export const JOB_BOARD_DOMAINS = [
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "jobsora.com",
  "jobleads.com",
  "adzuna.com",
  "adzuna.co.uk",
  "monster.com",
  "simplyhired.com",
  "talent.com",
  "careerbuilder.com",
  "dice.com",
  "google.com",
  "bebee.com",
  "jooble.org",
  "lensa.com",
  "builtin.com",
  "snagajob.com",
  "salary.com",
  "theladders.com",
  "wellfound.com",
  "jobright.ai",
  "learn4good.com",
  "teal.com",
  "tealhq.com",
  "recruit.net",
  "jobilize.com",
  "upwork.com",
  "virtualvocations.com",
  "flexjobs.com",
  "careerjet.com",
  "jobrapido.com",
  "neuvoo.com",
  "whatjobs.com",
];

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu"]);

export function hostOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** example.co.uk -> example.co.uk, jobs.example.com -> example.com */
export function baseDomain(host: string) {
  const labels = host.split(".");
  if (labels.length >= 3 && labels.at(-1)!.length === 2 && SECOND_LEVEL.has(labels.at(-2)!)) {
    return labels.slice(-3).join(".");
  }
  return labels.slice(-2).join(".");
}

const onDomain = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith("." + d));

export const isAtsUrl = (url: string) => {
  const h = hostOf(url);
  return !!h && onDomain(h, ATS_DOMAINS);
};

export const isBoardUrl = (url: string) => {
  const h = hostOf(url);
  return !!h && onDomain(h, JOB_BOARD_DOMAINS);
};

export function isEmployerUrl(url: string, companyWebsite?: string) {
  const h = hostOf(url);
  const site = hostOf(companyWebsite);
  if (!h || !site || onDomain(h, JOB_BOARD_DOMAINS)) return false;
  return baseDomain(h) === baseDomain(site);
}

export interface CareerLink {
  url: string | null;
  confidence: CareerConfidence;
  careersPageGuess?: string;
}

type LinkInput = Pick<NormalizedJob, "applyOptions" | "boardUrl" | "companyWebsite">;

/** Picks the best company-hosted link from what the APIs returned, without network access. */
export function pickCareerLink(job: LinkInput): CareerLink | null {
  const options = [...job.applyOptions].sort((a, b) => Number(b.isDirect) - Number(a.isDirect));
  const links = [...options.map((o) => o.link), job.boardUrl].filter((l): l is string => !!l);

  const ats = links.find(isAtsUrl);
  if (ats) return { url: ats, confidence: "direct-ats" };

  const employer = links.find((l) => isEmployerUrl(l, job.companyWebsite));
  if (employer) return { url: employer, confidence: "employer-domain" };

  const flagged = options.find((o) => o.isDirect && !isBoardUrl(o.link));
  if (flagged) return { url: flagged.link, confidence: "employer-domain" };

  return null;
}

export function careersPageGuess(companyWebsite?: string) {
  const h = hostOf(companyWebsite);
  return h ? `https://${h}/careers` : undefined;
}

async function finalUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) JobFinder/0.1" },
    });
    await res.body?.cancel();
    return res.url || null;
  } catch {
    return null;
  }
}

/**
 * Full resolution: API links first, then follow the board link's redirects
 * (many board "apply" links bounce to the employer's ATS), then fall back.
 */
export async function resolveCareerLink(
  job: LinkInput,
  opts: { follow: boolean; fetchFinalUrl?: (url: string) => Promise<string | null> } = { follow: true },
): Promise<CareerLink> {
  const picked = pickCareerLink(job);
  if (picked) return picked;

  const boardLink = job.boardUrl ?? job.applyOptions[0]?.link ?? null;
  if (opts.follow && boardLink) {
    const resolved = await (opts.fetchFinalUrl ?? finalUrl)(boardLink);
    if (resolved && resolved !== boardLink) {
      if (isAtsUrl(resolved)) return { url: resolved, confidence: "direct-ats" };
      if (isEmployerUrl(resolved, job.companyWebsite)) return { url: resolved, confidence: "employer-domain" };
    }
  }
  return { url: boardLink, confidence: "board-only", careersPageGuess: careersPageGuess(job.companyWebsite) };
}

export const CONFIDENCE_RANK: Record<CareerConfidence, number> = {
  "direct-ats": 2,
  "employer-domain": 1,
  "board-only": 0,
};
