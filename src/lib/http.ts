import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiError } from "./ai/client";
import { UnauthorizedError } from "./auth";
import type { JobFilter } from "./repo";

export function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
  }
  if (err instanceof AiError) return NextResponse.json({ error: err.message }, { status: 502 });
  console.error(err);
  return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
}

export const notFound = (what = "Not found") => NextResponse.json({ error: what }, { status: 404 });

export function parseJobFilter(params: URLSearchParams): JobFilter {
  const status = params.get("status");
  return {
    status: status && ["new", "saved", "applied", "dismissed", "active"].includes(status) ? (status as JobFilter["status"]) : undefined,
    searchId: params.get("searchId") || undefined,
    directOnly: params.get("direct") === "1",
  };
}

/** Route ids are short hex/base36 strings. */
export function idParam(raw: string) {
  return /^[a-z0-9]{1,40}$/i.test(raw) ? raw : null;
}
