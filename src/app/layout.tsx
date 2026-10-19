import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { AUTH_REQUIRED } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Find matching jobs, collect direct career-site application links, and tailor your resume for each one.",
};

const NAV = [
  ["/", "Dashboard"],
  ["/search", "Search"],
  ["/jobs", "My jobs"],
  ["/profile", "Profile"],
  ["/watchlist", "Watchlist"],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Job Finder
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-muted">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="hover:text-fg">
                  {label}
                </Link>
              ))}
            </nav>
            {AUTH_REQUIRED && <SignOutButton />}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
