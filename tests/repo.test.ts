import { beforeAll, describe, expect, it } from "vitest";
import type { MergedJob } from "@/lib/sources";
import type { DocStore } from "@/lib/store";

let s: DocStore;
let repo: typeof import("@/lib/repo");

beforeAll(async () => {
  process.env.JOBFINDER_DB = ":memory:";
  repo = await import("@/lib/repo");
  s = await (await import("@/lib/store")).storeFor("test-user");
});

const job: MergedJob = {
  source: "greenhouse",
  sourceId: "acme:1",
  title: "Data Analyst",
  company: "Acme",
  location: "Chicago, IL",
  city: "Chicago",
  remote: false,
  description: "SQL and Tableau",
  applyOptions: [],
  publishers: ["Acme"],
  dedupeKey: "acme|data analyst|chicago",
  sources: ["greenhouse"],
  career: { url: "https://boards.greenhouse.io/acme/jobs/1", confidence: "direct-ats" },
};

describe("job status persistence", () => {
  it("keeps applied status and date when the job shows up in a later search", async () => {
    await repo.upsertJobs(s, [job], "search1");
    const [stored] = await repo.listJobs(s, { searchId: "search1" });
    const applied = await repo.setJobStatus(s, stored.id, "applied");
    expect(applied?.appliedAt).toBeTruthy();

    await repo.upsertJobs(s, [{ ...job, career: { url: "https://indeed.com/x", confidence: "board-only" } }], "search2");
    const again = (await repo.getJob(s, stored.id))!;
    expect(again.status).toBe("applied");
    expect(again.appliedAt).toBe(applied!.appliedAt);
    expect(again.careerUrl).toBe("https://boards.greenhouse.io/acme/jobs/1"); // not downgraded
    expect(await repo.listJobs(s, { status: "applied" })).toHaveLength(1);
  });

  it("clears the applied date when un-marked", async () => {
    const [j] = await repo.listJobs(s);
    expect((await repo.setJobStatus(s, j.id, "saved"))?.appliedAt).toBeNull();
  });

  it("keeps users' data separate", async () => {
    const other = await (await import("@/lib/store")).storeFor("someone-else");
    expect(await repo.listJobs(other)).toHaveLength(0);
  });
});
