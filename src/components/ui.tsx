import type { CareerConfidence } from "@/lib/types";

const CONFIDENCE: Record<CareerConfidence, { label: string; title: string; cls: string }> = {
  "direct-ats": {
    label: "Company ATS",
    title: "Goes straight to the employer's applicant tracking system (Greenhouse, Workday, Lever…)",
    cls: "bg-accent-soft text-accent",
  },
  "employer-domain": {
    label: "Company site",
    title: "Hosted on the employer's own website",
    cls: "bg-accent-soft text-accent",
  },
  "board-only": {
    label: "Job board",
    title: "No direct company link found; this goes to a job board",
    cls: "bg-warn-soft text-warn",
  },
};

export function ConfidenceBadge({ value }: { value: CareerConfidence }) {
  const c = CONFIDENCE[value];
  return (
    <span title={c.title} className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-accent text-accent-fg" : score >= 45 ? "bg-accent-soft text-accent" : "bg-line text-muted";
  return <span className={`inline-block min-w-9 rounded px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${tone}`}>{score}</span>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">{message}</div>;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}
