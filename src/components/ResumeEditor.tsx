"use client";

import type { Resume } from "@/lib/resume";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const commaList = (s: string) => s.split(",").map((l) => l.trim()).filter(Boolean);

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Edits every field of a resume. Lists are edited as one item per line or comma-separated. */
export function ResumeEditor({ value: r, onChange }: { value: Resume; onChange: (r: Resume) => void }) {
  const set = <K extends keyof Resume>(key: K, v: Resume[K]) => onChange({ ...r, [key]: v });
  const setContact = (key: keyof Resume["contact"], v: string | string[]) => set("contact", { ...r.contact, [key]: v });

  const setExp = (i: number, patch: Partial<Resume["experience"][number]>) =>
    set("experience", r.experience.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const moveExp = (i: number, d: -1 | 1) => {
    const next = [...r.experience];
    const k = i + d;
    if (k < 0 || k >= next.length) return;
    [next[i], next[k]] = [next[k], next[i]];
    set("experience", next);
  };
  const setProj = (i: number, patch: Partial<Resume["projects"][number]>) =>
    set("projects", r.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const moveProj = (i: number, d: -1 | 1) => {
    const next = [...r.projects];
    const k = i + d;
    if (k < 0 || k >= next.length) return;
    [next[i], next[k]] = [next[k], next[i]];
    set("projects", next);
  };
  const setOther = (i: number, patch: Partial<Resume["otherSections"][number]>) =>
    set("otherSections", r.otherSections.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setEdu = (i: number, patch: Partial<Resume["education"][number]>) =>
    set("education", r.education.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={r.contact.name} onChange={(v) => setContact("name", v)} />
        <Field label="Email" value={r.contact.email} onChange={(v) => setContact("email", v)} />
        <Field label="Phone" value={r.contact.phone} onChange={(v) => setContact("phone", v)} />
        <Field label="Location" value={r.contact.location} onChange={(v) => setContact("location", v)} />
        <label className="sm:col-span-2">
          <span className="label">Links (comma-separated)</span>
          <input className="input" defaultValue={r.contact.links.join(", ")} key={r.contact.links.join(",")} onBlur={(e) => setContact("links", commaList(e.target.value))} />
        </label>
      </section>

      <label className="block">
        <span className="label">Summary</span>
        <textarea className="input min-h-24" value={r.summary} onChange={(e) => set("summary", e.target.value)} />
      </label>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Experience</h3>
          <button
            type="button"
            className="btn"
            onClick={() => set("experience", [...r.experience, { company: "", title: "", location: "", start: "", end: "", bullets: [] }])}
          >
            + Add position
          </button>
        </div>
        <div className="space-y-4">
          {r.experience.map((e, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <Field className="sm:col-span-3" label="Title" value={e.title} onChange={(v) => setExp(i, { title: v })} />
                <Field className="sm:col-span-3" label="Company" value={e.company} onChange={(v) => setExp(i, { company: v })} />
                <Field className="sm:col-span-2" label="Location" value={e.location} onChange={(v) => setExp(i, { location: v })} />
                <Field className="sm:col-span-2" label="Start" value={e.start} onChange={(v) => setExp(i, { start: v })} />
                <Field className="sm:col-span-2" label="End" value={e.end} onChange={(v) => setExp(i, { end: v })} />
              </div>
              <label className="mt-3 block">
                <span className="label">Bullets (one per line)</span>
                <textarea
                  className="input min-h-28"
                  defaultValue={e.bullets.join("\n")}
                  key={e.bullets.join("\n")}
                  onBlur={(ev) => setExp(i, { bullets: lines(ev.target.value) })}
                />
              </label>
              <div className="mt-2 flex gap-2 text-xs">
                <button type="button" className="btn" onClick={() => moveExp(i, -1)} disabled={i === 0}>
                  ↑ Move up
                </button>
                <button type="button" className="btn" onClick={() => moveExp(i, 1)} disabled={i === r.experience.length - 1}>
                  ↓ Move down
                </button>
                <button type="button" className="btn text-danger" onClick={() => set("experience", r.experience.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Projects</h3>
          <button type="button" className="btn" onClick={() => set("projects", [...r.projects, { name: "", role: "", date: "", link: "", bullets: [] }])}>
            + Add project
          </button>
        </div>
        <div className="space-y-4">
          {r.projects.map((p, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <Field className="sm:col-span-3" label="Project name" value={p.name} onChange={(v) => setProj(i, { name: v })} />
                <Field className="sm:col-span-3" label="Your role (optional)" value={p.role} onChange={(v) => setProj(i, { role: v })} />
                <Field className="sm:col-span-2" label="Date" value={p.date} onChange={(v) => setProj(i, { date: v })} />
                <Field className="sm:col-span-4" label="Link (optional)" value={p.link} onChange={(v) => setProj(i, { link: v })} />
              </div>
              <label className="mt-3 block">
                <span className="label">Bullets (one per line)</span>
                <textarea
                  className="input min-h-24"
                  defaultValue={p.bullets.join("\n")}
                  key={p.bullets.join("\n")}
                  onBlur={(ev) => setProj(i, { bullets: lines(ev.target.value) })}
                />
              </label>
              <div className="mt-2 flex gap-2 text-xs">
                <button type="button" className="btn" onClick={() => moveProj(i, -1)} disabled={i === 0}>
                  ↑ Move up
                </button>
                <button type="button" className="btn" onClick={() => moveProj(i, 1)} disabled={i === r.projects.length - 1}>
                  ↓ Move down
                </button>
                <button type="button" className="btn text-danger" onClick={() => set("projects", r.projects.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <label className="block">
        <span className="label">Skills (comma-separated, most relevant first)</span>
        <textarea
          className="input min-h-20"
          defaultValue={r.skills.join(", ")}
          key={r.skills.join(",")}
          onBlur={(e) => set("skills", commaList(e.target.value))}
        />
      </label>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Education</h3>
          <button type="button" className="btn" onClick={() => set("education", [...r.education, { school: "", degree: "", field: "", end: "" }])}>
            + Add education
          </button>
        </div>
        <div className="space-y-3">
          {r.education.map((e, i) => (
            <div key={i} className="grid items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-9">
              <Field className="sm:col-span-2" label="Degree" value={e.degree} onChange={(v) => setEdu(i, { degree: v })} />
              <Field className="sm:col-span-2" label="Field" value={e.field} onChange={(v) => setEdu(i, { field: v })} />
              <Field className="sm:col-span-3" label="School" value={e.school} onChange={(v) => setEdu(i, { school: v })} />
              <Field className="sm:col-span-1" label="Year" value={e.end} onChange={(v) => setEdu(i, { end: v })} />
              <button type="button" className="btn text-danger" onClick={() => set("education", r.education.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      <label className="block">
        <span className="label">Certifications (one per line)</span>
        <textarea
          className="input min-h-16"
          defaultValue={r.certifications.join("\n")}
          key={r.certifications.join("\n")}
          onBlur={(e) => set("certifications", lines(e.target.value))}
        />
      </label>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Other sections</h3>
          <button type="button" className="btn" onClick={() => set("otherSections", [...r.otherSections, { title: "", items: [] }])}>
            + Add section
          </button>
        </div>
        <div className="space-y-3">
          {r.otherSections.map((o, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="flex items-end gap-3">
                <Field className="flex-1" label="Section title (e.g. Volunteering, Awards)" value={o.title} onChange={(v) => setOther(i, { title: v })} />
                <button type="button" className="btn text-danger" onClick={() => set("otherSections", r.otherSections.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <label className="mt-3 block">
                <span className="label">Items (one per line)</span>
                <textarea
                  className="input min-h-16"
                  defaultValue={o.items.join("\n")}
                  key={o.items.join("\n")}
                  onBlur={(ev) => setOther(i, { items: lines(ev.target.value) })}
                />
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
