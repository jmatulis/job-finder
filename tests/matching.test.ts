import { describe, expect, it } from "vitest";
import { containsTerm, requiredYears, scoreJob } from "@/lib/matching";

const profile = {
  keywords: ["SQL", "Tableau", "Python", "A/B testing"],
  skills: ["SQL", "Excel", "C++"],
  targetTitles: ["Data Analyst"],
  locations: ["Chicago, IL"],
  yearsExperience: 4,
  remotePref: "any" as const,
};
const NOW = Date.parse("2026-10-19T00:00:00Z");

describe("containsTerm", () => {
  it("matches whole terms, including ones with symbols", () => {
    expect(containsTerm("experience with c++ and sql", "C++")).toBe(true);
    expect(containsTerm("postgresql", "SQL")).toBe(false);
    expect(containsTerm("run a/b testing", "A/B testing")).toBe(true);
  });
});

describe("requiredYears", () => {
  it("finds the smallest requirement", () => {
    expect(requiredYears("3+ years of SQL, 5 years preferred")).toBe(3);
    expect(requiredYears("2-4 years experience")).toBe(2);
    expect(requiredYears("no requirement")).toBeNull();
  });
});

describe("scoreJob", () => {
  const strong = {
    title: "Data Analyst",
    description: "3+ years with SQL, Tableau and Python. Run A/B testing.",
    location: "Chicago, IL",
    remote: false,
    postedAt: "2026-10-17T00:00:00Z",
  };

  it("scores a strong match highly and lists matched terms", () => {
    const r = scoreJob(strong, profile, NOW);
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.matched).toEqual(expect.arrayContaining(["SQL", "Tableau", "Python", "A/B testing"]));
  });

  it("scores an unrelated, over-senior, far-away role low", () => {
    const r = scoreJob(
      { title: "Staff Mechanical Engineer", description: "10+ years designing turbines.", location: "Houston, TX", remote: false, postedAt: "2026-06-01T00:00:00Z" },
      profile,
      NOW,
    );
    expect(r.score).toBeLessThan(20);
  });

  it("penalizes on-site roles when the profile wants remote", () => {
    const remoteOnly = { ...profile, remotePref: "remote" as const };
    expect(scoreJob({ ...strong, remote: true }, remoteOnly, NOW).score).toBeGreaterThan(scoreJob(strong, remoteOnly, NOW).score);
  });
});
