import { describe, expect, it } from "vitest";
import { ResumeSchema, withResumeDefaults } from "@/lib/resume";

describe("withResumeDefaults", () => {
  it("upgrades a resume saved before projects existed so it validates", () => {
    const old = {
      contact: { name: "Jane", email: "", phone: "", location: "", links: [] },
      summary: "",
      experience: [],
      education: [],
      skills: ["SQL"],
      certifications: [],
    };
    const upgraded = withResumeDefaults(old);
    expect(upgraded.projects).toEqual([]);
    expect(upgraded.otherSections).toEqual([]);
    expect(upgraded.skills).toEqual(["SQL"]);
    expect(ResumeSchema.safeParse(upgraded).success).toBe(true);
  });
});
