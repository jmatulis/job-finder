import type { Resume } from "@/lib/resume";

/** On-screen version of the exported resume (same single-column layout as the PDF). */
export function ResumePreview({ resume: r }: { resume: Resume }) {
  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...r.contact.links].filter(Boolean).join("  |  ");
  const Heading = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mt-5 mb-2 border-b border-neutral-400 pb-0.5 text-[11px] font-bold tracking-[0.08em] uppercase">{children}</h3>
  );

  return (
    <article className="mx-auto max-w-[8.5in] rounded-md border border-line bg-white px-6 py-7 text-[13px] leading-snug text-neutral-900 shadow-sm sm:px-10">
      <h2 className="text-2xl font-bold">{r.contact.name}</h2>
      {contact && <p className="mt-1 text-xs text-neutral-600">{contact}</p>}

      {r.summary && (
        <>
          <Heading>Summary</Heading>
          <p>{r.summary}</p>
        </>
      )}

      {r.experience.length > 0 && <Heading>Experience</Heading>}
      {r.experience.map((e, i) => (
        <div key={i} className="mb-3">
          <div className="flex flex-wrap justify-between gap-x-4">
            <span className="font-bold">
              {e.title}
              {e.company ? `, ${e.company}` : ""}
            </span>
            <span className="text-neutral-600">{[e.start, e.end].filter(Boolean).join(" – ")}</span>
          </div>
          {e.location && <div className="text-neutral-600">{e.location}</div>}
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {e.bullets.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {r.skills.length > 0 && (
        <>
          <Heading>Skills</Heading>
          <p>{r.skills.join(", ")}</p>
        </>
      )}

      {r.education.length > 0 && <Heading>Education</Heading>}
      {r.education.map((e, i) => (
        <div key={i} className="flex flex-wrap justify-between gap-x-4">
          <span>
            <span className="font-bold">{[e.degree, e.field].filter(Boolean).join(", ")}</span>
            {e.school ? `  ${e.school}` : ""}
          </span>
          <span className="text-neutral-600">{e.end}</span>
        </div>
      ))}

      {r.certifications.length > 0 && (
        <>
          <Heading>Certifications</Heading>
          {r.certifications.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </>
      )}
    </article>
  );
}
