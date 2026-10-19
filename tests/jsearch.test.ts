import { afterEach, describe, expect, it, vi } from "vitest";
import { searchJSearch } from "@/lib/sources/jsearch";
import type { SearchQuery } from "@/lib/sources/types";
import fixture from "./fixtures/jsearch.json";

const q: SearchQuery = { keywords: "data analyst", location: "Chicago", radiusMiles: 25, remote: false, datePosted: "week", country: "us", pages: 3 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("searchJSearch", () => {
  it("calls /search-v2, follows the cursor and stops when it runs out", async () => {
    vi.stubEnv("RAPIDAPI_KEY", "test");
    const pages = [
      { data: { jobs: fixture.data.slice(0, 2), cursor: "next1" } },
      { data: { jobs: fixture.data.slice(2), cursor: null } },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(pages.shift()), { headers: { "x-ratelimit-requests-remaining": "150" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { jobs, note } = await searchJSearch(q);

    expect(jobs).toHaveLength(3);
    expect(note).toBe("150 requests left this month");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((c) => new URL(String((c as unknown[])[0])));
    expect(urls[0].pathname).toBe("/search-v2");
    expect(urls[0].searchParams.get("query")).toBe("data analyst in Chicago");
    expect(urls[0].searchParams.get("radius")).toBe("40");
    expect(urls[0].searchParams.has("cursor")).toBe(false);
    expect(urls[1].searchParams.get("cursor")).toBe("next1");
  });

  it("explains a used-up monthly quota", async () => {
    vi.stubEnv("RAPIDAPI_KEY", "test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    await expect(searchJSearch(q)).rejects.toThrow(/monthly request limit/);
  });
});
