"use client";

export function SignOutButton() {
  return (
    <button
      className="ml-auto text-sm text-muted hover:text-fg"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
