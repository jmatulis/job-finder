import { describe, expect, it } from "vitest";
import { filterToQuery, mapGreenhouse } from "@/lib/sources/ats";
import { dedupeKey, mergeJobs } from "@/lib/sources";
import { mapJSearchJob } from "@/lib/sources/jsearch";
import type { NormalizedJob, SearchQuery } from "@/lib/sources/types";
import { htmlToText } from "@/lib/text";
import jsearchFixture from "./fixtures/jsearch.json";

const base: NormalizedJob = {
  source: "adzuna",
  sourceId: "1",
  title: "Data Analyst",
  company: "Acme, Inc.",
  location: "Chicago, IL",
  city: "Chicago",
  remote: false,
  description: "short",
  applyOptions: [{ publisher: "Adzuna", link: "https://www.adzuna.com/details/1", isDirect: false }],
  publishers: ["Adzuna"],
};

describe("mapJSearchJob", () => {
  it("normalizes salary, publishers and apply options", () => {
    const j = mapJSearchJob(jsearchFixture.data[0]);
    expect(j.salary).toBe("$70,000–$90,000 / year");
    expect(j.publishers).toEqual(["Indeed", "Jobsora", "Acme Careers"]);
    expect(j.applyOptions).toHaveLength(3);
  });
});

describe("dedupe", () => {
  it("treats company suffixes and punctuation as the same company", () => {
    const jsearch = mapJSearchJob(jsearchFixture.data[0]);
    expect(dedupeKey(base)).toBe(dedupeKey(jsearch));
  });

  it("merges apply options, publishers and keeps the longest description", () => {
    const jsearch = mapJSearchJob(jsearchFixture.data[0]);
    const [merged, ...rest] = mergeJobs([base, jsearch]);
    expect(rest).toHaveLength(0);
    expect(merged.sources).toEqual(["adzuna", "jsearch"]);
    expect(merged.publishers).toContain("Adzuna");
    expect(merged.publishers).toContain("Indeed");
    expect(merged.applyOptions).toHaveLength(4);
    expect(merged.description).toBe(jsearch.description);
    expect(merged.companyWebsite).toBe("https://www.acme.com");
  });
});

describe("ATS filtering", () => {
  const q: SearchQuery = { keywords: "data analyst", location: "", remote: false, datePosted: "all", country: "us", pages: 1, radiusMiles: 0 };
  const gh = (title: string, location: string) =>
    mapGreenhouse({ company: "Acme", ats: "greenhouse", slug: "acme" }, { id: 1, title, absolute_url: "https://boards.greenhouse.io/acme/jobs/1", location: { name: location }, content: "&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;" });

  it("keeps titles containing every keyword", () => {
    const jobs = [gh("Senior Data Analyst", "Chicago"), gh("Data Engineer", "Chicago")];
    expect(filterToQuery(jobs, q).map((j) => j.title)).toEqual(["Senior Data Analyst"]);
  });

  it("filters by location but keeps remote roles", () => {
    const jobs = [gh("Data Analyst", "Chicago, IL"), gh("Data Analyst", "Remote - US"), gh("Data Analyst", "Austin, TX")];
    expect(filterToQuery(jobs, { ...q, location: "Chicago" }).map((j) => j.location)).toEqual(["Chicago, IL", "Remote - US"]);
  });

  it("decodes escaped HTML descriptions", () => {
    expect(gh("x", "y").description).toBe("Hello & welcome");
    expect(htmlToText("<ul><li>One</li><li>Two</li></ul>")).toBe("• One\n• Two");
  });
});
