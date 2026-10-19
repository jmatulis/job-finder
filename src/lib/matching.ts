import type { Profile } from "./resume";
import { normalize } from "./text";

export interface MatchInput {
  title: string;
  description: string;
  location: string;
  remote: boolean;
  postedAt?: string | null;
}

export interface MatchResult {
  score: number;
  matched: string[];
  requiredYears: number | null;
}

type MatchProfile = Pick<Profile, "keywords" | "targetTitles" | "locations" | "yearsExperience" | "remotePref"> & {
  skills: string[];
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-term match that also works for terms like "C++", "Node.js" or "CI/CD". */
export function containsTerm(haystack: string, term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRe(t)}($|[^a-z0-9])`, "i").test(haystack);
}

/** Smallest "N+ years" style requirement in the posting, if any. */
export function requiredYears(text: string): number | null {
  const re = /(\d{1,2})\s*(?:\+|plus)?\s*(?:-|–|to)?\s*(?:\d{1,2})?\s*\+?\s*years?/gi;
  let min: number | null = null;
  for (const m of text.matchAll(re)) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n <= 20 && (min === null || n < min)) min = n;
  }
  return min;
}

export function scoreJob(job: MatchInput, p: MatchProfile, now = Date.now()): MatchResult {
  const title = job.title.toLowerCase();
  const desc = job.description.toLowerCase();

  // 1. Keyword/skill coverage (50 pts). Title hits count triple.
  const terms = [...new Map([...p.keywords, ...p.skills].map((t) => [t.trim().toLowerCase(), t.trim()])).values()].filter(Boolean);
  const matched: string[] = [];
  let weight = 0;
  for (const term of terms) {
    if (containsTerm(title, term)) {
      matched.push(term);
      weight += 3;
    } else if (containsTerm(desc, term)) {
      matched.push(term);
      weight += 1;
    }
  }
  const keywordScore = terms.length ? Math.min(1, weight / Math.min(terms.length, 12)) : 0.5;

  // 2. Title fit (20 pts): share of words from the best-matching target title.
  const titleWords = new Set(normalize(job.title).split(" "));
  const titleScore = p.targetTitles.length
    ? Math.max(
        0,
        ...p.targetTitles.map((t) => {
          const words = normalize(t).split(" ").filter(Boolean);
          return words.length ? words.filter((w) => titleWords.has(w)).length / words.length : 0;
        }),
      )
    : 0.5;

  // 3. Experience fit (15 pts).
  const req = requiredYears(job.description);
  const expScore = req === null || p.yearsExperience >= req ? 1 : req - p.yearsExperience <= 2 ? 0.5 : 0;

  // 4. Location / remote fit (10 pts).
  let locScore: number;
  if (p.remotePref === "remote") locScore = job.remote ? 1 : 0.2;
  else if (job.remote) locScore = 1;
  else if (!p.locations.length) locScore = 0.6;
  else {
    const loc = normalize(job.location);
    locScore = p.locations.some((l) => {
      const city = normalize(l.split(",")[0]);
      return city && loc.includes(city);
    })
      ? 1
      : 0.2;
  }

  // 5. Recency (5 pts).
  let recency = 0.5;
  if (job.postedAt) {
    const days = (now - Date.parse(job.postedAt)) / 86_400_000;
    recency = days <= 7 ? 1 : days <= 30 ? 0.5 : 0.2;
  }

  const score = Math.round(50 * keywordScore + 20 * titleScore + 15 * expScore + 10 * locScore + 5 * recency);
  return { score, matched, requiredYears: req };
}
