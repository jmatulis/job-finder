import { describe, expect, it } from "vitest";
import { baseDomain, isAtsUrl, pickCareerLink, resolveCareerLink } from "@/lib/careerLink";
import { mapJSearchJob } from "@/lib/sources/jsearch";
import jsearchFixture from "./fixtures/jsearch.json";

const jobs = jsearchFixture.data.map(mapJSearchJob);
const byId = (id: string) => jobs.find((j) => j.sourceId === id)!;

describe("baseDomain", () => {
  it("strips subdomains", () => {
    expect(baseDomain("careers.acme.com")).toBe("acme.com");
    expect(baseDomain("jobs.acme.co.uk")).toBe("acme.co.uk");
  });
});

describe("isAtsUrl", () => {
  it("recognises ATS hosts including subdomains", () => {
    expect(isAtsUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isAtsUrl("https://acme.wd5.myworkdayjobs.com/en-US/External/job/123")).toBe(true);
    expect(isAtsUrl("https://www.indeed.com/viewjob?jk=1")).toBe(false);
    expect(isAtsUrl("https://notgreenhouse.io/x")).toBe(false);
  });
});

describe("pickCareerLink", () => {
  it("prefers an ATS link over board links", () => {
    expect(pickCareerLink(byId("ats"))).toEqual({
      url: "https://acme.wd1.myworkdayjobs.com/External/job/Chicago/Data-Analyst_R123",
      confidence: "direct-ats",
    });
  });

  it("matches links on the employer's own domain", () => {
    expect(pickCareerLink(byId("employer"))).toEqual({
      url: "https://careers.globex.com/jobs/4567",
      confidence: "employer-domain",
    });
  });

  it("does not trust an is_direct flag on a job board", () => {
    expect(pickCareerLink(byId("board"))).toBeNull();
  });
});

describe("resolveCareerLink", () => {
  it("follows board redirects to an ATS", async () => {
    const link = await resolveCareerLink(byId("board"), {
      follow: true,
      fetchFinalUrl: async () => "https://jobs.lever.co/initech/abc-123",
    });
    expect(link).toEqual({ url: "https://jobs.lever.co/initech/abc-123", confidence: "direct-ats" });
  });

  it("falls back to the board link plus a careers page guess", async () => {
    const link = await resolveCareerLink(byId("board"), { follow: true, fetchFinalUrl: async () => null });
    expect(link.confidence).toBe("board-only");
    expect(link.url).toBe("https://www.indeed.com/viewjob?jk=abc");
    expect(link.careersPageGuess).toBe("https://initech.com/careers");
  });
});
